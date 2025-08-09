import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getCachedData, 
  getChatTemplateFromCache,
  getDatabaseTemplate 
} from '../_shared/cache-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for processed character roleplay prompts (per warm instance)
const roleplayPromptCache = new Map<string, string>();

// Module-level cache for system config to avoid frequent reads
let cachedChatWorkerUrl: string | null = null;
let cachedConfigFetchedAt = 0;
const CONFIG_TTL_MS = 60_000;

// Module-level cache for admin role checks (TTL 60s)
const adminRoleCache = new Map<string, { isAdmin: boolean; ts: number }>();
const ADMIN_ROLE_TTL_MS = 60_000;

type PromptMeta = {
  origin: 'inline.strict_nsfw' | 'cache' | 'database' | 'none';
  context_type: string;
  content_tier: 'sfw' | 'nsfw';
  nsfw_strict: boolean;
  template_key?: string;
  cache_refreshed_at?: string;
  character_id?: string | null;
  character_name?: string | null;
};
let lastPromptMeta: PromptMeta | null = null;

interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          character_id: string | null;
          title: string;
          conversation_type: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          project_id?: string | null;
          character_id?: string | null;
          title?: string;
          conversation_type?: string;
          status?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: 'user' | 'assistant';
          content: string;
          message_type: string;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender: 'user' | 'assistant';
          content: string;
          message_type?: string;
        };
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let dbReadTime = 0;
  let promptTime = 0;
  let workerTime = 0;
  let dbWriteTime = 0;

  // Helper to schedule background tasks without blocking
  const waitUntil = (p: Promise<any>) => {
    try {
      // @ts-ignore - EdgeRuntime may not exist in types
      if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) {
        // @ts-ignore
        (EdgeRuntime as any).waitUntil(p);
      } else {
        p.catch((e) => console.error('Background task error:', e));
      }
    } catch {
      p.catch((e) => console.error('Background task error:', e));
    }
  };

  // Dynamic system prompt helper using cached templates
  async function getSystemPromptForChat(
    message: string,
    conversationHistory: any[],
    contextType: string,
    cache: any,
    characterData?: any,
    ageVerified?: boolean,
    requestedTier?: 'sfw' | 'nsfw'
  ): Promise<string | null> {
    // Tier is explicitly determined by caller (NSFW-first model)
    let contentTier: 'sfw' | 'nsfw' = requestedTier || 'nsfw';

    // Force tier by explicit character rating when available
    // NSFW roleplay guidance constants
    const NSFW_GUIDANCE_MARK = '[[NSFW_ROLEPLAY_GUIDANCE_V1]]';
    const NSFW_ROLEPLAY_GUIDANCE = `${NSFW_GUIDANCE_MARK}
- Operate in NSFW roleplay mode with consenting adults (18+).
- Explicit sexual content and direct language are permitted when appropriate.
- Never include minors, incest, bestiality, or non-consensual acts.
- Maintain character voice, personality, and mood; stay immersive and descriptive.
- Avoid meta commentary; keep responses focused on the scene.
- Follow platform policies and applicable laws.`;
    const NSFW_STRICT_MARK = '[[NSFW_ENFORCE_V2]]';

    // Roleplay formatting rules to enforce consistent output structure
    const ROLEPLAY_FORMAT_MARK = '[[ROLEPLAY_FORMAT_RULES_V1]]';
    const ROLEPLAY_FORMAT_RULES = `${ROLEPLAY_FORMAT_MARK}
- Use Markdown formatting:
  - **CharacterName:** for character dialogue
  - *italics* for internal thoughts
  - Use **Narrator:** for scene description and transitions
- Do not speak for the user's character unless they provide a line.`;

    // Age-gating override (non-verified users)
    if (ageVerified === false && contentTier === 'nsfw') {
      contentTier = 'sfw';
      console.log('🔒 Age gating enforced: downgrading to SFW');
    }
    // For character roleplay, NSFW strict mode: bypass templates with inline directive
    if (contextType === 'character_roleplay' && characterData) {
      // Lightweight scene memory from recent turns (ephemeral)
      const buildSceneMemory = (history: Array<{ sender: string; content: string }>): string => {
        if (!history || history.length === 0) return '';
        const recent = history.slice(-6);
        const lines = recent.map((m) => `${m.sender === 'user' ? 'U' : 'A'}: ${m.content}`);
        const joined = lines.join(' \n ').replace(/\s+/g, ' ').slice(0, 500);
        return joined;
      };
      const sceneMemory = buildSceneMemory(conversationHistory);

      if (contentTier === 'nsfw') {
        console.log('🔥 NSFW strict preference detected; using template-based roleplay prompt');
        // Fall through to template-based character_roleplay prompt; strict formatting
        // and NSFW guidance will be appended to the selected template below.
      }
      let template = getChatTemplateFromCache(cache, contextType, contentTier);
      let templateKey = '';

      if (template) {
        templateKey = `cache:${cache?.metadata?.refreshed_at || 'na'}:${contentTier}:character_roleplay`;
      } else {
        console.log('🔄 Cache miss, fetching roleplay template from database...');
        try {
          const dbTemplate = await getDatabaseTemplate(
            null,                    // target_model
            'qwen_instruct',         // enhancer_model  
            'chat',                  // job_type
            'character_roleplay',    // use_case
            contentTier              // content_mode
          );
          template = dbTemplate?.system_prompt;
          templateKey = `db:${dbTemplate?.id || 'unknown'}:${dbTemplate?.updated_at || ''}`;
        } catch (error) {
          console.error('❌ Failed to fetch roleplay template:', error);
          return 'You are a helpful AI assistant. Please provide thoughtful and engaging responses.';
        }
      }

      if (template) {
        lastPromptMeta = {
          origin: templateKey.startsWith('cache:') ? 'cache' : 'database',
          context_type: contextType,
          content_tier: contentTier,
          nsfw_strict: false,
          template_key: templateKey,
          cache_refreshed_at: cache?.metadata?.refreshed_at || undefined,
          character_id: characterData.id || null,
          character_name: characterData.name || null,
        };
        // Build cache key using template origin, character id, updated_at and tier
        const cacheKey = `${templateKey}:char:${characterData.id}:${characterData.updated_at || ''}:tier:${contentTier}`;
        const legacyKey = `${templateKey}:char:${characterData.id}:${characterData.updated_at || ''}`;
        let cached = roleplayPromptCache.get(cacheKey) || roleplayPromptCache.get(legacyKey);
        if (cached) {
          if (contentTier === 'nsfw' && !cached.includes(NSFW_GUIDANCE_MARK)) {
            const upgraded = `${cached}\n\n${NSFW_ROLEPLAY_GUIDANCE}`;
            roleplayPromptCache.set(cacheKey, upgraded);
            console.log('🔧 Upgraded cached prompt with NSFW guidance');
            return upgraded;
          }
          return cached;
        }

        // Parse traits once to avoid repeated string operations
        const parseTraits = (traits?: string): Record<string, string> => {
          const map: Record<string, string> = {};
          if (!traits) return map;
          const lines = traits.split('\n');
          for (const line of lines) {
            const idx = line.indexOf(':');
            if (idx !== -1) {
              const key = line.slice(0, idx).trim();
              const value = line.slice(idx + 1).trim();
              map[key] = value;
            }
          }
          return map;
        };

        const traitsMap = parseTraits(characterData.traits);
        const extractTraitValue = (traitName: string): string => traitsMap[traitName] || '';

        // Replace character variables in the template (single processing, then cache)
        const processed = template
          .replace(/\{\{character_name\}\}/g, characterData.name || 'Character')
          .replace(/\{\{character_description\}\}/g, characterData.description || '')
          .replace(/\{\{character_personality\}\}/g, characterData.persona || '')
          .replace(/\{\{character_background\}\}/g, characterData.description?.includes('Background:') ? 
            (characterData.description.split('Background:')[1] || '') : '')
          .replace(/\{\{character_speaking_style\}\}/g, extractTraitValue('Speaking Style') || '')
          .replace(/\{\{character_goals\}\}/g, extractTraitValue('Goals') || '')
          .replace(/\{\{character_quirks\}\}/g, extractTraitValue('Quirks') || '')
          .replace(/\{\{character_relationships\}\}/g, extractTraitValue('Relationships') || '')
          .replace(/\{\{character_persona\}\}/g, characterData.persona || '')
          .replace(/\{\{voice_tone\}\}/g, characterData.voice_tone || 'neutral')
          .replace(/\{\{mood\}\}/g, characterData.mood || 'neutral')
          .replace(/\{\{character_visual_description\}\}/g, characterData.appearance_tags?.join(', ') || '');

        let processedFinal = processed;
        if (contentTier === 'nsfw' && !processedFinal.includes(NSFW_GUIDANCE_MARK)) {
          processedFinal = `${processedFinal}\n\n${NSFW_ROLEPLAY_GUIDANCE}`;
          console.log('🔧 Appended NSFW roleplay guidance to system prompt (character_roleplay)');
        }
        if (!processedFinal.includes(ROLEPLAY_FORMAT_MARK)) {
          processedFinal = `${processedFinal}\n\n${ROLEPLAY_FORMAT_RULES}`;
        }
        const STRICT_FORMAT_MARK = '[[ROLEPLAY_FORMAT_RULES_V2]]';
        if (!processedFinal.includes(STRICT_FORMAT_MARK)) {
          const STRICT_FORMAT_RULES = `${STRICT_FORMAT_MARK}
Strict roleplay output format (no exceptions):
- Speakers:
  - **${characterData.name || 'Character'}:** for the character you play
  - **Narrator:** for scene descriptions, actions, and transitions
- Internal thoughts must be italicized inside the speaker line, e.g., *I shouldn't say that out loud.*
- Do NOT write lines for the user's character unless the user provides them.
- No emojis, no safety disclaimers, no meta commentary.

Examples:
Correct:
**${characterData.name || 'Character'}:** I lean closer, letting my fingers trace the cool tile. *This feels daring.*
**Narrator:** The water ripples as a soft breeze brushes the surface.

Incorrect (do not do):
AI: Sure, here's what we could do...
(Me) walks over to you
You say: ...`;
          processedFinal = `${processedFinal}\n\n${STRICT_FORMAT_RULES}`;
          console.log('🔧 Appended STRICT roleplay format rules to system prompt');
        }
        roleplayPromptCache.set(cacheKey, processedFinal);
        return processedFinal;
      }
    }
    
    // For general chat, use existing logic
    const isSDXLLustifyRequest = message.toLowerCase().includes('sdxl') || 
                                message.toLowerCase().includes('lustify') || 
                                message.toLowerCase().includes('convert') ||
                                message.toLowerCase().includes('prompt') ||
                                message.toLowerCase().includes('optimize');
    
    let templateContext = contextType;
    if (isSDXLLustifyRequest) {
      templateContext = 'sdxl_conversion';
    }

    // Get system prompt from cache and track origin
    let systemPrompt = getChatTemplateFromCache(cache, templateContext, contentTier);
    let origin: 'cache' | 'database' | 'none' = systemPrompt ? 'cache' : 'none';
    
    // Fallback to database if cache fails for both tiers
    if (!systemPrompt) {
      try {
        console.log('🔄 Falling back to database for chat template');
        let useCase = 'chat_general';
        if (isSDXLLustifyRequest) {
          useCase = 'chat_sdxl_conversion';
        } else if (templateContext === 'story_development') {
          useCase = 'chat_creative';
        } else if (templateContext === 'roleplay') {
          useCase = 'roleplay';
        } else if (templateContext === 'admin') {
          useCase = 'chat_admin';
        } else if (templateContext === 'character_roleplay') {
          useCase = 'character_roleplay';
        }
        
        const dbTemplate = await getDatabaseTemplate(
          null,                    // target_model (null in template)
          'qwen_instruct',         // enhancer_model  
          'chat',                  // job_type
          useCase,                 // use_case
          contentTier              // content_mode ('nsfw'/'sfw')
        );
        systemPrompt = dbTemplate?.system_prompt || null;
        if (systemPrompt) origin = 'database';
      } catch (error) {
        console.warn('⚠️ Database fallback failed:', error);
      }
    }

    console.log('Dynamic System Prompt Selection:', {
      contentTier,
      templateContext,
      isSDXLLustifyRequest,
      hasSystemPrompt: !!systemPrompt,
      messageLength: message.length,
      conversationLength: conversationHistory.length,
      characterLoaded: !!characterData
    });

    // Append NSFW roleplay guidance if applicable
    if (contentTier === 'nsfw' && systemPrompt && !systemPrompt.includes(NSFW_GUIDANCE_MARK)) {
      systemPrompt = `${systemPrompt}\n\n${NSFW_ROLEPLAY_GUIDANCE}`;
      console.log('🔧 Appended NSFW roleplay guidance to system prompt (general)');
    }

    return systemPrompt;
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Cached admin role lookup
    const getIsAdmin = async (userId: string): Promise<boolean> => {
      try {
        const cached = adminRoleCache.get(userId);
        const now = Date.now();
        if (cached && (now - cached.ts) < ADMIN_ROLE_TTL_MS) {
          return cached.isAdmin;
        }
        const { data } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        const isAdmin = !!data;
        adminRoleCache.set(userId, { isAdmin, ts: now });
        return isAdmin;
      } catch (e) {
        console.error('Admin role check failed:', e);
        return false;
      }
    };
    // Get the current user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const isAdminPromise = getIsAdmin(user.id);

    const body = await req.json();

    const { conversation_id, message, project_id, character_id, content_tier } = body;

    if (!conversation_id || !message) {
      throw new Error('Missing required fields: conversation_id and message');
    }

    // Verify user owns the conversation and get character info if provided
    const { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (conversationError || !conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // If character_id is provided in request, update conversation
    if (character_id && character_id !== conversation.character_id) {
      await supabaseClient
        .from('conversations')
        .update({ character_id })
        .eq('id', conversation_id);
    }

    // Use character_id from request or conversation
    const activeCharacterId = character_id || conversation.character_id;

    // Fetch user's age verification (for content gating)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('age_verified')
      .eq('id', user.id)
      .maybeSingle();
    const ageVerified = profile?.age_verified === true;

    // Save user message in background (non-blocking)
    waitUntil(
      supabaseClient
        .from('messages')
        .insert({
          conversation_id,
          sender: 'user',
          content: message,
        })
        .then(({ error }) => {
          if (error) console.error('Failed to save user message:', error);
        })
    );

    // Parallel DB reads for history, project, character
    const dbStart = Date.now();
    const historyPromise = supabaseClient
      .from('messages')
      .select('sender, content, created_at')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(12);

    const projectPromise = conversation.project_id
      ? supabaseClient
          .from('projects')
          .select('title, original_prompt, enhanced_prompt, media_type, duration, scene_count')
          .eq('id', conversation.project_id)
          .single()
      : Promise.resolve({ data: null } as any);

    const characterPromise = activeCharacterId
      ? supabaseClient
          .from('characters')
          .select('*')
          .eq('id', activeCharacterId)
          .single()
      : Promise.resolve({ data: null } as any);

    const [{ data: messageHistory, error: historyError }, { data: project }, { data: character }] = await Promise.all([
      historyPromise,
      projectPromise,
      characterPromise,
    ]);

    if (historyError) {
      console.error('Error fetching message history:', historyError);
    }

    // Handle character and context
    let characterData = null;
    let contextType = conversation.conversation_type || 'general';
    if (character) {
      characterData = character;
      contextType = 'character_roleplay';
      // Increment interaction count (background)
      waitUntil(
        supabaseClient
          .from('characters')
          .update({ interaction_count: (character.interaction_count || 0) + 1 })
          .eq('id', activeCharacterId as string)
          .then(({ error }) => {
            if (error) console.error('Failed to increment interaction_count:', error);
          })
      );
      console.log('🎭 Character loaded for roleplay:', character.name);
    }

    // Build project context if present
    let projectContext = null;
    if (project) {
      projectContext = {
        title: project.title || 'Untitled Project',
        media_type: project.media_type,
        original_prompt: project.original_prompt,
        enhanced_prompt: project.enhanced_prompt,
        duration: project.duration || 5,
        scene_count: project.scene_count || 1
      };
    }

    dbReadTime = Date.now() - dbStart;

    // Resolve chat worker URL with TTL cache to avoid frequent reads
    let chatWorkerUrl = cachedChatWorkerUrl;
    if (!chatWorkerUrl || (Date.now() - cachedConfigFetchedAt) > CONFIG_TTL_MS) {
      const { data: systemConfig, error: configError } = await supabaseClient
        .from('system_config')
        .select('config')
        .single();

      if (configError || !systemConfig?.config?.chatWorkerUrl) {
        console.error('Failed to get chat worker URL:', configError);
        throw new Error('Chat worker not configured');
      }

      chatWorkerUrl = systemConfig.config.chatWorkerUrl;
      cachedChatWorkerUrl = chatWorkerUrl;
      cachedConfigFetchedAt = Date.now();
    }

    console.log('Using chat worker URL:', chatWorkerUrl);

    // Get API key for chat worker
    const apiKey = Deno.env.get('WAN_WORKER_API_KEY');
    if (!apiKey) {
      throw new Error('WAN_WORKER_API_KEY not configured');
    }

    // Prepare conversation history for chat worker (chronological)
    const conversationHistory = messageHistory
      ? [...messageHistory].reverse().map((msg) => ({
          sender: msg.sender,
          content: msg.content,
          created_at: msg.created_at,
        }))
      : [];

    // Load cached data for template processing
    const cache = await getCachedData();
    
    // Determine admin/owner NSFW override
    const isAdmin = await isAdminPromise.catch(() => false);
    const isOwner = !!(characterData && characterData.user_id === user.id);
    const allowNSFWOverride = !!(characterData?.content_rating === 'nsfw' && (isAdmin || isOwner));
    if (allowNSFWOverride) {
      console.log(`🛡️ NSFW override active due to ${isAdmin ? 'admin' : 'owner'} privileges`);
    }

    // Resolve final content tier (NSFW-first)
    const explicitTier = (typeof content_tier === 'string' && (content_tier === 'sfw' || content_tier === 'nsfw')) ? content_tier as 'sfw' | 'nsfw' : null;
    let finalTier: 'sfw' | 'nsfw';
    if (!ageVerified && !isAdmin) {
      finalTier = 'sfw';
    } else if (explicitTier) {
      finalTier = explicitTier;
    } else {
      finalTier = 'nsfw';
    }
    
    // Get system prompt using cached templates (roleplay or general)
    dbReadTime = Date.now() - dbStart;
    const promptStart = Date.now();
    const systemPrompt = await getSystemPromptForChat(
      message,
      conversationHistory,
      contextType,
      cache,
      characterData,
      ageVerified || allowNSFWOverride,
      finalTier
    );
    promptTime = Date.now() - promptStart;

    // Log a small system prompt snippet and markers for diagnostics
    if (systemPrompt) {
      console.log('🧱 System prompt snippet:', {
        has_format_mark: /\[\[ROLEPLAY_FORMAT_RULES_/i.test(systemPrompt),
        has_nsfw_mark: /\[\[NSFW_ROLEPLAY_GUIDANCE_/i.test(systemPrompt),
        snippet: systemPrompt.slice(0, 220),
      });
    }

    // Convert conversation history and current message to messages array format
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    // Add system prompt as first message if available
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add conversation history in proper format
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        // Skip the current message if it's already in history (just saved)
        if (msg.content === message && msg.sender === 'user') continue;
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }
    
    // Add current user message
    messages.push({ role: 'user', content: message });

    // Derive content tier and NSFW enforcement for worker payload
    const chosenTier: 'sfw' | 'nsfw' = finalTier;
    const nsfwEnforce = contextType === 'character_roleplay' && chosenTier === 'nsfw';
    const nsfwReason = explicitTier ? 'explicit_request' : (isAdmin ? 'admin_default' : (ageVerified ? 'age_verified_default' : 'age_gate'));

    // Call the chat worker with messages array format
    const basePayload: any = {
      messages,
      conversation_id,
      project_id,
      context_type: contextType,
      project_context: projectContext,
      content_tier: chosenTier,
    };
    // Sampling parameters (worker may ignore unsupported keys)
    const temperature = nsfwEnforce ? 0.95 : 0.8;
    const top_p = 0.95;
    const presence_penalty = 0.6;
    const frequency_penalty = 0.25;
    Object.assign(basePayload, { temperature, top_p, presence_penalty, frequency_penalty });

    if (nsfwEnforce) {
      basePayload.nsfw_enforce = true;
      if (nsfwReason) basePayload.nsfw_reason = nsfwReason;
    }

    console.log('Calling chat worker with payload:', {
      messages: `${messages.length} messages`,
      conversation_id,
      context_type: contextType,
      project_context: projectContext ? 'included' : 'none',
      content_tier: chosenTier,
      nsfw_enforce: nsfwEnforce || false,
      nsfw_reason: nsfwReason || 'none'
    });

    const workerStart = Date.now();
    const chatResponse = await fetch(`${chatWorkerUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(basePayload),
      signal: AbortSignal.timeout(45000), // 45 second timeout
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Chat worker error:', errorText);
      throw new Error(`Chat worker error: ${chatResponse.status} - ${errorText}`);
    }

    const chatData = await chatResponse.json();
    workerTime = Date.now() - workerStart;
    
    if (!chatData.success) {
      throw new Error(chatData.error || 'Chat worker returned failure');
    }

    const rawResponse = chatData.response || 'Sorry, I could not generate a response.';

    // Sanitize persona/meta violations before strict formatting
    function sanitizeRoleplayPersonaViolations(text: string, characterName: string) {
      const original = text;
      let out = text;
      const issues: string[] = [];
      let removed_meta = 0;
      let user_lines_removed = 0;
      let stage_dir_converted = 0;
      let narrator_normalized = 0;
      let first_line_prefixed = false;
      let emojis_removed = 0;

      const lines = out.split('\n');
      const cleanedLines: string[] = [];
      for (let line of lines) {
        // Remove explicit AI/system prefixes
        if (/^\s*(AI|Assistant|System)\s*:/i.test(line)) {
          line = line.replace(/^\s*(AI|Assistant|System)\s*:/i, '').trim();
          removed_meta++;
          if (!line) continue;
        }
        // Remove lines that speak for the user
        if (/^\s*(You|User)\s*:/i.test(line)) {
          user_lines_removed++;
          continue;
        }
        // Convert parenthetical stage directions at start
        if (/^\s*\((?:me|i|user|you)[^)]*\)\s*/i.test(line)) {
          line = line.replace(/^\s*\((?:me|i|user|you)[^)]*\)\s*/i, '').trim();
          if (line) {
            line = `**Narrator:** ${line}`;
            stage_dir_converted++;
          } else {
            continue;
          }
        }
        cleanedLines.push(line);
      }
      out = cleanedLines.join('\n');

      // Normalize narrator label to bold form
      out = out.replace(/(^|\n)\s*\*\*?\s*Narrator\s*:?\s*\*\*?\s*/gi, (_m, p1) => {
        narrator_normalized++;
        return `${p1}**Narrator:** `;
      });
      out = out.replace(/(^|\n)\s*Narrator\s*:\s*/gi, (_m, p1) => {
        narrator_normalized++;
        return `${p1}**Narrator:** `;
      });

      // Ensure first block has a speaker prefix
      const trimmedOut = out.trim();
      if (trimmedOut) {
        const firstBlock = trimmedOut.split(/\n{2,}/)[0].trim();
        if (!/^(\*\*[^*]+:\*\*|\*\*Narrator:\*\*)/.test(firstBlock)) {
          out = `**${characterName}:** ${trimmedOut}`;
          first_line_prefixed = true;
        }
      }

      // Strip emojis
      const emojiRe = /\p{Extended_Pictographic}/gu;
      const emojiMatches = out.match(emojiRe);
      if (emojiMatches && emojiMatches.length) {
        out = out.replace(emojiRe, '');
        emojis_removed = emojiMatches.length;
        issues.push('emoji_removed');
      }

      const applied = out.trim() !== original.trim();
      return { text: out.trim(), applied, issues, stats: { removed_meta, user_lines_removed, stage_dir_converted, narrator_normalized, first_line_prefixed, emojis_removed } };
    }

    // Enforce roleplay output format (post-processing repair)
    function enforceRoleplayFormat(text: string, characterName: string) {
      const before = text;
      const issues: string[] = [];
      // Strip emojis
      const emojiRe = /\p{Extended_Pictographic}/gu;
      if (emojiRe.test(text)) {
        text = text.replace(emojiRe, '');
        issues.push('emoji_removed');
      }
      const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
      const fixed = blocks.map((b) => {
        if (/^(\*\*[^*]+:\*\*|Narrator:|\*\*Narrator:\*\*)/i.test(b)) {
          return b;
        }
        if (/^\*.*\*$/.test(b)) {
          const cleaned = b.replace(/^\*+|\*+$/g, '').trim();
          return `**Narrator:** *${cleaned}*`;
        }
        return `**${characterName}:** ${b}`;
      });
      const out = fixed.join('\n\n').replace(/\s{3,}/g, ' ').trim();
      const applied = out !== before;
      return { text: out, applied, issues };
    }

    // Post-process for quality in NSFW strict roleplay
    let aiResponse = rawResponse;
    let enforcementDiagnostics: any = { persona: null, nsfw_qa: null, format: null };

    // Persona/meta sanitization before QA and format enforcement
    if (contextType === 'character_roleplay') {
      const name = (characterData && characterData.name) || 'Character';
      const persona = sanitizeRoleplayPersonaViolations(aiResponse, name);
      if (persona.applied) {
        aiResponse = persona.text;
      }
      enforcementDiagnostics.persona = persona;
      console.log('🧽 Persona sanitization', {
        applied: persona.applied,
        stats: persona.stats,
        issues: persona.issues,
        preview: aiResponse.slice(0, 120),
      });
    }

    if (nsfwEnforce) {
      const qaStart = Date.now();
      const sanitizeStrictNSFWOutput = (text: string) => {
        let removed = 0;
        let emojis_removed = 0;
        let truncated_words = 0;
        // Remove common disclaimers / policy mentions
        const patterns = [
          /\b(as an ai|i (?:can(?:not|'t)|must|won't|will not|am unable)\b)[^.!?\n]*[.!?]?/gi,
          /\b(content policy|guidelines?|safety|cannot provide|not able to)\b[^.!?\n]*[.!?]?/gi,
          /\b(i'm just|i am just) an ai[^.!?\n]*[.!?]?/gi,
        ];
        let out = text;
        for (const re of patterns) {
          const before = out;
          out = out.replace(re, () => { removed++; return ''; });
          if (out !== before) { /* removed incremented */ }
        }
        // Strip emojis unless explicitly requested (simple unicode class)
        const emojiRe = /\p{Extended_Pictographic}/gu;
        const emojiMatches = out.match(emojiRe) || [];
        if (emojiMatches.length) {
          emojis_removed = emojiMatches.length;
          out = out.replace(emojiRe, '');
        }
        // Enforce soft length cap ~240 words
        const words = out.trim().split(/\s+/);
        if (words.length > 240) {
          out = words.slice(0, 240).join(' ');
          truncated_words = words.length - 240;
        }
        // Cleanup extra spaces
        out = out.replace(/\s{3,}/g, ' ').trim();
        return { text: out, removed, emojis_removed, truncated_words };
      };

      const beforeQA = aiResponse;
      const qa = sanitizeStrictNSFWOutput(aiResponse);
      aiResponse = qa.text;
      enforcementDiagnostics.nsfw_qa = qa;
      console.log('🧪 Output QA', {
        len_before: beforeQA.length,
        len_after: aiResponse.length,
        removed_phrases: qa.removed,
        emojis_removed: qa.emojis_removed,
        truncated_words: qa.truncated_words,
        qa_ms: Date.now() - qaStart,
      });
    }

    // Enforce roleplay formatting for character_roleplay
    if (contextType === 'character_roleplay') {
      const name = (characterData && characterData.name) || 'Character';
      const enforce = enforceRoleplayFormat(aiResponse, name);
      if (enforce.applied) {
        aiResponse = enforce.text;
      }
      const hasCharPrefix = new RegExp(`\\*\\*${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}:\\*\\*`).test(aiResponse);
      const hasNarrator = /\*\*?Narrator:?\*\*/i.test(aiResponse) || /Narrator:/.test(aiResponse);
      enforcementDiagnostics.format = {
        applied: enforce.applied,
        issues: enforce.issues,
        hasCharPrefix,
        hasNarrator,
      };
      console.log('🧩 Roleplay format enforcement', {
        applied: enforce.applied,
        issues: enforce.issues,
        hasCharPrefix,
        hasNarrator,
        preview: aiResponse.slice(0, 120),
      });
    }

    // Save AI response and update conversation in background
    const dbWriteStart = Date.now();
    waitUntil(
      Promise.all([
        supabaseClient
          .from('messages')
          .insert({
            conversation_id,
            sender: 'assistant',
            content: aiResponse,
          }),
        supabaseClient
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversation_id),
      ]).then(([aiInsert, convUpdate]) => {
        if ((aiInsert as any).error) console.error('Failed to save AI message:', (aiInsert as any).error);
        if ((convUpdate as any).error) console.error('Failed to update conversation timestamp:', (convUpdate as any).error);
        dbWriteTime = Date.now() - dbWriteStart;
      })
    );

    const totalTime = Date.now() - startTime;
    console.log('⏱️ Performance breakdown:', {
      conversation_id,
      db_read_ms: dbReadTime,
      prompt_ms: promptTime,
      worker_ms: workerTime,
      db_write_ms: dbWriteTime,
      total_ms: totalTime
    });

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        conversation_id,
        generation_time: chatData.generation_time || 0,
        context_type: contextType,
        content_tier: chosenTier,
        nsfw_enforce: nsfwEnforce || false,
        template_meta: lastPromptMeta,
        enforcement_diagnostics: enforcementDiagnostics,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Error in playground-chat function:', error);
    console.log('⏱️ Error timing:', { total_ms: totalTime, db_read_ms: dbReadTime, prompt_ms: promptTime, worker_ms: workerTime, db_write_ms: dbWriteTime });
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
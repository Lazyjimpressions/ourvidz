import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles,
  PanelRightOpen,
  PanelRightClose,
  Plus,
  Settings,
  Menu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlayground, PlaygroundProvider } from '@/contexts/PlaygroundContext';
import { useCharacterData } from '@/hooks/useCharacterData';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { useSceneNarration } from '@/hooks/useSceneNarration';
import { useSceneManagement } from '@/hooks/useSceneManagement';
import { GeneratedMediaProvider } from '@/contexts/GeneratedMediaContext';
import { SceneImageGenerator } from '@/components/playground/SceneImageGenerator';
import { SceneGenerationModal } from '@/components/roleplay/SceneGenerationModal';
import { useAuth } from '@/contexts/AuthContext';
import { RoleplayLeftSidebar } from '@/components/roleplay/RoleplayLeftSidebar';
import { CharacterDetailPane } from '@/components/roleplay/CharacterDetailPane';
import { MessageBubble } from '@/components/playground/MessageBubble';
import { RoleplayPromptInput } from '@/components/roleplay/RoleplayPromptInput';
import { RoleplaySettingsModal, RoleplaySettings } from '@/components/roleplay/RoleplaySettingsModal';
import { AddCharacterModal } from '@/components/roleplay/AddCharacterModal';
import { SceneContextHeader } from '@/components/roleplay/SceneContextHeader';
import { RoleplayHeader } from '@/components/roleplay/RoleplayHeader';
import { supabase } from '@/integrations/supabase/client';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';
import { InlineImageDisplay } from '@/components/playground/InlineImageDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/card';

const RoleplayChatInterface = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  
  // UI State
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightPane, setShowRightPane] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showSceneGenerator, setShowSceneGenerator] = useState(false);
  const [showSceneNarrativeModal, setShowSceneNarrativeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [inputMode, setInputMode] = useState<'chat' | 'scene'>('chat');
// Roleplay Settings
const [roleplaySettings, setRoleplaySettings] = useState<RoleplaySettings>({
  contentMode: 'sfw',
  responseStyle: 'detailed',
  responseLength: 'medium',
  autoSceneGeneration: false,
  voiceModel: 'none',
  enhancementModel: 'qwen_instruct',
  sceneQuality: 'fast',
  messageFrequency: 5
});

// Quick image local state
const [quickImagePending, setQuickImagePending] = useState(false);
const [quickImageAsset, setQuickImageAsset] = useState<{assetId: string; imageUrl: string | null; bucket: string | null} | null>(null);
  
  // Get character and scene data from URL
  const characterId = searchParams.get('character');
  const userCharacterId = searchParams.get('userCharacter');
  const sceneId = searchParams.get('scene');
  const participantsParam = searchParams.get('participants');
  const contentMode = searchParams.get('mode') as 'sfw' | 'nsfw' || 'sfw';
  const conversationIdParam = searchParams.get('conversation');
  
  // Parse participants from URL
  const participantIds = participantsParam ? participantsParam.split(',') : [];

  // If sceneId is present but characterId is missing, resolve character from scene
  useEffect(() => {
    if (sceneId && !characterId) {
      const resolveCharacter = async () => {
        const { data, error } = await supabase
          .from('character_scenes')
          .select('character_id')
          .eq('id', sceneId)
          .maybeSingle();
        if (!error && data?.character_id) {
          const params = new URLSearchParams(searchParams);
          params.set('character', data.character_id);
          setSearchParams(params);
        }
      };
      resolveCharacter();
    }
  }, [sceneId, characterId, searchParams, setSearchParams]);
  
  const { character, isLoading: characterLoading } = useCharacterData(characterId || undefined);
  const { scenes, isLoading: scenesLoading } = useCharacterScenes(characterId || undefined);
  const { startSceneWithNarration } = useSceneNarration();

  // Playground context for conversations and messages
  const {
    state,
    conversations,
    messages,
    isLoadingMessages,
    createConversation,
    setActiveConversation,
    sendMessage,
  } = usePlayground();

  // Adopt conversation from URL if present
  useEffect(() => {
    if (conversationIdParam) {
      setActiveConversation(conversationIdParam);
    }
  }, [conversationIdParam, setActiveConversation]);

  const [sceneInitialized, setSceneInitialized] = useState(false);

  // Scene Management
  const {
    sceneState,
    setCurrentScene,
    startScene,
    pauseScene,
    resetScene,
    toggleSceneVisibility,
    clearScene
  } = useSceneManagement({
    conversationId: state.activeConversationId,
    characterName: character?.name,
    userCharacterId: userCharacterId || undefined,
    contentMode: roleplaySettings.contentMode
  });

const messagesEndRef = useRef<HTMLDivElement>(null);
const inputRef = useRef<HTMLTextAreaElement>(null);

// SDXL scene generation for quick image
const { generateSceneImage, detectScene } = useSceneGeneration();

  // Auto-load character and initialize conversation when character is selected
  useEffect(() => {
    if (characterId && !character && !characterLoading) {
      // Character will be loaded by useCharacterData hook
    }
  }, [characterId, character, characterLoading]);

  // Initialize conversation when character is loaded (only once per character)
  useEffect(() => {
    if (character && !state.activeConversationId && !state.isLoadingMessage) {
      // Add a small delay to prevent immediate re-triggers
      const timer = setTimeout(() => {
        if (!state.activeConversationId) {
          handleNewConversation();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [character, state.activeConversationId, state.isLoadingMessage]);

  // If Narrator is selected but participants include real characters, switch to the first participant
  useEffect(() => {
    if (character?.name?.toLowerCase() === 'narrator' && participantIds.length > 0) {
      const params = new URLSearchParams(searchParams);
      params.set('character', participantIds[0]);
      setSearchParams(params);
    }
  }, [character?.name, participantIds, searchParams, setSearchParams]);

  // Handle scene initialization when conversation is created and scene is specified
  useEffect(() => {
    if (
      state.activeConversationId && 
      sceneId && 
      character && 
      !sceneInitialized && 
      messages.length === 0
    ) {
      // Add a small delay to ensure conversation is fully established
      const timer = setTimeout(() => {
        if (state.activeConversationId && sceneId && character && !sceneInitialized) {
          handleSceneInitialization();
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [state.activeConversationId, sceneId, character, sceneInitialized, messages.length]);

  // Update scene state when sceneId changes
  useEffect(() => {
    if (sceneId && scenes.length > 0) {
      const currentScene = scenes.find(scene => scene.id === sceneId);
      setCurrentScene(currentScene || null);
    } else {
      setCurrentScene(null);
    }
  }, [sceneId, scenes, setCurrentScene]);

  const handleSceneInitialization = useCallback(async () => {
    console.log('Handling scene initialization:', { 
      activeConversationId: state.activeConversationId, 
      sceneId, 
      character: character?.name,
      sceneInitialized 
    });
    
    if (!state.activeConversationId || !sceneId || !character) {
      console.log('Missing required data for scene initialization');
      return;
    }

    try {
      setSceneInitialized(true);
      
      const currentScene = scenes.find(scene => scene.id === sceneId);
      console.log('Found scene:', currentScene);
      
      if (currentScene) {
        await startScene(currentScene);
      } else {
        console.error('Scene not found:', sceneId);
        toast({
          title: "Error",
          description: "Scene not found",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Failed to initialize scene:', error);
      toast({
        title: "Error",
        description: "Failed to start scene narration",
        variant: "destructive",
      });
    }
  }, [state.activeConversationId, sceneId, character, scenes, startScene, toast]);

  const handleNewConversation = useCallback(async () => {
    console.log('Creating new conversation:', { character: character?.name, sceneId });
    
    if (!character) return;

    try {
      const conversationId = await createConversation(
        `Chat with ${character.name}`,
        undefined, // projectId
        'character_roleplay', // conversationType
        character.id // characterId
      );

      console.log('Conversation created:', conversationId);
      setActiveConversation(conversationId);
      
      // Update URL with conversation ID
      const newParams = new URLSearchParams(searchParams);
      newParams.set('conversation', conversationId);
      setSearchParams(newParams);

      // If there's a scene specified, trigger scene initialization after conversation is created
      if (sceneId) {
        console.log('Scene specified, will initialize after conversation is ready');
        // Small delay to ensure conversation is fully established
        setTimeout(() => {
          const currentScene = scenes.find(scene => scene.id === sceneId);
          console.log('Looking for scene:', { sceneId, currentScene, sceneInitialized });
          if (currentScene && !sceneInitialized) {
            console.log('Triggering scene initialization');
            handleSceneInitialization();
          }
        }, 300);
      }

    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  }, [character, sceneId, scenes, sceneInitialized, createConversation, setActiveConversation, searchParams, setSearchParams, handleSceneInitialization, toast]);



  // Auto-start conversation when no active conversation exists
  const handleStartConversation = useCallback(async () => {
    if (!state.activeConversationId) {
      await handleNewConversation();
    }
  }, [state.activeConversationId, handleNewConversation]);

  const handleCharacterChange = (newCharacterId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('character', newCharacterId);
    setSearchParams(params);
  };

  const handleUserCharacterChange = (newUserCharacterId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (newUserCharacterId) {
      params.set('userCharacter', newUserCharacterId);
    } else {
      params.delete('userCharacter');
    }
    setSearchParams(params);
  };

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    
    // Ensure there is an active conversation before sending
    if (!state.activeConversationId) {
      await handleNewConversation();
    }
    if (!state.activeConversationId) return; // Safety check
    
    setIsTyping(true);
    try {
      await sendMessage(inputMessage, { 
        characterId: characterId || undefined,
        conversationId: state.activeConversationId 
      });
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateScene = async () => {
    if (isTyping) return;
    // Open scene narrative modal for text-based scene generation
    setShowSceneNarrativeModal(true);
  };

  const handleQuickImage = async () => {
    if (isTyping) return;

    // Determine the best source text: input content or last assistant scene-like message
    const sourceText = inputMessage.trim() ||
      [...messages].reverse().find(m => m.sender === 'assistant' && detectScene(m.content))?.content || '';

    if (!sourceText) {
      toast({ title: 'No scene found', description: 'Type a description or let the AI reply first.' });
      return;
    }

    // Show inline pending card and attach one-time completion listener
    setQuickImagePending(true);
    setQuickImageAsset(null);

    const handleCompletion = (event: any) => {
      const detail = event.detail || {};
      if (detail?.assetId) {
        setQuickImageAsset({ assetId: detail.assetId, imageUrl: detail.imageUrl || null, bucket: detail.bucket || null });
        setQuickImagePending(false);
        window.removeEventListener('generation-completed', handleCompletion);
      }
    };

    window.addEventListener('generation-completed', handleCompletion);

    try {
      await generateSceneImage(sourceText, null, {
        quality: 'fast',
        style: 'lustify',
        useCharacterReference: !!character?.reference_image_url,
        characterId: character?.id,
        conversationId: state.activeConversationId || undefined,
      });
    } catch (error) {
      setQuickImagePending(false);
      window.removeEventListener('generation-completed', handleCompletion);
    }
  };
  const handleCharacterAdded = (newCharacter: any) => {
    // Navigate to the new character
    const params = new URLSearchParams(searchParams);
    params.set('character', newCharacter.id);
    setSearchParams(params);
    setShowAddCharacter(false);
    
    toast({
      title: "Character Added",
      description: `${newCharacter.name} has been added to your collection!`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Redirect to character selection if no character is selected
  if (!characterId && !characterLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">No Character Selected</h2>
          <p className="text-muted-foreground mb-6">Please select a character to start chatting.</p>
          <Button onClick={() => navigate('/roleplay')}>
            Select Character
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <RoleplayHeader 
        characterName={character?.name}
        characterImage={character?.reference_image_url || character?.image_url}
        title={sceneId ? "Scene Mode" : undefined}
        subtitle={sceneId ? `Scene with ${participantIds.length > 1 ? `${participantIds.length} participants` : 'character'}` : undefined}
        onSettingsClick={() => setShowSettingsModal(true)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {showLeftSidebar && <RoleplayLeftSidebar />}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Scene Context Header (if in scene mode) */}
        {sceneState.currentScene && sceneState.isVisible && (
          <SceneContextHeader
            scene={sceneState.currentScene}
            characterName={character?.name}
            isActive={sceneState.isActive}
            isGenerating={sceneState.isGenerating}
            onStartScene={() => sceneState.currentScene && startScene(sceneState.currentScene)}
            onPauseScene={pauseScene}
            onResetScene={resetScene}
            onToggleSceneVisibility={toggleSceneVisibility}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        )}

        {/* Action Bar */}
        <div className="border-b border-border flex items-center justify-between px-3 py-2 flex-shrink-0 bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="h-8 px-2 gap-1 text-xs"
              title="Toggle character list"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Characters</span>
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddCharacter(true)}
              className="h-8 px-3 gap-1 text-xs"
              title="Add character to conversation"
            >
              <Plus className="w-4 h-4" />
              <span>Add Character</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRightPane(!showRightPane)}
              className="h-8 px-2 gap-1 text-xs"
              title="Character details"
            >
              {showRightPane ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Details</span>
            </Button>
          </div>
        </div>

        {/* Chat Messages Area - Fixed height with padding for floating input */}
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea className="h-full">
          <div className="p-3 pb-20">
            <div className="max-w-2xl mx-auto space-y-2">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-auto">
                    <h3 className="text-base font-medium mb-2 text-card-foreground">
                      Start chatting with {character?.name || 'your character'}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      Share your thoughts, ask questions, or begin a roleplay scenario.
                    </p>
                  </div>
                </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        mode="roleplay"
                        roleplayTemplate={true}
                      />
                    ))}

                    {/* Quick image inline status */}
                    {quickImagePending && (
                      <Card className="mt-2 p-3 max-w-xs bg-muted/30">
                        <div className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          <span className="text-xs text-muted-foreground">Generating image...</span>
                        </div>
                      </Card>
                    )}
                    {quickImageAsset && !quickImagePending && (
                      <div className="mt-2">
                        <InlineImageDisplay
                          assetId={quickImageAsset.assetId}
                          imageUrl={quickImageAsset.imageUrl || undefined}
                          bucket={quickImageAsset.bucket || undefined}
                          onExpand={() => {}}
                        />
                      </div>
                    )}
                  </>
                )}
                
              {isTyping && (
                <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs">{character?.name} is typing...</span>
                </div>
              )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </ScrollArea>

          {/* Floating Input Footer */}
          <div className="absolute bottom-0 left-0 right-0">
            <RoleplayPromptInput
              value={inputMessage}
              onChange={setInputMessage}
              onSend={handleSendMessage}
              onGenerateScene={handleGenerateScene}
              onQuickImage={handleQuickImage}
              onOpenSettings={() => setShowSettingsModal(true)}
              isDisabled={isTyping || state.isLoadingMessage || !state.activeConversationId}
              characterName={character?.name}
              mode={inputMode}
              onModeChange={setInputMode}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Right Character Detail Pane */}
      {characterId && (
        <CharacterDetailPane
          characterId={characterId}
          isOpen={showRightPane}
          onClose={() => setShowRightPane(false)}
          onStartConversation={handleStartConversation}
        />
      )}

      {/* Modals */}
      {showSceneGenerator && (
        <SceneImageGenerator
          messageContent={inputMessage || `Generate a scene for ${character?.name || 'character'}`}
          mode="roleplay"
          onImageGenerated={(assetId, imageUrl, bucket) => {
            console.log('Scene generated:', { assetId, imageUrl, bucket });
            setShowSceneGenerator(false);
            // Clear input after successful scene generation
            setInputMessage('');
          }}
          onGenerationStart={() => console.log('Scene generation started')}
        />
      )}

      <SceneGenerationModal
        isOpen={showSceneNarrativeModal}
        onClose={() => setShowSceneNarrativeModal(false)}
        characterId={characterId || undefined}
        conversationId={state.activeConversationId || undefined}
        character={character}
      />

      <RoleplaySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={roleplaySettings}
        onSettingsChange={setRoleplaySettings}
      />

      <AddCharacterModal
        isOpen={showAddCharacter}
        onClose={() => setShowAddCharacter(false)}
        onCharacterAdded={handleCharacterAdded}
      />
    </div>
  );
};

// Wrapper component with providers
const RoleplayChat = () => {
  return (
    <GeneratedMediaProvider>
      <PlaygroundProvider>
        <div className="bg-background">
          <RoleplayChatInterface />
        </div>
      </PlaygroundProvider>
    </GeneratedMediaProvider>
  );
};

export default RoleplayChat;
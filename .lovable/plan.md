
# Playground Refactor: Tabs, Edge Function Fixes, and Core Improvements

## Phase 1: Fix Edge Function Build Errors (unblocks everything)

All errors are pre-existing TypeScript strictness issues across 5 edge functions. Fixes are mechanical type casts and guards:

| File | Error | Fix |
|---|---|---|
| `playground-chat/index.ts` | `conversation` typed as `never` due to missing DB generic | Add `as any` cast on the `.single()` result, or use the local `Database` interface with `createClient<Database>` |
| `playground-chat/index.ts` | `.insert({...})` on `messages` typed as `never` | Cast insert payload `as any` |
| `playground-chat/index.ts` | `systemConfig?.config` on `never` | Cast `systemConfig as any` |
| `playground-chat/index.ts` | `req.body?.content_tier` | Parse body via `await req.json()` instead of accessing `req.body` directly (Deno Request has no `.body` property shortcut) |
| `roleplay-chat/index.ts` | Destructuring from `RoleplayChatRequest \| null` | Add `!` non-null assertion after `requestBody = await req.json()` or add a null guard before destructuring |
| `refresh-prompt-cache/index.ts` | `word` implicitly `any` | Add `: string` type annotation to the `.forEach(word` callback |
| `refresh-prompt-cache/index.ts` | `error` is `unknown` | Add `(error instanceof Error ? error.message : String(error))` |
| `register-chat-worker/index.ts` | `error` is `unknown` | Same pattern |
| `replicate-image/index.ts` | `error` is `unknown` | Same pattern |
| `replicate-webhook/index.ts` | `imageUrl` possibly null | Add null guards (`imageUrl?.substring(0, 100)`) |
| `replicate-webhook/index.ts` | `error` is `unknown` | Same pattern |

Estimated: ~25 one-line fixes across 5 files. No logic changes.

## Phase 2: Simplify Tabs to Chat + Compare + Admin

### New tab structure

| Tab | Purpose | Who sees it |
|---|---|---|
| **Chat** | Unified general-purpose chat with system prompt editor. Replaces Chat, Creative, and Roleplay tabs. | Everyone |
| **Compare** | Side-by-side: same prompt to 2 models, OR same model with 2 system prompts. Text-only (chat LLMs). | Everyone |
| **Admin** | Prompt Builder shortcut (pre-fills system prompt and opens Chat). Template browser. | Admin only |

### Why NOT image/video comparison in the Playground

The Workspace already provides the full generation pipeline (model selection, reference images, aspect ratios, parameter controls, preview). Duplicating that UI in Playground would be redundant. Instead:

- **Prompt enhancement comparison** lives in Compare tab -- send a raw prompt through two different enhancement templates and see the resulting enhanced prompts side by side. This tests the *text quality* of your prompt strategies without needing to actually generate images/videos.
- **Actual image/video generation** stays in Workspace where the full tooling already exists.

This keeps the Playground focused on **text/prompt testing** and avoids building a second generation UI.

### Files removed from Playground imports

| File | Action |
|---|---|
| `RoleplaySetup.tsx` (587 lines) | Stop importing in ChatInterface. Keep file (used elsewhere or future reference). |
| `CreativeTools.tsx` | Stop importing. |
| `CharacterDetailsPanel.tsx` | Stop importing. |
| `SceneImageGenerator.tsx` | Stop importing from MessageBubble. |
| `SceneImageButton.tsx` | Stop importing. |

### Files modified

| File | Changes |
|---|---|
| `PlaygroundModeSelector.tsx` | 3 tabs: Chat, Compare, Admin (admin-only). Remove `creative` and `roleplay` modes. |
| `ChatInterface.tsx` | Remove roleplay/creative setup panels. Wire new tabs. Defer conversation creation to first message. |
| `MessageBubble.tsx` | Remove Camera button and scene generation imports. Keep Copy and Regenerate. |

## Phase 3: System Prompt Editor

New component: `SystemPromptEditor.tsx`

- Collapsible textarea above the chat input area (collapsed by default, expands on click)
- Persisted per-conversation in localStorage keyed by conversation ID
- Sent as an additional `system_prompt` field in the `playground-chat` edge function payload
- Compact: collapsed state shows a single-line label "System Prompt" with character count; expanded shows a textarea
- Follows design system: `text-xs`, `h-7` toggle button, `text-[11px]` label

## Phase 4: Compare View

New component: `CompareView.tsx`

- Split-pane layout (two columns on desktop, stacked on mobile)
- Each pane has its own model selector dropdown (from `api_models` chat models)
- Optional: each pane has its own system prompt field
- Shared prompt input at the bottom
- "Send" fires the same message to `playground-chat` twice with different `model_variant` values
- Responses render side-by-side with markdown
- Compact header per pane showing model name and response time
- No conversation persistence needed -- this is ephemeral comparison

## Phase 5: Conversation Persistence and Markdown

### Load conversations on mount (`PlaygroundContext.tsx`)
- Add `useEffect` that queries `conversations` table filtered by current user, `conversation_type IN ('general', 'admin')`, ordered by `updated_at DESC`, limit 50
- Populate `conversations` state

### Load messages on conversation select (`PlaygroundContext.tsx`)
- When `setActiveConversation` is called, query `messages` for that `conversation_id` ordered by `created_at ASC`
- Populate `messages` state

### Markdown rendering (`ResponseTruncation.tsx`)
- Add `react-markdown` with `remark-gfm` for tables/strikethrough
- Replace plain text `div` with `<ReactMarkdown>` component
- Style code blocks with `bg-muted` background, inline code with `bg-muted/50 rounded px-1`

### Implement regenerate (`PlaygroundContext.tsx`)
- Delete last assistant message from DB
- Re-send the preceding user message to edge function
- Replace in local state

## Phase 6: Remove Duplicate SFW Toggle

The SFW/NSFW toggle exists in both the header `Switch` and the Settings popover `Content` dropdown. Remove the header `Switch` and keep it only in the Settings popover to reduce visual clutter.

## Style Compliance

All new components follow the design system:
- `text-xs` for body text, `text-[11px]` for labels
- `h-7` or `h-8` for interactive elements
- Minimal icons (only where functional: Settings gear, Copy, Regenerate)
- `gap-2` for internal spacing, `p-2` or `p-3` for section padding
- No decorative elements or large hero sections

## Implementation Order

1. Edge function type fixes (5 files, ~25 one-line changes) -- unblocks deployment
2. Tab restructure: `PlaygroundModeSelector` + `ChatInterface` cleanup
3. `SystemPromptEditor.tsx` (new)
4. `CompareView.tsx` (new)
5. Conversation persistence + markdown rendering
6. Remove duplicate SFW toggle
7. Clean up unused imports in `MessageBubble`

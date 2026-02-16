

# Compare View: Persistent Multi-Turn Conversations

## Problem
The Compare view creates a new ephemeral conversation for every message, discarding history. Roleplay testing requires multi-turn back-and-forth where the LLM remembers prior context -- exactly what the `playground-chat` edge function already supports via `conversation_id` (it loads prior messages from the DB).

## Solution
Give each panel its own persistent conversation that is created once and reused for all subsequent messages. Display the full message history (user + assistant) in each panel instead of just the last response.

## Changes to CompareView.tsx

### 1. Add message history to PanelState

Replace the single `response` string with an array of messages and a persistent `conversationId`:

```text
interface PanelMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  created_at: string;
}

interface PanelState {
  model: string;
  systemPrompt: string;
  messages: PanelMessage[];       // was: response: string
  conversationId: string | null;  // new: persistent per panel
  isLoading: boolean;
  responseTime: number | null;
  selectedTemplateId: string;
  selectedCharacterId: string;
}
```

### 2. Create conversation once, reuse it

Move `createEphemeralConversation` logic into `sendToPanel` with a guard: only create a new conversation if `panel.conversationId` is null. Store the resulting ID back into panel state so subsequent sends reuse it.

### 3. Pass character_id for roleplay routing

When a character is selected in the panel, include `character_id` in the edge function payload. The `playground-chat` function already routes to `roleplay-chat` logic when a character is present, or alternatively send directly to `roleplay-chat` when `selectedCharacterId` is set.

### 4. Accumulate messages in the response area

- On send: append the user message to `panel.messages` immediately
- On response: append the assistant message to `panel.messages`
- Render all messages in a scrollable list (user messages right-aligned or labeled, assistant messages left-aligned with markdown)
- Auto-scroll to bottom on new messages

### 5. Add a "New Session" button per panel

A small button in each panel header that clears `conversationId` and `messages`, starting a fresh conversation on the next send. This avoids leftover context when switching models or templates.

### 6. Character ID on conversation creation

When creating the conversation record, pass `character_id` from the panel's selected character so the edge function's ownership/access checks and context loading work correctly.

## UI Layout (per panel)

```text
+------------------------------------------+
| A  [Model dropdown v]  [New Session btn] |
| [Template dropdown v]                    |
| [Character dropdown v]                   |
| [System prompt textarea]                 |
+------------------------------------------+
| User: Tell me about yourself             |
| Assistant: I am Scarlett, a...           |
| User: What do you think of...            |
| Assistant: Well, considering my...       |
|                              [auto-scroll]|
+------------------------------------------+
```

The shared prompt input at the bottom stays as-is. "Send" appends the user message to both panels and fires both requests in parallel.

## Files Changed

| File | Change |
|---|---|
| `src/components/playground/CompareView.tsx` | Refactor PanelState to hold messages array + conversationId. Update sendToPanel to create-once/reuse. Render message history. Add "New Session" button. Pass character_id in payload. |

No other files need changes -- the edge function already handles multi-turn context via conversation_id and character_id routing.

## Style Rules
- Message list: `text-xs`, user messages with `bg-muted/50 rounded p-2`, assistant with `prose-sm`
- "New Session" button: `h-7 text-xs` ghost variant
- Sender labels: `text-[11px] text-muted-foreground`
- No new icons beyond what's already imported


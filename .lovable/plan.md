

# Replace Chat Selector with Task-Specific Model Selectors — DONE

Replaced the single "Chat" model dropdown with **Roleplay** and **Reasoning** task-specific selectors.
Models are filtered by their `tasks` array (`roleplay` or `reasoning`).
Legacy `chatModel` in localStorage auto-migrates to `roleplayModel`.

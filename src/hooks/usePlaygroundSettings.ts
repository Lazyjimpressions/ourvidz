 import { useState, useEffect, useCallback } from 'react';
 
 const STORAGE_KEY = 'playground-settings';
 
export interface PlaygroundSettings {
  roleplayModel: string;
  reasoningModel: string;
  imageModel: string;
  videoModel: string;
  i2iModel: string;
  enhancementModel: string;
  roleplayTemplateId: string;
  reasoningTemplateId: string;
  enhancementTemplateId: string;
  imageTemplateId: string;
  videoTemplateId: string;
  contentMode: 'sfw' | 'nsfw';
}

const DEFAULT_SETTINGS: PlaygroundSettings = {
  roleplayModel: 'gryphe/mythomax-l2-13b',
  reasoningModel: '',
  imageModel: 'fal-ai/seedream-v4',
  videoModel: 'fal-ai/wan-i2v',
  i2iModel: 'fal-ai/seedream-v4.5-edit',
  enhancementModel: '',
  roleplayTemplateId: '',
  reasoningTemplateId: '',
  enhancementTemplateId: '',
  imageTemplateId: '',
  videoTemplateId: '',
  contentMode: 'nsfw',
};
 
 export const usePlaygroundSettings = () => {
  const [settings, setSettingsState] = useState<PlaygroundSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate legacy chatModel → roleplayModel
        if (parsed.chatModel && !parsed.roleplayModel) {
          parsed.roleplayModel = parsed.chatModel;
          delete parsed.chatModel;
        }
        // Migrate legacy promptTemplateId → roleplayTemplateId
        if (parsed.promptTemplateId && !parsed.roleplayTemplateId) {
          parsed.roleplayTemplateId = parsed.promptTemplateId;
          delete parsed.promptTemplateId;
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load playground settings:', e);
    }
    return DEFAULT_SETTINGS;
  });
 
   // Persist to localStorage on change
   useEffect(() => {
     try {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
     } catch (e) {
       console.warn('Failed to save playground settings:', e);
     }
   }, [settings]);
 
   const updateSettings = useCallback((updates: Partial<PlaygroundSettings>) => {
     setSettingsState(prev => ({ ...prev, ...updates }));
   }, []);
 
   const resetSettings = useCallback(() => {
     setSettingsState(DEFAULT_SETTINGS);
   }, []);
 
   return {
     settings,
     updateSettings,
     resetSettings,
     DEFAULT_SETTINGS,
   };
 };
import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  Heart,
  Crown,
  Sparkles,
  Flame,
  Play,
  User
} from 'lucide-react';
import type {
  ScenarioType,
  ScenarioSessionPayload,
  ScenarioIntensity,
  ScenarioPacing,
  ScenarioHookTemplate
} from '@/types/roleplay';

interface ScenarioSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (payload: ScenarioSessionPayload) => void;
  preselectedCharacterId?: string;
}

// Streamlined 4-step wizard
type WizardStep = 'character' | 'scenario' | 'vibe' | 'start';

const STEPS: WizardStep[] = ['character', 'scenario', 'vibe', 'start'];

const STEP_LABELS: Record<WizardStep, string> = {
  character: 'Character',
  scenario: 'Scenario',
  vibe: 'Vibe',
  start: 'Start'
};

// Scenario type icons
const SCENARIO_ICONS: Record<ScenarioType, React.ReactNode> = {
  stranger: <Zap className="w-4 h-4" />,
  relationship: <Heart className="w-4 h-4" />,
  power_dynamic: <Crown className="w-4 h-4" />,
  fantasy: <Sparkles className="w-4 h-4" />,
  slow_burn: <Flame className="w-4 h-4" />
};

const SCENARIO_DESCRIPTIONS: Record<ScenarioType, string> = {
  stranger: 'First meeting with unknown chemistry',
  relationship: 'Partners with history and comfort',
  power_dynamic: 'Consensual role-based dynamics',
  fantasy: 'Otherworldly settings and scenarios',
  slow_burn: 'Building tension over time'
};

const HOOK_DESCRIPTIONS: Record<ScenarioHookTemplate, string> = {
  misunderstanding: 'Something needs clarification',
  reunion: 'Coming together after time apart',
  secret: 'Something hidden wants to come out',
  challenge: 'A bet, dare, or game',
  confession: 'Admitting something vulnerable',
  custom: 'Write your own opening'
};

// Default payload values
const DEFAULT_PAYLOAD: Partial<ScenarioSessionPayload> = {
  atmosphere: { romance: 50, playfulness: 50, tension: 30, drama: 30 },
  consent: {
    adultOnlyConfirmed: true,
    fictionalConfirmed: true,
    intensity: 'moderate',
    pacing: 'balanced',
    limits: { hard: [], soft: [] },
    safeStop: { enabled: true }
  },
  style: {
    perspective: 'first',
    messageLength: 'medium',
    dialogueWeight: 'balanced',
    initiator: 'partner'
  },
  contentTier: 'nsfw'
};

export const ScenarioSetupWizard = ({
  isOpen,
  onClose,
  onComplete,
  preselectedCharacterId
}: ScenarioSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('character');
  const [payload, setPayload] = useState<Partial<ScenarioSessionPayload>>(DEFAULT_PAYLOAD);
  const [newHardLimit, setNewHardLimit] = useState('');

  const { characters: publicCharacters } = usePublicCharacters();
  const { characters: userCharacters } = useUserCharacters();
  const { toast } = useToast();

  // Combine user and public characters
  const allCharacters = useMemo(() => {
    const userIds = new Set(userCharacters.map(c => c.id));
    return [
      ...userCharacters,
      ...publicCharacters.filter(c => !userIds.has(c.id))
    ];
  }, [userCharacters, publicCharacters]);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Navigation helpers
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'character':
        return !!payload.characters?.partnerRole?.name;
      case 'scenario':
        return !!payload.type && !!payload.setting?.location;
      case 'vibe':
        return true; // Has defaults
      case 'start':
        return !!payload.hook?.templateId || !!payload.hook?.customText;
      default:
        return false;
    }
  }, [currentStep, payload]);

  const goNext = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const handleComplete = () => {
    if (!payload.type || !payload.characters?.partnerRole) {
      toast({
        title: 'Missing Information',
        description: 'Please complete all required fields.',
        variant: 'destructive'
      });
      return;
    }

    // Find the character to get the aiCharacterId
    const selectedChar = allCharacters.find(c => c.id === payload.characters?.partnerRole?.id);

    const finalPayload: ScenarioSessionPayload = {
      type: payload.type!,
      characters: {
        partnerRole: payload.characters.partnerRole!,
        userRole: payload.characters?.userRole
      },
      relationshipContext: payload.relationshipContext || 'undefined relationship',
      setting: payload.setting || { location: 'unspecified' },
      atmosphere: payload.atmosphere || DEFAULT_PAYLOAD.atmosphere!,
      consent: {
        adultOnlyConfirmed: true,
        fictionalConfirmed: true,
        intensity: payload.consent?.intensity || 'moderate',
        pacing: payload.consent?.pacing || 'balanced',
        limits: payload.consent?.limits || { hard: [], soft: [] },
        safeStop: payload.consent?.safeStop
      },
      style: payload.style || DEFAULT_PAYLOAD.style!,
      hook: payload.hook || { templateId: 'custom' },
      contentTier: payload.contentTier || 'nsfw',
      aiCharacterId: selectedChar?.id
    };

    onComplete(finalPayload);
    onClose();
    resetWizard();
  };

  const resetWizard = () => {
    setCurrentStep('character');
    setPayload(DEFAULT_PAYLOAD);
    setNewHardLimit('');
  };

  const addHardLimit = () => {
    if (newHardLimit.trim()) {
      setPayload(prev => ({
        ...prev,
        consent: {
          ...prev.consent!,
          limits: {
            ...prev.consent!.limits,
            hard: [...(prev.consent?.limits?.hard || []), newHardLimit.trim()]
          }
        }
      }));
      setNewHardLimit('');
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      // Step 1: Character Selection
      case 'character':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Partner Character *</Label>
              <p className="text-xs text-muted-foreground mb-2">Choose who you want to roleplay with</p>
              <Select
                value={payload.characters?.partnerRole?.id || ''}
                onValueChange={(id) => {
                  const char = allCharacters.find(c => c.id === id);
                  if (char) {
                    setPayload(prev => ({
                      ...prev,
                      characters: {
                        ...prev.characters,
                        partnerRole: { id: char.id, name: char.name }
                      }
                    }));
                  }
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a character" />
                </SelectTrigger>
                <SelectContent>
                  {allCharacters.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      <div className="flex items-center gap-2">
                        {char.image_url ? (
                          <img src={char.image_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-muted-foreground" />
                        )}
                        <span>{char.name}</span>
                        {char.content_rating === 'nsfw' && (
                          <Badge variant="outline" className="text-[10px] px-1">NSFW</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Your Role <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={payload.characters?.userRole?.name || ''}
                onChange={(e) => setPayload(prev => ({
                  ...prev,
                  characters: {
                    ...prev.characters!,
                    userRole: e.target.value ? { name: e.target.value } : undefined
                  }
                }))}
                placeholder="Your character name (or leave blank)"
                className="h-9 mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Relationship Context</Label>
              <Input
                value={payload.relationshipContext || ''}
                onChange={(e) => setPayload(prev => ({
                  ...prev,
                  relationshipContext: e.target.value
                }))}
                placeholder="e.g., Just met, Partners, Rivals..."
                className="h-9 mt-1"
              />
            </div>
          </div>
        );

      // Step 2: Scenario Type + Setting
      case 'scenario':
        return (
          <div className="space-y-4">
            {/* Scenario Type */}
            <div>
              <Label className="text-sm font-medium">Scenario Type *</Label>
              <RadioGroup
                value={payload.type}
                onValueChange={(v: ScenarioType) => setPayload(prev => ({ ...prev, type: v }))}
                className="grid grid-cols-1 gap-2 mt-2"
              >
                {(['stranger', 'relationship', 'power_dynamic', 'fantasy', 'slow_burn'] as ScenarioType[]).map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-colors ${
                      payload.type === type ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={type} id={type} className="sr-only" />
                    <div className="text-muted-foreground">{SCENARIO_ICONS[type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm capitalize">{type.replace('_', ' ')}</div>
                      <div className="text-xs text-muted-foreground truncate">{SCENARIO_DESCRIPTIONS[type]}</div>
                    </div>
                    {payload.type === type && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Location */}
            <div>
              <Label className="text-sm font-medium">Location *</Label>
              <Select
                value={payload.setting?.location || ''}
                onValueChange={(v) => setPayload(prev => ({
                  ...prev,
                  setting: { ...prev.setting, location: v }
                }))}
              >
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="party">Party</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="outdoors">Outdoors</SelectItem>
                  <SelectItem value="fantasy">Fantasy Location</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Atmosphere */}
            <div>
              <Label className="text-sm font-medium">Atmosphere</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { key: 'romance', label: 'Romance', icon: '💕' },
                  { key: 'tension', label: 'Tension', icon: '⚡' }
                ].map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <Slider
                      value={[(payload.atmosphere as any)?.[key] || 50]}
                      onValueChange={([v]) => setPayload(prev => ({
                        ...prev,
                        atmosphere: { ...prev.atmosphere!, [key]: v }
                      }))}
                      max={100}
                      step={10}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // Step 3: Vibe (Intensity, Pacing, Content Tier)
      case 'vibe':
        return (
          <div className="space-y-4">
            {/* Content Tier */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <Label className="text-sm font-medium">Content Rating</Label>
                <p className="text-xs text-muted-foreground">
                  {payload.contentTier === 'nsfw' ? 'Adult content enabled' : 'Safe for work only'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">SFW</span>
                <Switch
                  checked={payload.contentTier === 'nsfw'}
                  onCheckedChange={(checked) => setPayload(prev => ({
                    ...prev,
                    contentTier: checked ? 'nsfw' : 'sfw'
                  }))}
                />
                <span className="text-xs text-muted-foreground">NSFW</span>
              </div>
            </div>

            {/* Intensity */}
            <div>
              <Label className="text-sm font-medium">Intensity</Label>
              <RadioGroup
                value={payload.consent?.intensity || 'moderate'}
                onValueChange={(v: ScenarioIntensity) => setPayload(prev => ({
                  ...prev,
                  consent: { ...prev.consent!, intensity: v }
                }))}
                className="flex gap-2 mt-2"
              >
                {(['gentle', 'moderate', 'intense'] as ScenarioIntensity[]).map((level) => (
                  <label
                    key={level}
                    className={`flex-1 text-center py-2 px-3 border rounded-lg cursor-pointer text-sm transition-colors ${
                      payload.consent?.intensity === level ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={level} className="sr-only" />
                    <span className="capitalize">{level}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Pacing */}
            <div>
              <Label className="text-sm font-medium">Pacing</Label>
              <RadioGroup
                value={payload.consent?.pacing || 'balanced'}
                onValueChange={(v: ScenarioPacing) => setPayload(prev => ({
                  ...prev,
                  consent: { ...prev.consent!, pacing: v }
                }))}
                className="flex gap-2 mt-2"
              >
                {(['slow', 'balanced', 'fast'] as ScenarioPacing[]).map((pace) => (
                  <label
                    key={pace}
                    className={`flex-1 text-center py-2 px-3 border rounded-lg cursor-pointer text-sm transition-colors ${
                      payload.consent?.pacing === pace ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={pace} className="sr-only" />
                    <span className="capitalize">{pace}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Limits (collapsible) */}
            <details className="group">
              <summary className="text-sm font-medium cursor-pointer flex items-center gap-1">
                <span>Limits</span>
                <span className="text-xs text-muted-foreground">(optional)</span>
                <ChevronRight className="w-4 h-4 ml-auto transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newHardLimit}
                    onChange={(e) => setNewHardLimit(e.target.value)}
                    placeholder="Add a limit..."
                    onKeyPress={(e) => e.key === 'Enter' && addHardLimit()}
                    className="h-8 text-sm flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={addHardLimit} className="h-8 px-2">+</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {payload.consent?.limits?.hard?.map((limit, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs pr-1">
                      {limit}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={() => setPayload(prev => ({
                          ...prev,
                          consent: {
                            ...prev.consent!,
                            limits: {
                              ...prev.consent!.limits,
                              hard: prev.consent!.limits.hard.filter((_, i) => i !== idx)
                            }
                          }
                        }))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </details>
          </div>
        );

      // Step 4: Hook + Launch
      case 'start':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Opening Hook *</Label>
              <p className="text-xs text-muted-foreground mb-2">How should the scenario begin?</p>
              <RadioGroup
                value={payload.hook?.templateId || ''}
                onValueChange={(v: ScenarioHookTemplate) => setPayload(prev => ({
                  ...prev,
                  hook: { ...prev.hook, templateId: v, customText: v === 'custom' ? prev.hook?.customText : undefined }
                }))}
                className="space-y-2"
              >
                {(['misunderstanding', 'reunion', 'challenge', 'confession', 'custom'] as ScenarioHookTemplate[]).map((hook) => (
                  <label
                    key={hook}
                    className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-colors ${
                      payload.hook?.templateId === hook ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={hook} className="sr-only" />
                    <div className="flex-1">
                      <div className="font-medium text-sm capitalize">
                        {hook === 'custom' ? 'Custom Opening' : `A ${hook.replace('_', ' ')}`}
                      </div>
                      <div className="text-xs text-muted-foreground">{HOOK_DESCRIPTIONS[hook]}</div>
                    </div>
                    {payload.hook?.templateId === hook && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {payload.hook?.templateId === 'custom' && (
              <Textarea
                value={payload.hook?.customText || ''}
                onChange={(e) => setPayload(prev => ({
                  ...prev,
                  hook: { ...prev.hook!, customText: e.target.value }
                }))}
                placeholder="Write your custom opening hook..."
                className="min-h-[80px] text-sm"
              />
            )}

            {/* Summary Preview */}
            <div className="p-3 rounded-lg bg-muted/30 space-y-1.5 text-sm">
              <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Summary</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">With:</span>
                <span className="font-medium">{payload.characters?.partnerRole?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="capitalize">{payload.type?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Setting:</span>
                <span className="capitalize">{payload.setting?.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Content:</span>
                <Badge variant={payload.contentTier === 'nsfw' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                  {payload.contentTier?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col rounded-t-xl">
        <SheetHeader className="flex-shrink-0 pb-2">
          <SheetTitle className="text-base">
            Step {currentStepIndex + 1}: {STEP_LABELS[currentStep]}
          </SheetTitle>
          <Progress value={progress} className="h-1 mt-2" />
        </SheetHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {renderStepContent()}
        </div>

        {/* Fixed navigation footer */}
        <div className="flex-shrink-0 flex gap-2 pt-3 border-t">
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={goBack} className="flex-1 h-10">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}

          {currentStep === 'start' ? (
            <Button
              onClick={handleComplete}
              className="flex-1 h-10"
              disabled={!canGoNext()}
            >
              <Play className="w-4 h-4 mr-1" />
              Start Scenario
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex-1 h-10"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ScenarioSetupWizard;

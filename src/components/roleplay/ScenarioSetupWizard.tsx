import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  Heart,
  Crown,
  Sparkles,
  Flame,
  Play
} from 'lucide-react';
import type {
  ScenarioType,
  ScenarioWizardStep,
  ScenarioSessionPayload,
  ScenarioIntensity,
  ScenarioPacing,
  WritingPerspective,
  MessageLength,
  DialogueWeight,
  ConversationInitiator,
  ScenarioHookTemplate,
  ContentRating
} from '@/types/roleplay';
import {
  SCENARIO_TYPE_METADATA,
  SCENARIO_HOOK_TEMPLATES
} from '@/types/roleplay';

interface ScenarioSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (payload: ScenarioSessionPayload) => void;
  preselectedCharacterId?: string;
}

// Step configuration
const STEPS: ScenarioWizardStep[] = [
  'mode_select',
  'age_gate',
  'scenario_type',
  'characters',
  'setting',
  'consent',
  'style',
  'hook',
  'review'
];

const STEP_LABELS: Record<ScenarioWizardStep, string> = {
  mode_select: 'Start',
  age_gate: 'Verify',
  scenario_type: 'Type',
  characters: 'Characters',
  setting: 'Setting',
  consent: 'Consent',
  style: 'Style',
  hook: 'Hook',
  review: 'Review'
};

// Scenario type icons
const SCENARIO_ICONS: Record<ScenarioType, React.ReactNode> = {
  stranger: <Zap className="w-4 h-4" />,
  relationship: <Heart className="w-4 h-4" />,
  power_dynamic: <Crown className="w-4 h-4" />,
  fantasy: <Sparkles className="w-4 h-4" />,
  slow_burn: <Flame className="w-4 h-4" />
};

// Default payload values
const DEFAULT_PAYLOAD: Partial<ScenarioSessionPayload> = {
  atmosphere: { romance: 50, playfulness: 50, tension: 30, drama: 30 },
  consent: {
    adultOnlyConfirmed: false,
    fictionalConfirmed: false,
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
  contentTier: 'nsfw'  // Default to NSFW
};

export const ScenarioSetupWizard = ({
  isOpen,
  onClose,
  onComplete,
  preselectedCharacterId
}: ScenarioSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState<ScenarioWizardStep>('mode_select');
  const [isQuickStart, setIsQuickStart] = useState(false);
  const [payload, setPayload] = useState<Partial<ScenarioSessionPayload>>(DEFAULT_PAYLOAD);
  const [newHardLimit, setNewHardLimit] = useState('');
  const [newSoftLimit, setNewSoftLimit] = useState('');

  const { characters: publicCharacters } = usePublicCharacters();
  const { toast } = useToast();

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Navigation helpers
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'mode_select':
        return true;
      case 'age_gate':
        return payload.consent?.adultOnlyConfirmed && payload.consent?.fictionalConfirmed;
      case 'scenario_type':
        return !!payload.type;
      case 'characters':
        return !!payload.characters?.partnerRole?.name;
      case 'setting':
        return !!payload.setting?.location;
      case 'consent':
        return true; // Has defaults
      case 'style':
        return true; // Has defaults
      case 'hook':
        return !!payload.hook?.templateId || !!payload.hook?.customText;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, payload]);

  const goNext = () => {
    const currentIndex = STEPS.indexOf(currentStep);

    // Skip age_gate if already confirmed NSFW
    let nextIndex = currentIndex + 1;
    if (STEPS[nextIndex] === 'age_gate' && payload.consent?.adultOnlyConfirmed) {
      nextIndex++;
    }

    // Quick start skips to consent directly after characters
    if (isQuickStart && currentStep === 'characters') {
      setCurrentStep('consent');
      return;
    }

    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
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
      contentTier: payload.contentTier || 'nsfw'
    };

    onComplete(finalPayload);
    onClose();
    resetWizard();
  };

  const resetWizard = () => {
    setCurrentStep('mode_select');
    setIsQuickStart(false);
    setPayload(DEFAULT_PAYLOAD);
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

  const addSoftLimit = () => {
    if (newSoftLimit.trim()) {
      setPayload(prev => ({
        ...prev,
        consent: {
          ...prev.consent!,
          limits: {
            ...prev.consent!.limits,
            soft: [...(prev.consent?.limits?.soft || []), newSoftLimit.trim()]
          }
        }
      }));
      setNewSoftLimit('');
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'mode_select':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">How would you like to start?</p>
            <RadioGroup
              value={isQuickStart ? 'quick' : 'wizard'}
              onValueChange={(v) => setIsQuickStart(v === 'quick')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="wizard" id="wizard" />
                <div className="flex-1">
                  <Label htmlFor="wizard" className="font-medium">Guided Setup</Label>
                  <p className="text-xs text-muted-foreground">Full customization with all options</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="quick" id="quick" />
                <div className="flex-1">
                  <Label htmlFor="quick" className="font-medium">Quick Start</Label>
                  <p className="text-xs text-muted-foreground">Minimal setup with smart defaults</p>
                </div>
              </div>
            </RadioGroup>
          </div>
        );

      case 'age_gate':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Please confirm the following:</p>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="adult"
                  checked={payload.consent?.adultOnlyConfirmed}
                  onCheckedChange={(checked) => setPayload(prev => ({
                    ...prev,
                    consent: { ...prev.consent!, adultOnlyConfirmed: checked === true }
                  }))}
                />
                <Label htmlFor="adult" className="text-sm leading-tight">
                  All participants and characters are adults (18+)
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="fictional"
                  checked={payload.consent?.fictionalConfirmed}
                  onCheckedChange={(checked) => setPayload(prev => ({
                    ...prev,
                    consent: { ...prev.consent!, fictionalConfirmed: checked === true }
                  }))}
                />
                <Label htmlFor="fictional" className="text-sm leading-tight">
                  This is fictional role-play for entertainment
                </Label>
              </div>
            </div>
          </div>
        );

      case 'scenario_type':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">What type of scenario?</p>
            <RadioGroup
              value={payload.type}
              onValueChange={(v: ScenarioType) => setPayload(prev => ({
                ...prev,
                type: v,
                relationshipContext: getDefaultRelationshipContext(v)
              }))}
              className="space-y-2"
            >
              {(['stranger', 'relationship', 'power_dynamic', 'fantasy', 'slow_burn'] as ScenarioType[]).map((type) => (
                <div
                  key={type}
                  className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer ${
                    payload.type === type ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <RadioGroupItem value={type} id={type} />
                  <div className="text-muted-foreground">{SCENARIO_ICONS[type]}</div>
                  <div className="flex-1">
                    <Label htmlFor={type} className="font-medium capitalize cursor-pointer">
                      {type.replace('_', ' ')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {getScenarioDescription(type)}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'characters':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Partner Character *</Label>
              <Select
                value={payload.characters?.partnerRole?.id || ''}
                onValueChange={(id) => {
                  const char = publicCharacters.find(c => c.id === id);
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
                <SelectTrigger>
                  <SelectValue placeholder="Select a character" />
                </SelectTrigger>
                <SelectContent>
                  {publicCharacters.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Your Role (optional)</Label>
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
              />
            </div>

            <div>
              <Label className="text-sm">Relationship</Label>
              <Input
                value={payload.relationshipContext || ''}
                onChange={(e) => setPayload(prev => ({
                  ...prev,
                  relationshipContext: e.target.value
                }))}
                placeholder="e.g., Just met, Partners, Rivals"
              />
            </div>
          </div>
        );

      case 'setting':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Location *</Label>
              <Select
                value={payload.setting?.location || ''}
                onValueChange={(v) => setPayload(prev => ({
                  ...prev,
                  setting: { ...prev.setting, location: v }
                }))}
              >
                <SelectTrigger>
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

            <div>
              <Label className="text-sm">Time of Day</Label>
              <RadioGroup
                value={payload.setting?.timeOfDay || 'night'}
                onValueChange={(v: 'morning' | 'afternoon' | 'night') => setPayload(prev => ({
                  ...prev,
                  setting: { ...prev.setting!, timeOfDay: v }
                }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="morning" id="morning" />
                  <Label htmlFor="morning" className="text-sm">Morning</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="afternoon" id="afternoon" />
                  <Label htmlFor="afternoon" className="text-sm">Afternoon</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="night" id="night" />
                  <Label htmlFor="night" className="text-sm">Night</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm">Atmosphere</Label>
              {[
                { key: 'romance', label: 'Romance' },
                { key: 'playfulness', label: 'Playfulness' },
                { key: 'tension', label: 'Tension' },
                { key: 'drama', label: 'Drama' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs w-20">{label}</span>
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
                  <span className="text-xs w-8 text-right">{(payload.atmosphere as any)?.[key] || 50}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'consent':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Content Rating</Label>
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-sm text-muted-foreground">
                  {payload.contentTier === 'nsfw' ? 'NSFW' : 'SFW'}
                </Label>
                <Switch
                  checked={payload.contentTier === 'nsfw'}
                  onCheckedChange={(checked) => setPayload(prev => ({
                    ...prev,
                    contentTier: checked ? 'nsfw' : 'sfw'
                  }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Intensity</Label>
              <RadioGroup
                value={payload.consent?.intensity || 'moderate'}
                onValueChange={(v: ScenarioIntensity) => setPayload(prev => ({
                  ...prev,
                  consent: { ...prev.consent!, intensity: v }
                }))}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gentle" id="gentle" />
                  <Label htmlFor="gentle" className="text-sm">Gentle</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="moderate" />
                  <Label htmlFor="moderate" className="text-sm">Moderate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="intense" id="intense" />
                  <Label htmlFor="intense" className="text-sm">Intense</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm">Pacing</Label>
              <RadioGroup
                value={payload.consent?.pacing || 'balanced'}
                onValueChange={(v: ScenarioPacing) => setPayload(prev => ({
                  ...prev,
                  consent: { ...prev.consent!, pacing: v }
                }))}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="slow" id="slow" />
                  <Label htmlFor="slow" className="text-sm">Slow</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced" className="text-sm">Balanced</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fast" id="fast" />
                  <Label htmlFor="fast" className="text-sm">Fast</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm">Hard Limits</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newHardLimit}
                  onChange={(e) => setNewHardLimit(e.target.value)}
                  placeholder="Add hard limit"
                  onKeyPress={(e) => e.key === 'Enter' && addHardLimit()}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={addHardLimit}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {payload.consent?.limits?.hard?.map((limit, idx) => (
                  <Badge key={idx} variant="destructive" className="text-xs">
                    {limit}
                    <button
                      className="ml-1"
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
          </div>
        );

      case 'style':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Perspective</Label>
              <RadioGroup
                value={payload.style?.perspective || 'first'}
                onValueChange={(v: WritingPerspective) => setPayload(prev => ({
                  ...prev,
                  style: { ...prev.style!, perspective: v }
                }))}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="first" id="first" />
                  <Label htmlFor="first" className="text-sm">First Person</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="third" id="third" />
                  <Label htmlFor="third" className="text-sm">Third Person</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mixed" id="mixed" />
                  <Label htmlFor="mixed" className="text-sm">Mixed</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm">Message Length</Label>
              <RadioGroup
                value={payload.style?.messageLength || 'medium'}
                onValueChange={(v: MessageLength) => setPayload(prev => ({
                  ...prev,
                  style: { ...prev.style!, messageLength: v }
                }))}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="short" />
                  <Label htmlFor="short" className="text-sm">Short</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="text-sm">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="long" />
                  <Label htmlFor="long" className="text-sm">Long</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm">Who Starts?</Label>
              <RadioGroup
                value={payload.style?.initiator || 'partner'}
                onValueChange={(v: ConversationInitiator) => setPayload(prev => ({
                  ...prev,
                  style: { ...prev.style!, initiator: v }
                }))}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="user" id="user-starts" />
                  <Label htmlFor="user-starts" className="text-sm">You</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partner" id="partner-starts" />
                  <Label htmlFor="partner-starts" className="text-sm">Partner</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="alternating" id="alternating" />
                  <Label htmlFor="alternating" className="text-sm">Alternating</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 'hook':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">How should the scenario begin?</p>
            <RadioGroup
              value={payload.hook?.templateId || ''}
              onValueChange={(v: ScenarioHookTemplate) => setPayload(prev => ({
                ...prev,
                hook: { ...prev.hook, templateId: v, customText: v === 'custom' ? prev.hook?.customText : undefined }
              }))}
              className="space-y-2"
            >
              {(['misunderstanding', 'reunion', 'secret', 'challenge', 'confession', 'custom'] as ScenarioHookTemplate[]).map((hook) => (
                <div
                  key={hook}
                  className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 ${
                    payload.hook?.templateId === hook ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <RadioGroupItem value={hook} id={hook} />
                  <div className="flex-1">
                    <Label htmlFor={hook} className="font-medium capitalize cursor-pointer">
                      {hook === 'custom' ? 'Custom' : `A ${hook.replace('_', ' ')}`}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {getHookDescription(hook)}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {payload.hook?.templateId === 'custom' && (
              <Textarea
                value={payload.hook?.customText || ''}
                onChange={(e) => setPayload(prev => ({
                  ...prev,
                  hook: { ...prev.hook!, customText: e.target.value }
                }))}
                placeholder="Write your custom opening hook..."
                className="min-h-[80px]"
              />
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Review your scenario</p>

            <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium capitalize">{payload.type?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partner:</span>
                <span className="font-medium">{payload.characters?.partnerRole?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Setting:</span>
                <span className="font-medium capitalize">{payload.setting?.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intensity:</span>
                <span className="font-medium capitalize">{payload.consent?.intensity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pacing:</span>
                <span className="font-medium capitalize">{payload.consent?.pacing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Content:</span>
                <Badge variant={payload.contentTier === 'nsfw' ? 'destructive' : 'secondary'}>
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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">
              {currentStep === 'review' ? 'Ready to Start' : `Step ${currentStepIndex + 1}: ${STEP_LABELS[currentStep]}`}
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-1" />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 pt-4 border-t">
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={goBack} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}

          {currentStep === 'review' ? (
            <Button onClick={handleComplete} className="flex-1">
              <Play className="w-4 h-4 mr-1" />
              Start Scenario
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex-1"
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

// Helper functions
function getDefaultRelationshipContext(type: ScenarioType): string {
  const contexts: Record<ScenarioType, string> = {
    stranger: 'Just met',
    relationship: 'Partners',
    power_dynamic: 'Role-based dynamic',
    fantasy: 'World-dependent',
    slow_burn: 'Unspoken tension'
  };
  return contexts[type] || '';
}

function getScenarioDescription(type: ScenarioType): string {
  const descriptions: Record<ScenarioType, string> = {
    stranger: 'First meeting with unknown chemistry',
    relationship: 'Partners with history and comfort',
    power_dynamic: 'Consensual role-based dynamics',
    fantasy: 'Otherworldly settings and scenarios',
    slow_burn: 'Building tension over time'
  };
  return descriptions[type] || '';
}

function getHookDescription(hook: ScenarioHookTemplate): string {
  const descriptions: Record<ScenarioHookTemplate, string> = {
    misunderstanding: 'Something needs clarification',
    reunion: 'Coming together after time apart',
    secret: 'Something hidden wants to come out',
    challenge: 'A bet, dare, or game',
    confession: 'Admitting something vulnerable',
    custom: 'Write your own opening'
  };
  return descriptions[hook] || '';
}

export default ScenarioSetupWizard;

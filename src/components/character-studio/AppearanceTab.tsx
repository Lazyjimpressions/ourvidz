import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CharacterV2, CharacterAnchor } from '@/types/character-hub-v2';
import { AnchorManager } from '@/components/character-studio/AnchorManager';

interface AppearanceTabProps {
    formData: Partial<CharacterV2>;
    updateField: (field: keyof CharacterV2, value: any) => void;
    // Anchor specific props (optional to support existing usage, but required for V2 functionality)
    anchors?: CharacterAnchor[];
    onUploadAnchor?: (file: File) => Promise<void>;
    onDeleteAnchor?: (id: string) => Promise<void>;
    onSetPrimaryAnchor?: (id: string) => Promise<void>;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
    formData,
    updateField,
    anchors = [],
    onUploadAnchor,
    onDeleteAnchor,
    onSetPrimaryAnchor
}) => {
    const physicalTraits = formData.physical_traits || {};

    const handleTraitChange = (key: string, value: string) => {
        updateField('physical_traits', { ...physicalTraits, [key]: value });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Anchor Management Section */}
            {onUploadAnchor && onDeleteAnchor && onSetPrimaryAnchor && (
                <div className="pb-6 border-b border-border/50">
                    <AnchorManager
                        anchors={anchors}
                        onUpload={onUploadAnchor}
                        onDelete={onDeleteAnchor}
                        onSetPrimary={onSetPrimaryAnchor}
                    />
                </div>
            )}

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input
                            id="age"
                            value={physicalTraits.age || ''}
                            onChange={(e) => handleTraitChange('age', e.target.value)}
                            placeholder="e.g. 25"
                            className="bg-secondary/50 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ethnicity">Ethnicity</Label>
                        <Input
                            id="ethnicity"
                            value={physicalTraits.ethnicity || ''}
                            onChange={(e) => handleTraitChange('ethnicity', e.target.value)}
                            placeholder="e.g. Japanese"
                            className="bg-secondary/50 border-white/10"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="hair">Hair Style/Color</Label>
                        <Input
                            id="hair"
                            value={physicalTraits.hair || ''}
                            onChange={(e) => handleTraitChange('hair', e.target.value)}
                            placeholder="e.g. Long black hair with bangs"
                            className="bg-secondary/50 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="eyes">Eye Color</Label>
                        <Input
                            id="eyes"
                            value={physicalTraits.eyes || ''}
                            onChange={(e) => handleTraitChange('eyes', e.target.value)}
                            placeholder="e.g. Green"
                            className="bg-secondary/50 border-white/10"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="body_type">Body Type</Label>
                    <Input
                        id="body_type"
                        value={physicalTraits.body_type || ''}
                        onChange={(e) => handleTraitChange('body_type', e.target.value)}
                        placeholder="e.g. Athletic, Curvy, Slim"
                        className="bg-secondary/50 border-white/10"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="outfit">Signature Outfit</Label>
                    <Textarea
                        id="outfit"
                        value={formData.outfit_defaults || ''}
                        onChange={(e) => updateField('outfit_defaults', e.target.value)}
                        placeholder="Description of their default clothing..."
                        className="min-h-[100px] bg-secondary/50 border-white/10 resize-y"
                    />
                    <p className="text-xs text-muted-foreground">Used as the base prompt for their appearance.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="distinguishing_features">Distinguishing Features</Label>
                    <Textarea
                        id="distinguishing_features"
                        value={physicalTraits.distinguishing_features || ''}
                        onChange={(e) => handleTraitChange('distinguishing_features', e.target.value)}
                        placeholder="Scars, tattoos, accessories..."
                        className="min-h-[80px] bg-secondary/50 border-white/10 resize-y"
                    />
                </div>
            </div>
        </div>
    );
};

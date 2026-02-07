import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { CharacterV2 } from '@/types/character-hub-v2';

interface IdentityTabProps {
    formData: Partial<CharacterV2>;
    updateField: (field: keyof CharacterV2, value: any) => void;
}

export const IdentityTab: React.FC<IdentityTabProps> = ({ formData, updateField }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
                <Label htmlFor="name">Character Name</Label>
                <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="bg-secondary/50 border-white/10 focus:border-primary/50"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                    id="tagline"
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Short description (e.g. A fearless warrior from the future)"
                    className="bg-secondary/50 border-white/10 focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground">Appears on the character card in the hub.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                    value={formData.role || 'ai'}
                    onValueChange={(val) => updateField('role', val)}
                >
                    <SelectTrigger className="bg-secondary/50 border-white/10">
                        <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ai">AI Character (NPC)</SelectItem>
                        <SelectItem value="narrator">Assistant</SelectItem>
                        <SelectItem value="user">User Persona (Avatar)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="bio">Bio & Backstory</Label>
                <Textarea
                    id="bio"
                    value={formData.traits || ''}
                    onChange={(e) => updateField('traits', e.target.value)}
                    placeholder="Detailed backstory, personality quirks, and history..."
                    className="min-h-[150px] bg-secondary/50 border-white/10 focus:border-primary/50 resize-y"
                />
            </div>
        </div>
    );
};

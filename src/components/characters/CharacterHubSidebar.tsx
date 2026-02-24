import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, User, Sparkles, X } from 'lucide-react';
import { CharacterV2, DEFAULT_PERSONALITY_SLIDERS } from '@/types/character-hub-v2';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface CharacterHubSidebarProps {
    character: CharacterV2 | null;
    onClose: () => void;
}

export const CharacterHubSidebar: React.FC<CharacterHubSidebarProps> = ({ character, onClose }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('identity');

    const imageSource = character?.character_anchors?.find(a => a.is_primary)?.image_url || character?.image_url;
    const { signedUrl: signedImageUrl } = useSignedUrl(imageSource);

    if (!character) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-xs font-medium text-muted-foreground">No Character Selected</h3>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Click on a character card to view details
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header with Avatar */}
            <div className="p-4 border-b border-border/50 flex items-start gap-3">
                <div className="relative flex-shrink-0">
                    {signedImageUrl ? (
                        <img
                            src={signedImageUrl}
                            alt={character.name}
                            className="w-12 h-12 rounded-full object-cover border border-border/50"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center border border-border/50">
                            <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold truncate">{character.name}</h2>
                    <p className="text-[10px] text-muted-foreground truncate">{character.description || 'No description'}</p>
                    <div className="flex gap-1 mt-1">
                        <Badge variant="secondary" className="text-[9px] h-4">
                            {character.role === 'ai' ? 'AI Character' : character.role === 'narrator' ? 'Assistant' : 'User Persona'}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-4">
                            {character.content_rating || 'SFW'}
                        </Badge>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-secondary/50 rounded"
                    title="Close"
                >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
            </div>

            {/* Tabs — Identity + Visuals only */}
            <div className="px-3 py-2 border-b border-border/50">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-7 bg-muted/50 p-0.5">
                        <TabsTrigger value="identity" className="text-[10px] h-6">Identity</TabsTrigger>
                        <TabsTrigger value="appearance" className="text-[10px] h-6">Visuals</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'identity' && (
                    <div className="space-y-4">
                        {/* Bio */}
                        <div>
                            <Label className="text-[10px] text-muted-foreground">Bio & Backstory</Label>
                            <p className="text-xs mt-1 text-foreground/80 leading-relaxed">
                                {character.traits || 'No backstory provided.'}
                            </p>
                        </div>

                        {/* Personality Sliders (Read-only display) */}
                        {character.personality_traits && Object.keys(character.personality_traits).length > 0 && (
                            <div className="pt-3 border-t border-border/30">
                                <Label className="text-[10px] text-muted-foreground">Personality</Label>
                                <div className="mt-2 space-y-2">
                                    {DEFAULT_PERSONALITY_SLIDERS.map((slider) => {
                                        const value = (character.personality_traits as any)?.[slider.id] ?? 0;
                                        const percentage = ((value + 100) / 200) * 100;
                                        return (
                                            <div key={slider.id} className="space-y-0.5">
                                                <div className="flex justify-between text-[9px] text-muted-foreground">
                                                    <span>{slider.leftLabel}</span>
                                                    <span>{slider.rightLabel}</span>
                                                </div>
                                                <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary/50 rounded-full transition-all"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Locked Traits */}
                        {character.locked_traits && character.locked_traits.length > 0 && (
                            <div className="pt-3 border-t border-border/30">
                                <Label className="text-[10px] text-muted-foreground">Locked Traits</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {character.locked_traits.map((trait) => (
                                        <Badge key={trait} variant="secondary" className="text-[9px] h-4">
                                            {trait}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Style (collapsed from former tab) */}
                        <div className="pt-3 border-t border-border/30">
                            <Label className="text-[10px] text-muted-foreground">Style Preset</Label>
                            <p className="text-xs mt-1 text-foreground/80">{character.style_preset || 'Realistic'}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-3">
                        <Label className="text-[10px] text-muted-foreground">Anchor Images</Label>
                        {character.character_anchors && character.character_anchors.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {character.character_anchors.map((anchor) => (
                                    <AnchorThumbnail key={anchor.id} anchor={anchor} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-muted-foreground/70">No anchor images uploaded.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-border/50 flex gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-[10px] h-7"
                    onClick={() => navigate(`/character-studio/${character.id}`)}
                >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit in Studio
                </Button>
                <Button
                    size="sm"
                    className="flex-1 text-[10px] h-7"
                    onClick={() => navigate(`/character-studio/${character.id}`)}
                >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate
                </Button>
            </div>
        </div>
    );
};

// Small anchor thumbnail component using useSignedUrl
const AnchorThumbnail: React.FC<{ anchor: { id: string; image_url: string; is_primary: boolean } }> = ({ anchor }) => {
    const { signedUrl } = useSignedUrl(anchor.image_url);

    return (
        <div className={`aspect-square rounded overflow-hidden border ${anchor.is_primary ? 'border-primary ring-1 ring-primary/30' : 'border-border/50'}`}>
            {signedUrl ? (
                <img src={signedUrl} alt="Anchor" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-muted/30" />
            )}
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, FileText, User, Clock } from 'lucide-react';
import { CharacterV2 } from '@/types/character-hub-v2';
import { supabase } from '@/integrations/supabase/client';

interface CharacterCreatePanelProps {
    recentCharacters?: CharacterV2[];
}

// Helper to sign storage URLs
async function getSignedUrl(url: string): Promise<string> {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    const knownBuckets = ['workspace-temp', 'user-library', 'characters', 'reference_images'];
    const parts = url.split('/');
    let bucket = 'characters';
    let path = url;

    if (knownBuckets.includes(parts[0])) {
        bucket = parts[0];
        path = parts.slice(1).join('/');
    }

    try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (error) return url;
        return data.signedUrl;
    } catch {
        return url;
    }
}

export const CharacterCreatePanel: React.FC<CharacterCreatePanelProps> = ({ recentCharacters = [] }) => {
    const navigate = useNavigate();

    return (
        <div className="h-full flex flex-col">
            {/* Create Character Section */}
            <div className="p-4 border-b border-border/50">
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
                    <span className="text-primary">+</span>
                    Create Character
                </h3>

                <div className="grid grid-cols-1 gap-2">
                    {/* Start from Images */}
                    <button
                        onClick={() => navigate('/character-studio-v2?mode=from-images')}
                        className="group p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all text-left"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Layers className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-medium text-foreground">Start from Images</h4>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Best consistency</p>
                            </div>
                        </div>
                    </button>

                    {/* Start from Description */}
                    <button
                        onClick={() => navigate('/character-studio-v2?mode=create')}
                        className="group p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all text-left"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors">
                                <FileText className="w-5 h-5 text-secondary" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-medium text-foreground">Start from Description</h4>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Fastest</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Character History Section */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="sticky top-0 p-3 bg-card/95 backdrop-blur-sm border-b border-border/50 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Character History
                    </h3>
                </div>

                {recentCharacters.length > 0 ? (
                    <div className="p-2 grid grid-cols-3 gap-2">
                        {recentCharacters.slice(0, 9).map((char) => (
                            <CharacterHistoryThumbnail
                                key={char.id}
                                character={char}
                                onClick={() => navigate(`/character-studio-v2/${char.id}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-muted-foreground/70">
                            No recent characters
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Character history thumbnail
const CharacterHistoryThumbnail: React.FC<{
    character: CharacterV2;
    onClick: () => void;
}> = ({ character, onClick }) => {
    const [signedUrl, setSignedUrl] = useState('');

    useEffect(() => {
        const imageSource = character.character_anchors?.find(a => a.is_primary)?.image_url || character.image_url;
        if (imageSource) {
            getSignedUrl(imageSource).then(setSignedUrl);
        }
    }, [character.image_url, character.character_anchors]);

    return (
        <button
            onClick={onClick}
            className="group relative aspect-[3/4] rounded-md overflow-hidden border border-border/50 hover:border-primary/30 transition-colors"
        >
            {signedUrl ? (
                <img
                    src={signedUrl}
                    alt={character.name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground/50" />
                </div>
            )}

            {/* Overlay with name */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                <p className="text-[9px] text-white truncate font-medium">{character.name}</p>
            </div>

            {/* Hover effect */}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
};

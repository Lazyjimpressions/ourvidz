import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CharacterV2, VideoFraming, AspectRatio } from '@/types/character-hub-v2';
import { Video, Smartphone, Monitor, Square, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface MediaTabProps {
    formData: Partial<CharacterV2>;
    updateField: (field: keyof CharacterV2, value: any) => void;
}

export const MediaTab: React.FC<MediaTabProps> = ({ formData, updateField }) => {
    const mediaDefaults = formData.media_defaults || {};

    const handleMediaChange = (key: string, value: any) => {
        updateField('media_defaults', { ...mediaDefaults, [key]: value });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">

            {/* Video Settings Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                    <Video className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Video Generation Defaults</h3>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-3">
                    <Label>Preferred Aspect Ratio</Label>
                    <div className="grid grid-cols-3 gap-3">
                        {['9:16', '16:9', '1:1'].map((ratio) => (
                            <div
                                key={ratio}
                                onClick={() => handleMediaChange('preferred_aspect_ratio', ratio)}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all ${mediaDefaults.preferred_aspect_ratio === ratio
                                        ? 'bg-primary/20 border-primary shadow-[0_0_10px_rgba(37,99,235,0.2)]'
                                        : 'bg-secondary/20 border-white/10 hover:bg-secondary/40'
                                    }`}
                            >
                                {ratio === '9:16' && <Smartphone className="w-5 h-5" />}
                                {ratio === '16:9' && <Monitor className="w-5 h-5" />}
                                {ratio === '1:1' && <Square className="w-5 h-5" />}
                                <span className="text-xs font-medium">{ratio}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Framing Preference */}
                <div className="space-y-2">
                    <Label htmlFor="video-framing">Default Camera Framing</Label>
                    <Select
                        value={mediaDefaults.video_framing || 'portrait'}
                        onValueChange={(val) => handleMediaChange('video_framing', val)}
                    >
                        <SelectTrigger className="bg-secondary/50 border-white/10">
                            <SelectValue placeholder="Select framing" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="portrait">Portrait (Shoulders up)</SelectItem>
                            <SelectItem value="full_body">Full Body</SelectItem>
                            <SelectItem value="action_pose">Action Pose</SelectItem>
                            <SelectItem value="close_up">Extreme Close-up</SelectItem>
                            <SelectItem value="outdoor">Environmental / Outdoor</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Motion Intensity */}
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Label>Motion Intensity</Label>
                        <span className="text-xs text-muted-foreground">{mediaDefaults.motion_intensity || 50}%</span>
                    </div>
                    <Slider
                        value={[mediaDefaults.motion_intensity || 50]}
                        max={100}
                        step={1}
                        onValueChange={(vals) => handleMediaChange('motion_intensity', vals[0])}
                        className="py-2"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                        <span>Subtle</span>
                        <span>Balanced</span>
                        <span>Dynamic</span>
                    </div>
                </div>

                {/* Loop Safe Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-white/5">
                    <div className="space-y-0.5">
                        <Label className="text-sm">Seamless Loop</Label>
                        <p className="text-xs text-muted-foreground">Optimize video for seamless looping playback</p>
                    </div>
                    <Switch
                        checked={mediaDefaults.loop_safe || false}
                        onCheckedChange={(checked) => handleMediaChange('loop_safe', checked)}
                    />
                </div>
            </div>

            {/* Roleplay Behavior Section */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm">Roleplay Behavior</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="roleplay_notes">Behavior Notes</Label>
                    <Textarea
                        id="roleplay_notes"
                        value={formData.scene_behavior_rules || ''}
                        onChange={(e) => updateField('scene_behavior_rules', e.target.value)}
                        placeholder="How should this character behave in roleplay? Any rules or restrictions?"
                        className="min-h-[80px] bg-secondary/50 border-white/10 resize-y"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Guidelines for AI behavior when playing this character.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="forbidden">Forbidden Topics</Label>
                    <Input
                        id="forbidden"
                        value={(formData.forbidden_phrases || []).join(', ')}
                        onChange={(e) => {
                            const phrases = e.target.value
                                .split(',')
                                .map(s => s.trim())
                                .filter(s => s.length > 0);
                            updateField('forbidden_phrases', phrases);
                        }}
                        placeholder="Topics to avoid (comma separated)"
                        className="bg-secondary/50 border-white/10"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Topics or phrases that should never be mentioned.
                    </p>
                </div>
            </div>

        </div>
    );
};

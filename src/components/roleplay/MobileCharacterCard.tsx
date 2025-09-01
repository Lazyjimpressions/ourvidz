import React, { useState } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Eye, Play, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import { supabase } from '@/integrations/supabase/client';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url: string;
  preview_image_url?: string;
  quick_start?: boolean;
  category?: string;
  consistency_method?: string;
  appearance_tags?: string[];
  traits?: string;
  persona?: string;
}

interface MobileCharacterCardProps {
  character: Character;
  onSelect: () => void;
  onPreview: () => void;
}

export const MobileCharacterCard: React.FC<MobileCharacterCardProps> = ({
  character,
  onSelect,
  onPreview
}) => {
  const { isMobile, isTouchDevice } = useMobileDetection();
  const [isPressed, setIsPressed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();



  const handleTouchStart = () => {
    if (isTouchDevice) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    if (isTouchDevice) {
      setIsPressed(false);
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview();
  };



  const generateCharacterImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 Generate Image button clicked for character:', character.name);
    console.log('👤 User authenticated:', !!user);
    
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // Build character prompt from metadata
      const appearanceTags = character.appearance_tags?.join(', ') || '';
      const traits = character.traits || '';
      const persona = character.persona || '';
      
      const characterPrompt = `${character.name}, ${character.description}. ${appearanceTags}. ${traits}. ${persona}. Professional character portrait, high quality, detailed, consistent appearance, studio lighting`;
      
      console.log('📝 Character prompt:', characterPrompt);
      
      // Use queue-job for simple image generation
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: characterPrompt,
          job_type: 'sdxl_image_fast',
          metadata: {
            destination: 'character_portrait',
            character_id: character.id,
            character_name: character.name,
            update_character_image: true
          }
        }
      });

      console.log('📡 Queue job response:', { data, error });

      if (error) {
        console.error('❌ Queue job error:', error);
        throw error;
      }

      console.log('✅ Queue job successful:', data);

      toast({
        title: "Image Generation Started",
        description: `Generating portrait for ${character.name}...`,
      });
      
    } catch (error) {
      console.error('❌ Error generating character image:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate character image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const imageUrl = character.preview_image_url || character.image_url;

  return (
    <div 
      className={`
        relative group cursor-pointer
        ${isMobile ? 'aspect-square' : 'aspect-[4/5]'}
        rounded-lg overflow-hidden
        bg-card border border-border
        transition-all duration-200
        hover:shadow-lg hover:scale-[1.02]
        ${isTouchDevice ? 'touch-manipulation' : ''}
        ${isPressed ? 'scale-[0.98] shadow-inner' : ''}
        ${character.quick_start ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
      `}
      onClick={onSelect}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
    >
      {/* Character Image */}
      <div className="relative w-full h-full">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={character.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No Image</p>
            </div>
          </div>
        )}
        
        {/* Quick Start Badge */}
        {character.quick_start && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            Quick Start
          </div>
        )}

        {/* Consistency Method Badge */}
        {character.consistency_method && (
          <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            {character.consistency_method === 'i2i_reference' ? '70%' : 
             character.consistency_method === 'ip_adapter' ? '90%' : '40%'}
          </div>
        )}

        {/* Generate Image Button - Always visible for testing with mobile improvements */}
        <div 
          className="absolute inset-0 bg-black/20 flex items-center justify-center z-20 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={generateCharacterImage}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Image
              </>
            )}
          </Button>
        </div>
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <h3 className="text-white font-semibold">{character.name}</h3>
            <p className="text-white/80 text-sm line-clamp-2">{character.description}</p>
          </div>
          
          {/* Action Buttons */}
          <div 
            className={`absolute top-2 right-2 flex gap-1 transition-opacity pointer-events-auto ${
              isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              onClick={handlePreview}
              size="sm"
              variant="secondary"
              className="w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white"
            >
              <Eye className="w-3 h-3" />
            </Button>
            
            {/* Generate Image Button (when image exists) */}
            {imageUrl && user && (
              <Button
                onClick={generateCharacterImage}
                disabled={isGenerating}
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                title="Regenerate Image"
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

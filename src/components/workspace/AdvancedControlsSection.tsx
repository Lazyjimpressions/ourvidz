
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagesQuantityButton } from './ImagesQuantityButton';

interface AdvancedControlsSectionProps {
  mode: 'image' | 'video';
  motionIntensity?: 'low' | 'medium' | 'high';
  onMotionClick?: () => void;
  layout: 'mobile' | 'desktop';
  numImages?: number;
  setNumImages?: (count: number) => void;
}

export const AdvancedControlsSection = ({
  mode,
  motionIntensity = 'medium',
  onMotionClick,
  layout,
  numImages = 1,
  setNumImages
}: AdvancedControlsSectionProps) => {
  if (mode === 'image') {
    return (
      <div className={`flex items-center gap-3 ${layout === 'mobile' ? 'flex-wrap' : ''}`}>
        <Select defaultValue="16:9">
          <SelectTrigger className="bg-transparent border-gray-600 text-white text-sm h-8 w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="bg-transparent border-gray-600 text-white text-sm h-8 w-20">
            <SelectValue placeholder="Shot" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="close-up">Close-up</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="wide">Wide</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="bg-transparent border-gray-600 text-white text-sm h-8 w-20">
            <SelectValue placeholder="Angle" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="side">Side</SelectItem>
            <SelectItem value="back">Back</SelectItem>
            <SelectItem value="overhead">Overhead</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="bg-transparent border-gray-600 text-white text-sm h-8 w-20">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="realistic">Realistic</SelectItem>
            <SelectItem value="artistic">Artistic</SelectItem>
            <SelectItem value="cartoon">Cartoon</SelectItem>
            <SelectItem value="cinematic">Cinematic</SelectItem>
          </SelectContent>
        </Select>

        {/* Images Quantity Button - Only for image mode */}
        {setNumImages && (
          <ImagesQuantityButton 
            numImages={numImages}
            onQuantityChange={setNumImages}
            layout={layout}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${layout === 'mobile' ? 'flex-wrap' : ''}`}>
      <Select defaultValue="16:9">
        <SelectTrigger className="bg-transparent border-gray-600 text-white text-sm h-8 w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          <SelectItem value="16:9">16:9</SelectItem>
          <SelectItem value="4:3">4:3</SelectItem>
          <SelectItem value="1:1">1:1</SelectItem>
          <SelectItem value="9:16">9:16</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="5s">
        <SelectTrigger className="bg-transparent border-gray-600 text-white text-sm h-8 w-12">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          <SelectItem value="3s">3s</SelectItem>
          <SelectItem value="5s">5s</SelectItem>
          <SelectItem value="10s">10s</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="medium">
        <SelectTrigger className="bg-transparent border-gray-600 text-white text-sm h-8 w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

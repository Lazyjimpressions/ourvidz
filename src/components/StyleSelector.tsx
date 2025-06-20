
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface StyleSelectorProps {
  mode: "character" | "general";
  selectedStyles: string[];
  onStylesChange: (styles: string[]) => void;
}

const artStyles = [
  "photorealistic",
  "digital art",
  "concept art",
  "anime style",
  "oil painting",
  "watercolor",
  "sketch",
  "cyberpunk",
  "fantasy art",
  "minimalist"
];

const characterStyles = [
  "portrait",
  "full body",
  "action pose",
  "character sheet",
  "multiple angles",
  "expression study",
  "outfit design",
  "fantasy character",
  "sci-fi character",
  "realistic human"
];

const lightingOptions = [
  "golden hour",
  "studio lighting",
  "dramatic shadows",
  "soft lighting",
  "neon lighting",
  "natural light",
  "cinematic lighting",
  "rim lighting"
];

const qualityModifiers = [
  "8K resolution",
  "ultra detailed",
  "masterpiece",
  "trending on artstation",
  "professional",
  "award winning"
];

export const StyleSelector = ({ mode, selectedStyles, onStylesChange }: StyleSelectorProps) => {
  const [activeCategory, setActiveCategory] = useState("art");

  const toggleStyle = (style: string) => {
    const updatedStyles = selectedStyles.includes(style)
      ? selectedStyles.filter(s => s !== style)
      : [...selectedStyles, style];
    onStylesChange(updatedStyles);
  };

  const clearStyles = () => {
    onStylesChange([]);
  };

  const getStyleOptions = () => {
    switch (activeCategory) {
      case "art":
        return mode === "character" ? characterStyles : artStyles;
      case "lighting":
        return lightingOptions;
      case "quality":
        return qualityModifiers;
      default:
        return artStyles;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Style & Enhancement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={activeCategory === "art" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("art")}
          >
            Style
          </Button>
          <Button
            variant={activeCategory === "lighting" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("lighting")}
          >
            Lighting
          </Button>
          <Button
            variant={activeCategory === "quality" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("quality")}
          >
            Quality
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-600">
              Selected ({selectedStyles.length})
            </Label>
            {selectedStyles.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearStyles}>
                Clear All
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-gray-50">
            {selectedStyles.length === 0 ? (
              <span className="text-sm text-gray-400">No styles selected</span>
            ) : (
              selectedStyles.map((style) => (
                <Badge
                  key={style}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100"
                  onClick={() => toggleStyle(style)}
                >
                  {style} ×
                </Badge>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {getStyleOptions().map((style) => (
            <Button
              key={style}
              variant={selectedStyles.includes(style) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStyle(style)}
              className="text-xs justify-start h-8"
            >
              {style}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

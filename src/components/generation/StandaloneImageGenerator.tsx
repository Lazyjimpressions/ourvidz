
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BaseImageGenerator } from "./BaseImageGenerator";
import { GenerationContext } from "@/lib/services/ImageGenerationService";
import { Image } from "lucide-react";

interface StandaloneImageGeneratorProps {
  onImagesGenerated: (images: any[]) => void;
}

export const StandaloneImageGenerator = ({ onImagesGenerated }: StandaloneImageGeneratorProps) => {
  const context: GenerationContext = {
    mode: 'standalone'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Generate Standalone Image
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BaseImageGenerator
          context={context}
          onImageGenerated={onImagesGenerated}
          buttonText="Generate Standalone Image"
        />
      </CardContent>
    </Card>
  );
};

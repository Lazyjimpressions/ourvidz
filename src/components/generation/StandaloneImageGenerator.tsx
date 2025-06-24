
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BaseImageGenerator } from "./BaseImageGenerator";
import { Image } from "lucide-react";

interface StandaloneImageGeneratorProps {
  onImagesGenerated: (images: any[]) => void;
}

export const StandaloneImageGenerator = ({ onImagesGenerated }: StandaloneImageGeneratorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Generate Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BaseImageGenerator
          onImageGenerated={onImagesGenerated}
          buttonText="Generate Content"
        />
      </CardContent>
    </Card>
  );
};


import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GenerationFormat, GenerationQuality } from "@/types/generation";

interface GenerationOptionsProps {
  selectedFormat: GenerationFormat;
  selectedQuality: GenerationQuality;
  onFormatChange: (format: GenerationFormat) => void;
  onQualityChange: (quality: GenerationQuality) => void;
}

export const GenerationOptions = ({
  selectedFormat,
  selectedQuality,
  onFormatChange,
  onQualityChange,
}: GenerationOptionsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="format">Format</Label>
        <Select value={selectedFormat} onValueChange={onFormatChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quality">Quality</Label>
        <Select value={selectedQuality} onValueChange={onQualityChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fast">Fast</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

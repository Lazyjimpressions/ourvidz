
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Coins } from "lucide-react";

interface VideoConfigurationProps {
  onConfigurationComplete: (config: VideoConfig) => void;
}

export interface VideoConfig {
  duration: number;
  sceneCount: number;
  estimatedCost: number;
}

export const VideoConfiguration = ({ onConfigurationComplete }: VideoConfigurationProps) => {
  const [duration, setDuration] = useState<number>(15);

  const getSceneCount = (duration: number) => {
    return duration === 15 ? 3 : 6; // 5 seconds per scene
  };

  const getEstimatedCost = (duration: number) => {
    const sceneCount = getSceneCount(duration);
    return sceneCount * 15; // 15 tokens per scene
  };

  const handleContinue = () => {
    const config: VideoConfig = {
      duration,
      sceneCount: getSceneCount(duration),
      estimatedCost: getEstimatedCost(duration),
    };
    onConfigurationComplete(config);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="duration">Video Duration</Label>
          <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 seconds (3 scenes)</SelectItem>
              <SelectItem value="30">30 seconds (6 scenes)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium">{getSceneCount(duration)} scenes</div>
              <div className="text-sm text-gray-600">5 seconds each</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">{getEstimatedCost(duration)} tokens</div>
              <div className="text-sm text-gray-600">Estimated cost</div>
            </div>
          </div>
        </div>

        <Button onClick={handleContinue} className="w-full">
          Continue to Character Setup
        </Button>
      </CardContent>
    </Card>
  );
};

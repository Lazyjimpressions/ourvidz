
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, Zap, CheckCircle, XCircle } from "lucide-react";

interface GenerationProgressIndicatorProps {
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed';
  progress?: number;
  estimatedTime?: number;
  startTime?: Date;
}

export const GenerationProgressIndicator = ({ 
  status, 
  progress, 
  estimatedTime,
  startTime 
}: GenerationProgressIndicatorProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'queued':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: "Queued for processing...",
          color: "text-yellow-400",
          progress: 10
        };
      case 'processing':
        return {
          icon: <Zap className="w-4 h-4 animate-pulse" />,
          text: "Generating your content...",
          color: "text-blue-400",
          progress: progress || 50
        };
      case 'uploading':
        return {
          icon: <Upload className="w-4 h-4 animate-bounce" />,
          text: "Uploading and finalizing...",
          color: "text-green-400",
          progress: 85
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: "Generation complete!",
          color: "text-green-500",
          progress: 100
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4" />,
          text: "Generation failed",
          color: "text-red-500",
          progress: 0
        };
      default:
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: "Processing...",
          color: "text-gray-400",
          progress: 25
        };
    }
  };

  const getElapsedTime = () => {
    if (!startTime) return null;
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    return elapsed;
  };

  const getEstimatedRemaining = () => {
    if (!estimatedTime || !startTime) return null;
    const elapsed = getElapsedTime();
    const remaining = Math.max(0, estimatedTime - (elapsed || 0));
    return remaining;
  };

  const config = getStatusConfig();
  const elapsed = getElapsedTime();
  const remaining = getEstimatedRemaining();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={config.color}>{config.icon}</span>
        <span className="text-sm text-gray-300">{config.text}</span>
      </div>
      
      <Progress value={config.progress} className="h-2" />
      
      <div className="flex justify-between text-xs text-gray-400">
        <span>{elapsed ? `${elapsed}s elapsed` : ''}</span>
        <span>
          {remaining ? `~${remaining}s remaining` : 
           estimatedTime && status === 'queued' ? `~${estimatedTime}s estimated` : ''}
        </span>
      </div>
    </div>
  );
};

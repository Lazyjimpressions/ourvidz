
import { ArrowLeft, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PromptRefiner } from "@/components/PromptRefiner";
import { PreviewImageGenerator } from "@/components/PreviewImageGenerator";
import { VideoGenerationStep } from "@/components/VideoGenerationStep";
import { PortalLayout } from "@/components/PortalLayout";

interface CreateVideoForm {
  prompt: string;
  style: string;
  image?: File;
}

const CreateVideo = () => {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'prompt' | 'refine' | 'preview' | 'generate'>('prompt');
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  
  const form = useForm<CreateVideoForm>({
    defaultValues: {
      prompt: "",
      style: "animated",
    },
  });

  const promptValue = form.watch("prompt");

  const handleRefinedPromptApproved = (refined: string) => {
    setRefinedPrompt(refined);
    setCurrentStep('preview');
  };

  const handleImageSelected = (imageId: string) => {
    setSelectedImageId(imageId);
    setCurrentStep('generate');
  };

  const handleVideoGenerated = () => {
    toast.success("Your video has been generated and saved.");
    navigate("/library");
  };

  const handleVideoGenerationError = (error: any) => {
    console.error('Video generation error:', error);
    
    if (error.name === 'AbortError') {
      setApiError("Request timed out. The server might be busy or unreachable.");
    } else if (error.message?.includes('Failed to fetch')) {
      setApiError("Cannot connect to the video generation server. Please check your connection.");
    } else {
      setApiError(error.message || "Something went wrong. Please try again later.");
    }
    
    toast.error("Video generation failed");
  };

  const currentPrompt = refinedPrompt || promptValue;

  return (
    <PortalLayout title="Create a New Video">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {apiError && (
            <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
              <AlertDescription>
                {apiError}
                <div className="mt-2 text-sm">
                  The video generation service might be temporarily unavailable. You can try again in a few minutes.
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card className="p-6">
            <Form {...form}>
              <form className="space-y-6">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your video..."
                          className="min-h-[120px] resize-none rounded-lg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {promptValue.trim() && (
                  <PromptRefiner
                    originalPrompt={promptValue}
                    onRefinedPromptApproved={handleRefinedPromptApproved}
                  />
                )}

                {currentStep === 'preview' && (
                  <PreviewImageGenerator
                    prompt={currentPrompt}
                    onImageSelected={handleImageSelected}
                  />
                )}

                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Style</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Select a style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="animated">Animated</SelectItem>
                          <SelectItem value="realistic">Realistic</SelectItem>
                          <SelectItem value="surreal">Surreal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Reference Image (Optional)</FormLabel>
                      <FormControl>
                        <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
                          <label className="flex flex-col items-center gap-2 cursor-pointer">
                            <Upload className="h-8 w-8 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Click to upload or drag and drop
                            </span>
                            <span className="text-xs text-gray-500">
                              PNG, JPG up to 10MB
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".jpg,.jpeg,.png"
                              onChange={(e) =>
                                onChange(e.target.files ? e.target.files[0] : null)
                              }
                              {...field}
                            />
                          </label>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {currentStep === 'generate' && (
                  <VideoGenerationStep
                    selectedImageId={selectedImageId}
                    prompt={currentPrompt}
                    onVideoGenerated={handleVideoGenerated}
                  />
                )}

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="rounded-lg"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
};

export default CreateVideo;

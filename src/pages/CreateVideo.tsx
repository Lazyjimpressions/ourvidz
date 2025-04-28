import { ArrowLeft, Upload, Home, Video, DollarSign, Settings, UserRound } from "lucide-react";
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
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useForm } from "react-hook-form";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateVideoForm {
  prompt: string;
  style: string;
  image?: File;
}

const CreateVideo = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const form = useForm<CreateVideoForm>({
    defaultValues: {
      prompt: "",
      style: "animated",
    },
  });

  const onSubmit = async (data: CreateVideoForm) => {
    setIsGenerating(true);
    setApiError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('http://213.173.110.38/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: data.prompt,
          num_frames: 24,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
      }

      await response.json();
      toast.success("Your video has been generated and saved.");
      navigate("/library");
    } catch (error) {
      console.error('Video generation error:', error);
      
      if (error.name === 'AbortError') {
        setApiError("Request timed out. The server might be busy or unreachable.");
      } else if (error.message?.includes('Failed to fetch')) {
        setApiError("Cannot connect to the video generation server. Please check your connection.");
      } else {
        setApiError(error.message || "Something went wrong. Please try again later.");
      }
      
      toast.error("Video generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-white">
        <Sidebar>
          <SidebarHeader>
            <div className="p-4">
              <h2 className="font-semibold">VideoAI</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <a href="/dashboard">
                    <Home />
                    <span>Home</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="My Videos">
                  <a href="/library">
                    <Video />
                    <span>My Videos</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Pricing">
                  <a href="/pricing">
                    <DollarSign />
                    <span>Pricing</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <a href="/settings">
                    <Settings />
                    <span>Settings</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Profile">
                  <a href="/profile">
                    <UserRound />
                    <span>Profile</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-gray-100 bg-white px-4 flex items-center justify-between">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Balance: <span className="font-medium">100 tokens</span>
              </div>
            </div>
          </header>

          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/dashboard")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h1 className="text-3xl font-semibold">Create a New Video</h1>
                </div>
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="prompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prompt</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your video..."
                              className="min-h-[120px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              <SelectTrigger>
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

                    <div className="flex justify-end gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/dashboard")}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary hover:bg-primary/90"
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <LoadingSpinner className="mr-2" />
                            Generating your video...
                          </>
                        ) : (
                          "Generate Video"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CreateVideo;

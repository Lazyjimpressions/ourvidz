
import { ArrowLeft, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface CreateVideoForm {
  prompt: string;
  style: string;
  image?: File;
}

const CreateVideo = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<CreateVideoForm>({
    defaultValues: {
      prompt: "",
      style: "animated",
    },
  });

  const onSubmit = async (data: CreateVideoForm) => {
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      navigate("/library");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header with back button */}
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
          <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border">
            Tokens Remaining: 5,250
          </div>
        </div>

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
  );
};

export default CreateVideo;

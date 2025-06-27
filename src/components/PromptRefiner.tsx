
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Edit, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PromptRefinerProps {
  originalPrompt: string;
  onRefinedPromptApproved: (refinedPrompt: string) => void;
}

export const PromptRefiner = ({ originalPrompt, onRefinedPromptApproved }: PromptRefinerProps) => {
  const [isRefining, setIsRefining] = useState(false);
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");

  const handleRefinePrompt = async () => {
    if (!originalPrompt.trim()) return;
    
    setIsRefining(true);
    
    try {
      // Simulate AI refinement - in real app, this would call your AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const refined = `Enhanced: ${originalPrompt} with cinematic lighting, high detail, professional composition, and photorealistic quality`;
      setRefinedPrompt(refined);
      setEditedPrompt(refined);
    } catch (error) {
      console.error('Error refining prompt:', error);
    } finally {
      setIsRefining(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setRefinedPrompt(editedPrompt);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedPrompt(refinedPrompt);
    setIsEditing(false);
  };

  const handleApprove = () => {
    onRefinedPromptApproved(refinedPrompt);
  };

  const handleReset = () => {
    setRefinedPrompt("");
    setEditedPrompt("");
    setIsEditing(false);
  };

  if (!originalPrompt.trim()) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Prompt Refiner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Original Prompt:</p>
          <p className="text-sm text-gray-600">{originalPrompt}</p>
        </div>

        {!refinedPrompt && (
          <Button
            onClick={handleRefinePrompt}
            disabled={isRefining}
            className="w-full"
            variant="outline"
          >
            {isRefining ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Refining with AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Refine Prompt with AI
              </>
            )}
          </Button>
        )}

        {refinedPrompt && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">AI Refined Prompt</label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-gray-600 hover:text-gray-700"
                >
                  Reset
                </Button>
              </div>
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                  placeholder="Edit your refined prompt..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save Changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">{refinedPrompt}</p>
              </div>
            )}

            {!isEditing && (
              <Button
                onClick={handleApprove}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Use Refined Prompt
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

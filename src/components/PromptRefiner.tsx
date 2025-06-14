
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
    
    // Simulate AI refinement - in real app, this would call your AI service
    setTimeout(() => {
      const refined = `Enhanced: ${originalPrompt} with cinematic lighting, high detail, and professional composition`;
      setRefinedPrompt(refined);
      setEditedPrompt(refined);
      setIsRefining(false);
    }, 2000);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setRefinedPrompt(editedPrompt);
    setIsEditing(false);
  };

  const handleApprove = () => {
    onRefinedPromptApproved(refinedPrompt);
  };

  if (!originalPrompt.trim()) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleRefinePrompt}
        disabled={isRefining || Boolean(refinedPrompt)}
        className="w-full sm:w-auto"
      >
        {isRefining ? (
          <>
            <LoadingSpinner className="mr-2" size="sm" />
            Refining Prompt...
          </>
        ) : (
          "Refine Prompt"
        )}
      </Button>

      {refinedPrompt && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">AI Refined Prompt</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="min-h-[100px] resize-none rounded-lg"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-700">{refinedPrompt}</p>
            </div>
          )}

          {!isEditing && (
            <Button
              type="button"
              onClick={handleApprove}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Approve Refined Prompt
            </Button>
          )}
        </div>
      )}
    </div>
  );
};


import { Button } from "@/components/ui/button";
import { ArrowLeft, User, LogOut, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceHeaderProps {
  onClearWorkspace?: () => void;
  onDismissAllJobs?: () => void;
}

export const WorkspaceHeader = ({ onClearWorkspace, onDismissAllJobs }: WorkspaceHeaderProps) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAll = async () => {
    // Implement proper delete all functionality
    if (onClearWorkspace) {
      await onClearWorkspace();
    }
    if (onDismissAllJobs) {
      await onDismissAllJobs();
    }
  };

  return (
    <header className="fixed top-0 w-full pt-safe-top bg-black/80 backdrop-blur-sm border-b border-gray-800 z-50">
      <div className="flex items-center justify-between h-12 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          {user && (
            <>
              <span className="text-xs text-gray-400 hidden sm:block">
                {profile?.username || user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismissAllJobs}
                className="gap-1 text-gray-300 hover:text-white hover:bg-gray-800 h-8 px-2"
                title="Dismiss all jobs from workspace"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Dismiss All</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteAll}
                className="gap-1 text-gray-300 hover:text-white hover:bg-gray-800 h-8 px-2"
                title="Delete all workspace items permanently"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Delete All</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="gap-1 text-gray-300 hover:text-white hover:bg-gray-800 h-8 px-2"
              >
                <User className="h-3 w-3" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-1 text-gray-300 hover:text-white hover:bg-gray-800 h-8 px-2"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

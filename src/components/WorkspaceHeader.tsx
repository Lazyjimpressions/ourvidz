
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, LogOut, RotateCcw, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceCleanup } from "@/hooks/useWorkspaceCleanup";
import { useState } from "react";

interface WorkspaceHeaderProps {
  onClearWorkspace?: () => void;
  onDismissAllJobs?: () => void;
  onDeleteAllWorkspace?: () => void;
  showForceCleanup?: boolean;
}

export const WorkspaceHeader = ({ onClearWorkspace, onDismissAllJobs, onDeleteAllWorkspace, showForceCleanup }: WorkspaceHeaderProps) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { forceClearWorkspace } = useWorkspaceCleanup();
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleClearWorkspace = async () => {
    if (!onClearWorkspace || isClearing) return;
    setIsClearing(true);
    try {
      await onClearWorkspace();
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!onDeleteAllWorkspace || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteAllWorkspace();
    } finally {
      setIsDeleting(false);
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
              {onClearWorkspace && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearWorkspace}
                  disabled={isClearing}
                  className="gap-1 text-gray-300 hover:text-white hover:bg-gray-800 h-8 px-2 disabled:opacity-50"
                  title="Clear all (save to library & remove)"
                >
                  {isClearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  <span className="hidden sm:inline">{isClearing ? 'Clearing...' : 'Clear'}</span>
                </Button>
              )}
              {showForceCleanup && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={forceClearWorkspace}
                  className="gap-1 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 h-8 px-2"
                  title="Force clear all items including failed jobs"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden sm:inline">Force Clear</span>
                </Button>
              )}
              {onDeleteAllWorkspace && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="gap-1 text-gray-300 hover:text-white hover:bg-gray-800 h-8 px-2 disabled:opacity-50"
                  title="Delete all workspace items permanently"
                >
                  {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  <span className="hidden sm:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
                </Button>
              )}
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

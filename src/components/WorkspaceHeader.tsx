
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const WorkspaceHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-medium text-white">Gen Space</h1>
      </div>
      
      <Button
        variant="outline"
        className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
      >
        Upgrade
      </Button>
    </div>
  );
};

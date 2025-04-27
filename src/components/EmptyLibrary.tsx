
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const EmptyLibrary = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16">
      <h2 className="text-xl font-semibold mb-4">No videos yet</h2>
      <p className="text-gray-600 mb-8">
        Start by creating your first video!
      </p>
      <Button
        onClick={() => navigate("/create-video")}
        className="bg-primary hover:bg-primary/90"
      >
        Create New Video
      </Button>
    </div>
  );
};

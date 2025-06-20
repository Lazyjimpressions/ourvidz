
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import { Shield } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, userRoles, isAdmin } = useAuth();
  
  return (
    <PortalLayout>
      <div className="p-6">
        <h1 className="text-3xl font-semibold mb-2">
          Welcome back{profile?.username ? `, ${profile.username}` : ''}!
          {isAdmin && <span className="text-red-600 ml-2">(Admin)</span>}
        </h1>
        <p className="text-gray-600 mb-8">What do you want to do today?</p>
        
        {isAdmin && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-medium text-red-800 mb-2">Admin Status</h3>
            <div className="text-sm text-red-700">
              <p>You have administrator privileges.</p>
              <p>Roles: {userRoles.map(role => role.role).join(', ')}</p>
              <p>User ID: {user?.id}</p>
            </div>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="group hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate("/create-video")}
          >
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">Create a New Video</h2>
              <p className="text-gray-600">Turn your text into engaging AI-generated videos</p>
            </CardContent>
          </Card>

          <Card 
            className="group hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate("/library")}
          >
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">View Your Videos</h2>
              <p className="text-gray-600">Browse and manage your video library</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
};

export default Dashboard;

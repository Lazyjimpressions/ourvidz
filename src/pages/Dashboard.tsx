
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { PortalLayout } from "@/components/PortalLayout";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isSubscribed } = useAuth();
  
  return (
    <PortalLayout>
      <div className="p-6">
        <h1 className="text-3xl font-semibold mb-2">
          Welcome back{profile?.username ? `, ${profile.username}` : ''}!
        </h1>
        <p className="text-gray-600 mb-8">What do you want to do today?</p>
        
        {!isSubscribed && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">No Active Subscription</h3>
            <div className="text-sm text-yellow-700">
              <p>You need an active subscription to create videos.</p>
              <p>Current status: {profile?.subscription_status || 'inactive'}</p>
              <p>Credits: {profile?.token_balance || 0}</p>
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

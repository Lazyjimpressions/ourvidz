
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import { Video, Image, Play, Palette } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isSubscribed } = useAuth();
  
  return (
    <PortalLayout>
      <div className="p-6">
        <h1 className="text-3xl font-semibold mb-2">
          Welcome back{profile?.username ? `, ${profile.username}` : ''}!
        </h1>
        <p className="text-gray-600 mb-8">What do you want to create today?</p>
        
        {!isSubscribed && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">No Active Subscription</h3>
            <div className="text-sm text-yellow-700">
              <p>You need an active subscription to create videos and images.</p>
              <p>Current status: {profile?.subscription_status || 'inactive'}</p>
              <p>Credits: {profile?.token_balance || 0}</p>
            </div>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="group hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate("/create-video")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">Create Video</h2>
              </div>
              <p className="text-gray-600 mb-4">Turn your text into engaging AI-generated videos</p>
              <div className="flex items-center text-sm text-blue-600 font-medium">
                <Play className="h-4 w-4 mr-1" />
                Start Creating
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate("/image-creation")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Image className="h-6 w-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold">Image Studio</h2>
              </div>
              <p className="text-gray-600 mb-4">Create characters and images with AI-powered enhancement</p>
              <div className="flex items-center text-sm text-purple-600 font-medium">
                <Palette className="h-4 w-4 mr-1" />
                Design Now
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group hover:border-primary/50 transition-colors cursor-pointer md:col-span-2 lg:col-span-1"
            onClick={() => navigate("/library")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Video className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">My Library</h2>
              </div>
              <p className="text-gray-600 mb-4">Browse and manage your videos and images</p>
              <div className="flex items-center text-sm text-green-600 font-medium">
                View Library →
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">Character Design</h3>
              <p className="text-sm text-gray-600 mb-3">Create detailed character designs for your stories</p>
              <button 
                onClick={() => navigate("/image-creation")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Start designing →
              </button>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">Video Production</h3>
              <p className="text-sm text-gray-600 mb-3">Transform scripts into professional videos</p>
              <button 
                onClick={() => navigate("/create-video")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Create video →
              </button>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
};

export default Dashboard;

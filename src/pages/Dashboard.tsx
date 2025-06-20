import { DollarSign, Home, Settings, Video, UserRound, LogOut, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, userRoles, isAdmin, signOut, session } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-white">
        <Sidebar>
          <SidebarHeader>
            <div className="p-4">
              <h2 className="font-semibold">VideoAI</h2>
              {user && (
                <div className="mt-1">
                  <p className="text-sm text-gray-600">
                    {profile?.username || user.email}
                  </p>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full mt-1">
                      <Shield className="h-3 w-3" />
                      Admin Access
                    </span>
                  )}
                </div>
              )}
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <Link to="/dashboard">
                    <Home />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="My Videos">
                  <Link to="/library">
                    <Video />
                    <span>My Videos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Pricing">
                  <Link to="/pricing">
                    <DollarSign />
                    <span>Pricing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Profile">
                  <Link to="/profile">
                    <UserRound />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
                  <LogOut />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-gray-100 bg-white px-4 flex items-center justify-between">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Balance: <span className="font-medium">{profile?.token_balance || 0} tokens</span>
              </div>
              <div className="text-sm text-gray-600">
                Plan: <span className="font-medium capitalize">{profile?.subscription_status || 'free'}</span>
              </div>
              {session && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Session Active
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 p-6">
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;


import { LogOut, Home, Video, DollarSign, Settings, UserRound, Shield, Clock } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";

interface PortalLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const PortalLayout = ({ children, title }: PortalLayoutProps) => {
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
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              {title && <h1 className="text-lg font-medium">{title}</h1>}
            </div>
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
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  <Shield className="h-3 w-3" />
                  Admin
                </span>
              )}
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

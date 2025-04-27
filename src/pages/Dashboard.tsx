import { DollarSign, Home, Settings, Video } from "lucide-react";
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
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-white">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <div className="p-4">
              <h2 className="font-semibold">VideoAI</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <a href="/dashboard">
                    <Home />
                    <span>Home</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="My Videos">
                  <a href="/dashboard/videos">
                    <Video />
                    <span>My Videos</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Pricing">
                  <a href="/dashboard/pricing">
                    <DollarSign />
                    <span>Pricing</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <a href="/dashboard/settings">
                    <Settings />
                    <span>Settings</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Navigation */}
          <header className="h-16 border-b border-gray-100 bg-white px-4 flex items-center justify-between">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Balance: <span className="font-medium">100 tokens</span>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 p-6">
            <h1 className="text-3xl font-semibold mb-8">What do you want to do?</h1>
            
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

              <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-2">Get Help Crafting a Prompt</h2>
                  <p className="text-gray-600">Learn how to write effective prompts for better results</p>
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

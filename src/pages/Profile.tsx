import { CalendarDays, CreditCard, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
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
import { DollarSign, Home, Settings, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

const mockBillingHistory = [
  {
    date: "2025-04-26",
    plan: "Premium Plan",
    tokens: 1000,
    amount: 49.99,
  },
  {
    date: "2025-03-26",
    plan: "Basic Plan",
    tokens: 500,
    amount: 29.99,
  },
  {
    date: "2025-02-26",
    plan: "Premium Plan",
    tokens: 1000,
    amount: 49.99,
  },
];

const Profile = () => {
  const navigate = useNavigate();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-white">
        {/* Reuse the sidebar from Dashboard */}
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
                  <a href="/library">
                    <Video />
                    <span>My Videos</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Pricing">
                  <a href="/pricing">
                    <DollarSign />
                    <span>Pricing</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <a href="/settings">
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

          {/* Profile Content */}
          <main className="flex-1 p-6">
            <h1 className="text-3xl font-semibold mb-8">My Profile</h1>
            
            <div className="grid gap-6">
              {/* Account Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">user@example.com</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Member Since</label>
                      <p className="text-gray-900">April 1, 2025</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Token Usage Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Token Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tokens Remaining</p>
                      <p className="text-4xl font-semibold text-primary mt-1">100</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Tokens Used</p>
                      <p className="text-4xl font-semibold text-gray-600 mt-1">2,500</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing History Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Billing History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end mb-4">
                    <Button variant="outline">
                      Manage Subscription
                    </Button>
                  </div>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Purchase Date</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Tokens</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockBillingHistory.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                            <TableCell>{item.plan}</TableCell>
                            <TableCell>{item.tokens.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              ${item.amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Profile;

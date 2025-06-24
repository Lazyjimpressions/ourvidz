
import { CalendarDays, CreditCard, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";

const mockBillingHistory = [
  {
    date: "2025-04-26",
    plan: "Creator Plan",
    credits: 60,
    amount: 39.99,
  },
  {
    date: "2025-03-26",
    plan: "Pro Plan", 
    credits: 25,
    amount: 19.99,
  },
  {
    date: "2025-02-26",
    plan: "Starter Plan",
    credits: 10,
    amount: 9.99,
  },
];

const Profile = () => {
  const { user, profile } = useAuth();

  return (
    <OurVidzDashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>
          
          <div className="grid gap-6">
            {/* Account Info Card */}
            <Card className="bg-[#111111] border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="h-5 w-5 text-blue-500" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Email</label>
                    <p className="text-gray-100">{user?.email || 'Not available'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Username</label>
                    <p className="text-gray-100">{profile?.username || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Member Since</label>
                    <p className="text-gray-100">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Usage Card */}
            <Card className="bg-[#111111] border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CalendarDays className="h-5 w-5 text-blue-500" />
                  Credit Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Credits Remaining</p>
                    <p className="text-4xl font-semibold text-blue-500 mt-1">{profile?.token_balance || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Subscription Status</p>
                    <p className="text-4xl font-semibold text-gray-300 mt-1 capitalize">
                      {profile?.subscription_status || 'inactive'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing History Card */}
            <Card className="bg-[#111111] border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  Billing History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button 
                    variant="outline" 
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    Manage Subscription
                  </Button>
                </div>
                <div className="rounded-lg border border-gray-800 bg-[#0a0a0a]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-gray-900">
                        <TableHead className="text-gray-400">Purchase Date</TableHead>
                        <TableHead className="text-gray-400">Plan</TableHead>
                        <TableHead className="text-gray-400">Credits</TableHead>
                        <TableHead className="text-right text-gray-400">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockBillingHistory.map((item, index) => (
                        <TableRow key={index} className="border-gray-800 hover:bg-gray-900">
                          <TableCell className="text-gray-300">{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-gray-300">{item.plan}</TableCell>
                          <TableCell className="text-gray-300">{item.credits.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-gray-300">
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
        </div>
      </div>
    </OurVidzDashboardLayout>
  );
};

export default Profile;


import { CalendarDays, CreditCard, User, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { PortalLayout } from "@/components/PortalLayout";

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
  const { user, profile, userRoles, isAdmin } = useAuth();

  return (
    <PortalLayout title="My Profile">
      <div className="p-6">
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
                  <p className="text-gray-900">{user?.email || 'Not available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Username</label>
                  <p className="text-gray-900">{profile?.username || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Member Since</label>
                  <p className="text-gray-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                {userRoles.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Roles</label>
                    <div className="flex gap-2 mt-1">
                      {userRoles.map((role) => (
                        <span
                          key={role.id}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                            role.role === 'admin' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {role.role === 'admin' && <Shield className="h-3 w-3" />}
                          {role.role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                  <p className="text-4xl font-semibold text-primary mt-1">{profile?.token_balance || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Subscription Status</p>
                  <p className="text-4xl font-semibold text-gray-600 mt-1 capitalize">
                    {profile?.subscription_status || 'free'}
                  </p>
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
      </div>
    </PortalLayout>
  );
};

export default Profile;

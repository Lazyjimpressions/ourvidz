import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Search, Filter, RefreshCw, Eye, Shield, Ban, Activity, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: any;
  app_metadata: any;
  usage_stats?: {
    total_jobs: number;
    total_images: number;
    total_videos: number;
    storage_used: number;
  };
}

interface UserStats {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_week: number;
  premium_users: number;
}

export const UserManagementTab = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    total_users: 0,
    active_users: 0,
    new_users_today: 0,
    new_users_week: 0,
    premium_users: 0
  });
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all',
    sortBy: 'created_at'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // First try to get users with admin functions
      let authUsers: any[] = [];
      let adminAccess = false;

      try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) {
          console.warn('Admin access not available, falling back to profiles table:', error.message);
          throw error; // This will trigger the fallback
        }
        authUsers = (data.users || []).map(user => ({
          ...user,
          email: user.email || `user-${user.id.slice(0, 8)}@example.com`,
          created_at: user.created_at || new Date().toISOString(),
          last_sign_in_at: user.last_sign_in_at || null,
          user_metadata: user.user_metadata || {},
          app_metadata: user.app_metadata || {}
        }));
        adminAccess = true;
        setHasAdminAccess(true);
      } catch (adminError) {
        console.log('Using fallback method: profiles table');
        setHasAdminAccess(false);
        
        // Fallback: Get users from profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, created_at, updated_at');
        
        if (profilesError) throw profilesError;
        
        // Convert profiles to user-like objects
        authUsers = profiles?.map(profile => ({
          id: profile.id,
          email: `user-${profile.id.slice(0, 8)}@example.com`, // Placeholder email
          created_at: profile.created_at || new Date().toISOString(),
          last_sign_in_at: profile.updated_at || null,
          user_metadata: {},
          app_metadata: {}
        })) || [];
      }

      // Get usage stats for each user
      const usersWithStats = await Promise.all(
        authUsers.map(async (user) => {
          try {
            const { data: jobStats } = await supabase
              .from('jobs')
              .select('id, job_type')
              .eq('user_id', user.id);

            const { data: imageStats } = await supabase
              .from('workspace_assets')
              .select('id, file_size_bytes')
              .eq('user_id', user.id)
              .eq('asset_type', 'image');

            const totalJobs = jobStats?.length || 0;
            const totalImages = imageStats?.length || 0;
            const totalVideos = jobStats?.filter(j => j.job_type.includes('video')).length || 0;
            const storageUsed = imageStats?.reduce((sum, img) => sum + (img.file_size_bytes || 0), 0) || 0;

            return {
              ...user,
              usage_stats: {
                total_jobs: totalJobs,
                total_images: totalImages,
                total_videos: totalVideos,
                storage_used: storageUsed
              }
            };
          } catch (error) {
            console.warn(`Error loading stats for user ${user.id}:`, error);
            return {
              ...user,
              usage_stats: {
                total_jobs: 0,
                total_images: 0,
                total_videos: 0,
                storage_used: 0
              }
            };
          }
        })
      );

      setUsers(usersWithStats);
      calculateStats(usersWithStats);
      
      toast({
        title: "Success",
        description: `Loaded ${usersWithStats.length} users successfully`,
      });
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error Loading Users",
        description: error instanceof Error ? error.message : "Failed to load user information. Please check your permissions and try again.",
        variant: "destructive"
      });
      
      // Set empty state to prevent infinite loading
      setUsers([]);
      setStats({
        total_users: 0,
        active_users: 0,
        new_users_today: 0,
        new_users_week: 0,
        premium_users: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (usersData: User[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats: UserStats = {
      total_users: usersData.length,
      active_users: usersData.filter(u => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) > weekAgo
      ).length,
      new_users_today: usersData.filter(u => 
        new Date(u.created_at) >= today
      ).length,
      new_users_week: usersData.filter(u => 
        new Date(u.created_at) >= weekAgo
      ).length,
      premium_users: usersData.filter(u => 
        u.app_metadata?.role === 'premium' || u.user_metadata?.subscription === 'premium'
      ).length
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...users];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term)
      );
    }

    // Sort users
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'last_sign_in':
          return (b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0) - 
                 (a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0);
        case 'usage':
          return (b.usage_stats?.total_jobs || 0) - (a.usage_stats?.total_jobs || 0);
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'delete') => {
    if (!hasAdminAccess) {
      toast({
        title: "Admin Access Required",
        description: "Admin functions are not available. User management actions require service role permissions.",
        variant: "destructive"
      });
      return;
    }

    try {
      switch (action) {
        case 'suspend':
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { suspended: true }
          });
          break;
        case 'activate':
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { suspended: false }
          });
          break;
        case 'delete':
          await supabase.auth.admin.deleteUser(userId);
          break;
      }

      toast({
        title: "Success",
        description: `User ${action}ed successfully`
      });

      loadUsers(); // Reload users
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Admin Access Warning */}
      {!hasAdminAccess && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Limited Admin Access</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              Admin functions are not available. User management actions require service role permissions. 
              Only read-only user information is displayed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.total_users}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{stats.active_users}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Today</p>
                <p className="text-2xl font-bold">{stats.new_users_today}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Week</p>
                <p className="text-2xl font-bold">{stats.new_users_week}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Premium Users</p>
                <p className="text-2xl font-bold">{stats.premium_users}</p>
              </div>
              <Shield className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search users by email or ID..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="max-w-sm"
              />
            </div>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters({ ...filters, sortBy: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="last_sign_in">Last Sign In</SelectItem>
                <SelectItem value="usage">Usage</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadUsers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-gray-500">
                        {users.length === 0 ? 'No users found' : 'No users match your search criteria'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-gray-500">{user.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.user_metadata?.suspended ? 'destructive' : 'default'}>
                          {user.user_metadata?.suspended ? 'Suspended' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Jobs: {user.usage_stats?.total_jobs || 0}</p>
                          <p>Images: {user.usage_stats?.total_images || 0}</p>
                          <p>Storage: {formatBytes(user.usage_stats?.storage_used || 0)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {/* View user details */}}
                            disabled={!hasAdminAccess}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {hasAdminAccess && (
                            <>
                              {user.user_metadata?.suspended ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Shield className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Activate User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to activate this user? They will be able to access the platform again.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleUserAction(user.id, 'activate')}
                                      >
                                        Activate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Suspend User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to suspend this user? They will not be able to access the platform.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleUserAction(user.id, 'suspend')}
                                      >
                                        Suspend
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the user account and all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleUserAction(user.id, 'delete')}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
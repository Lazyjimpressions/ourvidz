import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  Users, 
  Image, 
  Video, 
  Clock,
  Download,
  Calendar,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  timeRange: string;
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalImages: number;
  totalVideos: number;
  avgJobTime: number;
  successRate: number;
  storageUsed: number;
  revenue: number;
  jobTypeBreakdown: {
    // SDXL Jobs (2)
    sdxl_image_fast: number;
    sdxl_image_high: number;
    // WAN Standard Jobs (4)
    image_fast: number;
    image_high: number;
    video_fast: number;
    video_high: number;
    // WAN Enhanced Jobs (4)
    image7b_fast_enhanced: number;
    image7b_high_enhanced: number;
    video7b_fast_enhanced: number;
    video7b_high_enhanced: number;
  };
  dailyStats: Array<{
    date: string;
    jobs: number;
    users: number;
    revenue: number;
  }>;
}

export const AnalyticsTab = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get user statistics
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, created_at');

      if (usersError) throw usersError;

      // Get job statistics
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (jobsError) throw jobsError;

      // Get image statistics
      const { data: images, error: imagesError } = await supabase
        .from('workspace_assets')
        .select('*')
        .eq('asset_type', 'image')
        .gte('created_at', startDate.toISOString());

      if (imagesError) throw imagesError;

      // Calculate analytics
      const totalUsers = users?.length || 0;
      // For now, consider users active if they have jobs in the last 7 days
      const activeUsers = jobs?.filter(j => 
        j.created_at && new Date(j.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).map(j => j.user_id).filter((value, index, self) => self.indexOf(value) === index).length || 0;

      const totalJobs = jobs?.length || 0;
      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
      const failedJobs = jobs?.filter(j => j.status === 'failed').length || 0;
      const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

      // Updated job type breakdown with all 10 current job types
      const jobTypeBreakdown = {
        // SDXL Jobs (2)
        sdxl_image_fast: jobs?.filter(j => j.job_type === 'sdxl_image_fast').length || 0,
        sdxl_image_high: jobs?.filter(j => j.job_type === 'sdxl_image_high').length || 0,
        // WAN Standard Jobs (4)
        image_fast: jobs?.filter(j => j.job_type === 'image_fast').length || 0,
        image_high: jobs?.filter(j => j.job_type === 'image_high').length || 0,
        video_fast: jobs?.filter(j => j.job_type === 'video_fast').length || 0,
        video_high: jobs?.filter(j => j.job_type === 'video_high').length || 0,
        // WAN Enhanced Jobs (4)
        image7b_fast_enhanced: jobs?.filter(j => j.job_type === 'image7b_fast_enhanced').length || 0,
        image7b_high_enhanced: jobs?.filter(j => j.job_type === 'image7b_high_enhanced').length || 0,
        video7b_fast_enhanced: jobs?.filter(j => j.job_type === 'video7b_fast_enhanced').length || 0,
        video7b_high_enhanced: jobs?.filter(j => j.job_type === 'video7b_high_enhanced').length || 0
      };

      const totalImages = images?.length || 0;
      const totalVideos = jobs?.filter(j => j.job_type.includes('video')).length || 0;
      const storageUsed = images?.reduce((sum, img) => sum + (img.file_size_bytes || 0), 0) || 0;

      // Calculate average job time (simplified)
      const completedJobsWithTime = jobs?.filter(j => 
        j.status === 'completed' && j.completed_at && j.created_at
      ) || [];
      
      const avgJobTime = completedJobsWithTime.length > 0 
        ? completedJobsWithTime.reduce((sum, job) => {
            const duration = new Date(job.completed_at!).getTime() - new Date(job.created_at).getTime();
            return sum + duration;
          }, 0) / completedJobsWithTime.length / 1000 / 60 // Convert to minutes
        : 0;

      // Generate daily stats
      const dailyStats = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayJobs = jobs?.filter(j => 
          j.created_at.startsWith(dateStr)
        ).length || 0;
        
        const dayUsers = users?.filter(u => 
          u.created_at && u.created_at.startsWith(dateStr)
        ).length || 0;

        dailyStats.push({
          date: dateStr,
          jobs: dayJobs,
          users: dayUsers,
          revenue: dayJobs * 0.1 // Simplified revenue calculation
        });
      }

      setAnalytics({
        timeRange,
        totalUsers,
        activeUsers,
        totalJobs,
        completedJobs,
        failedJobs,
        totalImages,
        totalVideos,
        avgJobTime,
        successRate,
        storageUsed,
        revenue: dailyStats.reduce((sum, day) => sum + day.revenue, 0),
        jobTypeBreakdown,
        dailyStats
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Set default analytics data to prevent infinite loading
      setAnalytics({
        timeRange,
        totalUsers: 0,
        activeUsers: 0,
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        totalImages: 0,
        totalVideos: 0,
        avgJobTime: 0,
        successRate: 0,
        storageUsed: 0,
        revenue: 0,
        jobTypeBreakdown: {
          sdxl_image_fast: 0,
          sdxl_image_high: 0,
          image_fast: 0,
          image_high: 0,
          video_fast: 0,
          video_high: 0,
          image7b_fast_enhanced: 0,
          image7b_high_enhanced: 0,
          video7b_fast_enhanced: 0,
          video7b_high_enhanced: 0
        },
        dailyStats: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Failed to load analytics</p>
          <Button onClick={loadAnalytics} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} disabled={isLoading}>
            <Activity className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                <p className="text-xs text-gray-500">
                  {analytics.activeUsers} active in period
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold">{analytics.totalJobs}</p>
                <p className="text-xs text-gray-500">
                  {analytics.successRate.toFixed(1)}% success rate
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Generated Content</p>
                <p className="text-2xl font-bold">{analytics.totalImages + analytics.totalVideos}</p>
                <p className="text-xs text-gray-500">
                  {analytics.totalImages} images, {analytics.totalVideos} videos
                </p>
              </div>
              <Image className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Job Time</p>
                <p className="text-2xl font-bold">{formatDuration(analytics.avgJobTime)}</p>
                <p className="text-xs text-gray-500">
                  {analytics.completedJobs} completed jobs
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Job Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* SDXL Jobs */}
              <div className="border-b pb-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">SDXL Jobs (Ultra-Fast)</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-sm">SDXL Fast</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.sdxl_image_fast}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-600 rounded"></div>
                      <span className="text-sm">SDXL High</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.sdxl_image_high}</Badge>
                  </div>
                </div>
              </div>

              {/* WAN Standard Jobs */}
              <div className="border-b pb-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">WAN Standard</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm">Image Fast</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.image_fast}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span className="text-sm">Image High</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.image_high}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm">Video Fast</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.video_fast}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="text-sm">Video High</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.video_high}</Badge>
                  </div>
                </div>
              </div>

              {/* WAN Enhanced Jobs */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">WAN Enhanced (7B)</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                      <span className="text-sm">Image 7B Fast</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.image7b_fast_enhanced}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-indigo-600 rounded"></div>
                      <span className="text-sm">Image 7B High</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.image7b_high_enhanced}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-teal-500 rounded"></div>
                      <span className="text-sm">Video 7B Fast</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.video7b_fast_enhanced}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-teal-600 rounded"></div>
                      <span className="text-sm">Video 7B High</span>
                    </div>
                    <Badge variant="outline">{analytics.jobTypeBreakdown.video7b_high_enhanced}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Success Rate</span>
                  <span>{analytics.successRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${analytics.successRate}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Storage Used</span>
                  <span>{formatBytes(analytics.storageUsed)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((analytics.storageUsed / (1024 * 1024 * 1024 * 10)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Failed Jobs</span>
                  <span>{analytics.failedJobs}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${analytics.totalJobs > 0 ? (analytics.failedJobs / analytics.totalJobs) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Daily Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {analytics.dailyStats.map((day, index) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t"
                  style={{ 
                    height: `${Math.max((day.jobs / Math.max(...analytics.dailyStats.map(d => d.jobs))) * 200, 4)}px` 
                  }}
                ></div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs font-medium">{day.jobs}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Analytics Report
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Generate Monthly Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Database, Trash2, Edit, Filter, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Job } from "@/lib/database";
import { HealthCheckJobCleaner } from "./HealthCheckJobCleaner";

interface JobStats {
  total: number;
  queued: number;
  completed: number;
  failed: number;
  healthChecks: number;
}

export const AdminDatabaseManager = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<JobStats>({
    total: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    healthChecks: 0
  });
  const [filters, setFilters] = useState({
    status: 'all',
    jobType: 'all',
    searchTerm: ''
  });
  const [editingCell, setEditingCell] = useState<{
    jobId: string;
    field: string;
    value: any;
  } | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, filters]);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      setJobs(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (jobsData: Job[]) => {
    const stats: JobStats = {
      total: jobsData.length,
      queued: jobsData.filter(j => j.status === 'queued').length,
      completed: jobsData.filter(j => j.status === 'completed').length,
      failed: jobsData.filter(j => j.status === 'failed').length,
      healthChecks: jobsData.filter(j => 
        j.metadata && 
        typeof j.metadata === 'object' && 
        !Array.isArray(j.metadata) &&
        (j.metadata as any).healthCheck === true
      ).length
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    if (filters.status !== 'all') {
      filtered = filtered.filter(job => job.status === filters.status);
    }

    if (filters.jobType !== 'all') {
      filtered = filtered.filter(job => job.job_type === filters.jobType);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(job => 
        job.id.toLowerCase().includes(term) ||
        job.job_type.toLowerCase().includes(term) ||
        (job.error_message && job.error_message.toLowerCase().includes(term))
      );
    }

    setFilteredJobs(filtered);
  };

  const handleCellEdit = async (jobId: string, field: string, newValue: any) => {
    try {
      const updateData: any = {};
      updateData[field] = newValue;

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;

      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, [field]: newValue } : job
      ));

      toast({
        title: "Success",
        description: `Job ${field} updated successfully`
      });
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: `Failed to update job ${field}`,
        variant: "destructive"
      });
    }
    setEditingCell(null);
  };

  const handleBulkDelete = async (jobIds: string[]) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .in('id', jobIds);

      if (error) throw error;

      setJobs(jobs.filter(job => !jobIds.includes(job.id)));
      setSelectedJobs(new Set());

      toast({
        title: "Success",
        description: `Deleted ${jobIds.length} jobs successfully`
      });
    } catch (error) {
      console.error('Error deleting jobs:', error);
      toast({
        title: "Error",
        description: "Failed to delete jobs",
        variant: "destructive"
      });
    }
  };

  const handleDeleteHealthChecks = async () => {
    const healthCheckJobs = jobs.filter(job => 
      job.metadata && 
      typeof job.metadata === 'object' && 
      !Array.isArray(job.metadata) &&
      (job.metadata as any).healthCheck === true
    );

    if (healthCheckJobs.length === 0) {
      toast({
        title: "Info",
        description: "No health check jobs to delete"
      });
      return;
    }

    await handleBulkDelete(healthCheckJobs.map(job => job.id));
  };

  const handleDeleteQueuedOlder = async (hours: number) => {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const oldQueuedJobs = jobs.filter(job => 
      job.status === 'queued' && 
      new Date(job.created_at) < cutoffTime
    );

    if (oldQueuedJobs.length === 0) {
      toast({
        title: "Info",
        description: `No queued jobs older than ${hours} hours to delete`
      });
      return;
    }

    await handleBulkDelete(oldQueuedJobs.map(job => job.id));
  };

  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map(job => job.id)));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'queued':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Check Job Cleaner */}
      <HealthCheckJobCleaner />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Jobs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.queued}</div>
            <div className="text-sm text-gray-600">Queued</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.healthChecks}</div>
            <div className="text-sm text-gray-600">Health Checks</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Jobs Table Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadJobs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Health Checks ({stats.healthChecks})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Health Check Jobs</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {stats.healthChecks} health check jobs. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteHealthChecks}>
                    Delete {stats.healthChecks} Jobs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Select onValueChange={(value) => handleDeleteQueuedOlder(parseInt(value))}>
              <SelectTrigger className="w-auto">
                <SelectValue placeholder="Delete Queued Older Than..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hour</SelectItem>
                <SelectItem value="6">6 Hours</SelectItem>
                <SelectItem value="24">24 Hours</SelectItem>
                <SelectItem value="72">3 Days</SelectItem>
              </SelectContent>
            </Select>

            {selectedJobs.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedJobs.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selected Jobs</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selectedJobs.size} selected jobs. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleBulkDelete(Array.from(selectedJobs))}>
                      Delete {selectedJobs.size} Jobs
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type-filter">Job Type</Label>
              <Select value={filters.jobType} onValueChange={(value) => setFilters({...filters, jobType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="enhance">Enhance</SelectItem>
                  <SelectItem value="generate">Generate</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by ID, type, or error message..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading jobs...
                    </TableCell>
                  </TableRow>
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No jobs found matching the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedJobs.has(job.id)}
                          onCheckedChange={() => toggleJobSelection(job.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{job.id.slice(0, 8)}...</TableCell>
                      <TableCell>{job.job_type}</TableCell>
                      <TableCell>
                        {editingCell?.jobId === job.id && editingCell?.field === 'status' ? (
                          <Select
                            value={editingCell.value}
                            onValueChange={(value) => setEditingCell({...editingCell, value})}
                            onOpenChange={(open) => {
                              if (!open) {
                                handleCellEdit(job.id, 'status', editingCell.value);
                              }
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="queued">Queued</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={getStatusBadgeVariant(job.status)}
                            className="cursor-pointer"
                            onClick={() => setEditingCell({jobId: job.id, field: 'status', value: job.status})}
                          >
                            {job.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(job.created_at)}</TableCell>
                      <TableCell>{job.attempts}/{job.max_attempts}</TableCell>
                      <TableCell className="max-w-xs">
                        {editingCell?.jobId === job.id && editingCell?.field === 'error_message' ? (
                          <Input
                            value={editingCell.value || ''}
                            onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
                            onBlur={() => handleCellEdit(job.id, 'error_message', editingCell.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(job.id, 'error_message', editingCell.value);
                              }
                            }}
                            className="w-full"
                          />
                        ) : (
                          <div
                            className="truncate cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => setEditingCell({jobId: job.id, field: 'error_message', value: job.error_message})}
                            title={job.error_message || 'Click to edit'}
                          >
                            {job.error_message || '-'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBulkDelete([job.id])}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500 text-center">
        Showing {filteredJobs.length} of {jobs.length} jobs
      </div>
    </div>
  );
};

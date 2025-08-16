import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Shield, Eye, CheckCircle, XCircle, Flag, Filter, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContentItem {
  id: string;
  user_id: string;
  user_email: string;
  content_type: 'image' | 'video';
  file_url: string;
  prompt: string;
  nsfw_score: number;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

interface ModerationStats {
  total_pending: number;
  total_flagged: number;
  total_approved: number;
  total_rejected: number;
  avg_nsfw_score: number;
}

export const ContentModerationTab = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ModerationStats>({
    total_pending: 0,
    total_flagged: 0,
    total_approved: 0,
    total_rejected: 0,
    avg_nsfw_score: 0
  });
  const [filters, setFilters] = useState({
    status: 'all',
    contentType: 'all',
    nsfwThreshold: 0.5
  });
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [content, filters]);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      // Get images for basic content review (no moderation fields in new schema)
      const { data: assets, error: assetsError } = await supabase
        .from('workspace_assets')
        .select(`
          id,
          user_id,
          original_prompt,
          temp_storage_path,
          created_at
        `)
        .eq('asset_type', 'image')
        .order('created_at', { ascending: false })
        .limit(100);

      if (assetsError) throw assetsError;

      const contentItems: ContentItem[] = (assets || []).map(asset => ({
        id: asset.id,
        user_id: asset.user_id,
        user_email: 'Unknown',
        content_type: 'image' as const,
        file_url: asset.temp_storage_path,
        prompt: asset.original_prompt,
        nsfw_score: 0, // Not available in simplified schema
        moderation_status: 'pending' as const, // Default status
        created_at: asset.created_at,
        reviewed_at: undefined,
        reviewed_by: undefined,
        review_notes: undefined
      }));

      setContent(contentItems);
      calculateStats(contentItems);
    } catch (error) {
      console.error('Error loading content:', error);
      toast({
        title: "Error",
        description: "Failed to load content for moderation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (contentData: ContentItem[]) => {
    const stats: ModerationStats = {
      total_pending: contentData.filter(c => c.moderation_status === 'pending').length,
      total_flagged: contentData.filter(c => c.moderation_status === 'flagged').length,
      total_approved: contentData.filter(c => c.moderation_status === 'approved').length,
      total_rejected: contentData.filter(c => c.moderation_status === 'rejected').length,
      avg_nsfw_score: contentData.length > 0 
        ? contentData.reduce((sum, c) => sum + c.nsfw_score, 0) / contentData.length 
        : 0
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...content];

    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.moderation_status === filters.status);
    }

    if (filters.contentType !== 'all') {
      filtered = filtered.filter(item => item.content_type === filters.contentType);
    }

    // Filter by NSFW score threshold
    filtered = filtered.filter(item => item.nsfw_score >= filters.nsfwThreshold);

    setFilteredContent(filtered);
  };

  const handleModerationAction = async (itemId: string, action: 'approve' | 'reject' | 'flag', notes?: string) => {
    // Note: Moderation functionality disabled in simplified schema
    toast({
      title: "Feature Not Available",
      description: "Moderation features are not available in the simplified schema. This is a display-only interface.",
      variant: "destructive"
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'flagged':
        return 'secondary';
      case 'pending':
      default:
        return 'outline';
    }
  };

  const getNSFWBadgeVariant = (score: number) => {
    if (score >= 0.8) return 'destructive';
    if (score >= 0.6) return 'secondary';
    if (score >= 0.4) return 'outline';
    return 'default';
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">{stats.total_pending}</p>
              </div>
              <Flag className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Flagged</p>
                <p className="text-2xl font-bold">{stats.total_flagged}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold">{stats.total_approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{stats.total_rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg NSFW Score</p>
                <p className="text-2xl font-bold">{(stats.avg_nsfw_score * 100).toFixed(1)}%</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Content Moderation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.contentType}
              onValueChange={(value) => setFilters({ ...filters, contentType: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.nsfwThreshold.toString()}
              onValueChange={(value) => setFilters({ ...filters, nsfwThreshold: parseFloat(value) })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="NSFW threshold..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Content</SelectItem>
                <SelectItem value="0.3">NSFW 30%+</SelectItem>
                <SelectItem value="0.5">NSFW 50%+</SelectItem>
                <SelectItem value="0.7">NSFW 70%+</SelectItem>
                <SelectItem value="0.9">NSFW 90%+</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={loadContent} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Content Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>NSFW Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContent.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                        {item.content_type === 'image' && (
                          <img 
                            src={item.file_url} 
                            alt="Content preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.user_email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-xs truncate" title={item.prompt}>
                        {item.prompt}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getNSFWBadgeVariant(item.nsfw_score)}>
                        {(item.nsfw_score * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.moderation_status)}>
                        {item.moderation_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {item.moderation_status === 'pending' && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve Content</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to approve this content? It will be visible to all users.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleModerationAction(item.id, 'approve')}
                                  >
                                    Approve
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject Content</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to reject this content? It will be hidden from users.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleModerationAction(item.id, 'reject')}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Reject
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Content Preview Modal */}
      {selectedItem && (
        <AlertDialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <AlertDialogContent className="max-w-4xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Content Review</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <img 
                    src={selectedItem.file_url} 
                    alt="Content preview"
                    className="w-full rounded-lg"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="font-medium">User</h4>
                    <p className="text-sm text-gray-600">{selectedItem.user_email}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Prompt</h4>
                    <p className="text-sm text-gray-600">{selectedItem.prompt}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">NSFW Score</h4>
                    <Badge variant={getNSFWBadgeVariant(selectedItem.nsfw_score)}>
                      {(selectedItem.nsfw_score * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium">Status</h4>
                    <Badge variant={getStatusBadgeVariant(selectedItem.moderation_status)}>
                      {selectedItem.moderation_status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium">Created</h4>
                    <p className="text-sm text-gray-600">{formatDate(selectedItem.created_at)}</p>
                  </div>
                  {selectedItem.review_notes && (
                    <div>
                      <h4 className="font-medium">Review Notes</h4>
                      <p className="text-sm text-gray-600">{selectedItem.review_notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedItem.moderation_status === 'pending' && (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleModerationAction(selectedItem.id, 'approve')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleModerationAction(selectedItem.id, 'reject')}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleModerationAction(selectedItem.id, 'flag')}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Flag for Review
                  </Button>
                </div>
              )}
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}; 
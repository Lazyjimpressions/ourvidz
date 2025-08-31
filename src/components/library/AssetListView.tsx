import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UnifiedAsset } from "@/lib/services/OptimizedAssetService";

interface AssetListViewProps {
  assets: UnifiedAsset[];
  lazyAssets: UnifiedAsset[];
  selectedAssets: Set<string>;
  onSelectAsset: (assetId: string) => void;
  onSelectAll: (checked: boolean) => void;
  onBulkDelete: () => void;
  onIndividualDelete: (asset: UnifiedAsset) => void;
  onPreview: (asset: UnifiedAsset) => void;
  isDeleting: boolean;
  registerAssetRef: (assetId: string, element: HTMLElement | null) => void;
}

export const AssetListView = ({
  assets,
  lazyAssets,
  selectedAssets,
  onSelectAsset,
  onSelectAll,
  onBulkDelete,
  onIndividualDelete,
  onPreview,
  isDeleting,
  registerAssetRef
}: AssetListViewProps) => {
  const allSelected = assets.length > 0 && assets.every(asset => selectedAssets.has(asset.id));
  const someSelected = selectedAssets.size > 0;

  const handleSelectAll = (checked: boolean) => {
    onSelectAll(checked);
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'outline';
    switch (status.toLowerCase()) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const truncatePrompt = (prompt: string, maxLength: number = 60) => {
    return prompt.length > maxLength ? `${prompt.substring(0, maxLength)}...` : prompt;
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {someSelected && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Selected'}
          </Button>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                disabled={assets.length === 0}
              />
            </TableHead>
            <TableHead className="w-20">Preview</TableHead>
            <TableHead>Prompt</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="w-32">Created</TableHead>
            <TableHead className="w-12">
              <MoreHorizontal className="h-4 w-4" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => {
            const lazyAsset = lazyAssets.find(la => la.id === asset.id) || asset;
            return (
              <TableRow key={asset.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedAssets.has(asset.id)}
                    onCheckedChange={() => onSelectAsset(asset.id)}
                    disabled={isDeleting}
                  />
                </TableCell>
                <TableCell>
                  <div 
                    ref={(el) => registerAssetRef(asset.id, el)}
                    className="w-12 h-12 rounded-md overflow-hidden cursor-pointer border bg-muted flex items-center justify-center"
                    onClick={() => onPreview(lazyAsset)}
                  >
                    {lazyAsset.url ? (
                      <img
                        src={lazyAsset.url}
                        alt="Asset thumbnail"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {asset.type === 'image' ? 'IMG' : 'VID'}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-0">
                  <div 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => onPreview(lazyAsset)}
                  >
                    <p className="font-medium truncate">
                      {asset.title || 'Untitled'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {truncatePrompt(asset.prompt)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {asset.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(asset.createdAt, 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(lazyAsset)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onIndividualDelete(asset)}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {assets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No assets found
        </div>
      )}
    </div>
  );
};
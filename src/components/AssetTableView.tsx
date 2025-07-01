
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Trash2, Eye, Calendar, Clock, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { UnifiedAsset } from "@/lib/services/AssetService";

interface AssetTableViewProps {
  assets: UnifiedAsset[];
  selectedAssets: Set<string>;
  onAssetSelection: (assetId: string, selected: boolean) => void;
  onPreview: (asset: UnifiedAsset) => void;
  onDelete: (asset: UnifiedAsset) => void;
  onDownload: (asset: UnifiedAsset) => void;
  selectionMode: boolean;
}

export const AssetTableView = ({
  assets,
  selectedAssets,
  onAssetSelection,
  onPreview,
  onDelete,
  onDownload,
  selectionMode
}: AssetTableViewProps) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="rounded-md border border-gray-700 bg-gray-800">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700">
            {selectionMode && (
              <TableHead className="w-12">
                <span className="sr-only">Select</span>
              </TableHead>
            )}
            <TableHead className="w-16">Type</TableHead>
            <TableHead className="w-20">Preview</TableHead>
            <TableHead>Prompt</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-24">Quality</TableHead>
            <TableHead className="w-32">Created</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow 
              key={asset.id} 
              className="border-gray-700 hover:bg-gray-700/50 transition-colors"
            >
              {selectionMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedAssets.has(asset.id)}
                    onCheckedChange={(checked) => 
                      onAssetSelection(asset.id, checked === true)
                    }
                    className="border-gray-600"
                  />
                </TableCell>
              )}
              
              <TableCell>
                <div className="flex items-center">
                  {asset.type === 'image' ? (
                    <ImageIcon className="h-4 w-4 text-blue-400" />
                  ) : (
                    <VideoIcon className="h-4 w-4 text-purple-400" />
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div 
                  className="w-12 h-12 rounded-md overflow-hidden cursor-pointer hover:scale-110 transition-transform bg-gray-700 flex items-center justify-center"
                  onClick={() => onPreview(asset)}
                >
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-gray-500 text-xs">
                      {asset.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div 
                    className="text-sm text-gray-300 cursor-pointer hover:text-white transition-colors" 
                    title={asset.prompt}
                    onClick={() => onPreview(asset)}
                  >
                    {truncateText(asset.prompt, 60)}
                  </div>
                  {asset.projectTitle && (
                    <div className="text-xs text-gray-500">
                      {truncateText(asset.projectTitle, 40)}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    asset.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    asset.status === 'processing' || asset.status === 'queued' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                >
                  {asset.status}
                </Badge>
              </TableCell>
              
              <TableCell>
                {asset.quality && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      asset.quality === 'high' 
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}
                  >
                    {asset.quality === 'high' ? 'High' : 'Fast'}
                  </Badge>
                )}
              </TableCell>
              
              <TableCell className="text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(asset.createdAt)}</span>
                </div>
                {asset.type === 'video' && asset.duration && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{asset.duration}s</span>
                  </div>
                )}
              </TableCell>
              
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreview(asset)}
                    className="h-8 w-8 p-0 hover:bg-gray-600"
                    title="Preview"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  
                  {asset.status === 'completed' && asset.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownload(asset)}
                      className="h-8 w-8 p-0 hover:bg-gray-600"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(asset)}
                    className="h-8 w-8 p-0 hover:bg-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

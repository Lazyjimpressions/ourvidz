
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { AssetCard } from "@/components/AssetCard";
import { AssetFilters, AssetType, QualityFilter, StatusFilter, SortOption, ViewMode } from "@/components/AssetFilters";
import { AssetPreviewModal } from "@/components/AssetPreviewModal";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { AssetService, UnifiedAsset } from "@/lib/services/AssetService";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";

const Library = () => {
  // Data fetching
  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['user-assets'],
    queryFn: AssetService.getUserAssets,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Selection states
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Modal states
  const [previewAsset, setPreviewAsset] = useState<UnifiedAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<UnifiedAsset | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedAssets(new Set());
    }
  }, [selectionMode]);

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let filtered = assets.filter(asset => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        asset.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const typeMatch = typeFilter === "all" || asset.type === typeFilter;

      // Quality filter
      const qualityMatch = qualityFilter === "all" || asset.quality === qualityFilter;

      // Status filter
      const statusMatch = statusFilter === "all" || 
        (statusFilter === "processing" && (asset.status === "processing" || asset.status === "queued")) ||
        (statusFilter === "failed" && (asset.status === "failed" || asset.status === "error")) ||
        asset.status === statusFilter;

      return searchMatch && typeMatch && qualityMatch && statusMatch;
    });

    // Sort assets
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "name":
          const aName = a.title || a.prompt;
          const bName = b.title || b.prompt;
          return aName.localeCompare(bName);
        case "newest":
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return filtered;
  }, [assets, searchTerm, typeFilter, qualityFilter, statusFilter, sortBy]);

  // Selection handlers
  const handleAssetSelection = (assetId: string, selected: boolean) => {
    const newSelection = new Set(selectedAssets);
    if (selected) {
      newSelection.add(assetId);
    } else {
      newSelection.delete(assetId);
    }
    setSelectedAssets(newSelection);
  };

  const handleSelectAll = () => {
    setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
  };

  const handleClearSelection = () => {
    setSelectedAssets(new Set());
  };

  // Asset actions
  const handleDownload = async (asset: UnifiedAsset) => {
    if (!asset.url) {
      toast.error("Asset URL not available");
      return;
    }

    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${asset.title || 'asset'}-${asset.id}.${asset.format || (asset.type === 'image' ? 'png' : 'mp4')}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download started!");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download asset");
    }
  };

  const handleBulkDownload = () => {
    const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
    selectedAssetList.forEach(asset => handleDownload(asset));
    toast.success(`Downloading ${selectedAssetList.length} assets...`);
  };

  const handleDelete = async (asset: UnifiedAsset) => {
    try {
      await AssetService.deleteAsset(asset.id, asset.type);
      toast.success(`${asset.type} deleted successfully`);
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete ${asset.type}`);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
      const assetsToDelete = selectedAssetList.map(asset => ({ id: asset.id, type: asset.type }));
      
      await AssetService.bulkDeleteAssets(assetsToDelete);
      toast.success(`${selectedAssetList.length} assets deleted successfully`);
      setSelectedAssets(new Set());
      setShowBulkDelete(false);
      refetch();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error("Failed to delete selected assets");
    }
  };

  if (isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <OurVidzDashboardLayout>
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">My Assets</h1>
              <p className="text-gray-400 mt-1">
                {filteredAssets.length} of {assets.length} assets
              </p>
            </div>

            {/* Bulk Actions */}
            {selectionMode && selectedAssets.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkDownload}
                  variant="outline"
                  size="sm"
                  className="border-gray-600"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download ({selectedAssets.size})
                </Button>
                <Button
                  onClick={() => setShowBulkDelete(true)}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedAssets.size})
                </Button>
              </div>
            )}
          </div>

          {/* Filters */}
          <AssetFilters
            assets={assets}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            qualityFilter={qualityFilter}
            onQualityFilterChange={setQualityFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedCount={selectedAssets.size}
            onClearSelection={handleClearSelection}
            onSelectAll={handleSelectAll}
            selectionMode={selectionMode}
            onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
          />

          {/* Assets Grid */}
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {assets.length === 0 ? "No assets yet" : "No assets match your filters"}
              </h2>
              <p className="text-gray-400">
                {assets.length === 0 
                  ? "Generate some images or videos to see them here"
                  : "Try adjusting your search terms or filters"
                }
              </p>
            </div>
          ) : (
            <div className={
              viewMode === "grid" 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                : "space-y-4"
            }>
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelect={(selected) => handleAssetSelection(asset.id, selected)}
                  onPreview={() => setPreviewAsset(asset)}
                  onDelete={() => setAssetToDelete(asset)}
                  onDownload={() => handleDownload(asset)}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AssetPreviewModal
        asset={previewAsset}
        open={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
        onDownload={handleDownload}
      />

      <DeleteConfirmationModal
        video={assetToDelete ? { 
          id: assetToDelete.id, 
          prompt: assetToDelete.prompt
        } : null}
        open={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={() => {
          if (assetToDelete) {
            handleDelete(assetToDelete);
            setAssetToDelete(null);
          }
        }}
      />

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmationModal
        video={selectedAssets.size > 0 ? {
          id: 'bulk',
          prompt: `${selectedAssets.size} selected assets`
        } : null}
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
      />
    </OurVidzDashboardLayout>
  );
};

export default Library;

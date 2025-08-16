import { Skeleton } from "@/components/ui/skeleton";

export const AssetSkeleton = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const AssetGridSkeleton = ({ count = 12 }: { count?: number }) => {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <AssetSkeleton key={i} />
      ))}
    </div>
  );
};
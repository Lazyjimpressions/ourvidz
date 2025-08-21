
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OptimizedDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  title?: string;
  description?: string;
  confirmText?: string;
  isLoading?: boolean;
}

export const OptimizedDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  count,
  title,
  description,
  confirmText = "Delete",
  isLoading = false,
}: OptimizedDeleteModalProps) => {
  const defaultTitle = `Delete ${count} item${count === 1 ? '' : 's'}?`;
  const defaultDescription = `This action cannot be undone. This will permanently delete ${count} item${count === 1 ? '' : 's'}.`;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">
            {title || defaultTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            disabled={isLoading}
            className="text-sm"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm min-w-16"
          >
            {isLoading ? "..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

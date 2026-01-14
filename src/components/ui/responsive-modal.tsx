import * as React from "react";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveModalContentProps {
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}

interface ResponsiveModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveModalDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

// Context to share mobile state with child components
const ResponsiveModalContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
});

export const useResponsiveModal = () => React.useContext(ResponsiveModalContext);

export const ResponsiveModal = ({
  open,
  onOpenChange,
  children,
}: ResponsiveModalProps) => {
  const { isMobile } = useMobileDetection();

  if (isMobile) {
    return (
      <ResponsiveModalContext.Provider value={{ isMobile: true }}>
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      </ResponsiveModalContext.Provider>
    );
  }

  return (
    <ResponsiveModalContext.Provider value={{ isMobile: false }}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </ResponsiveModalContext.Provider>
  );
};

export const ResponsiveModalContent = ({
  children,
  className,
  hideClose = false,
}: ResponsiveModalContentProps) => {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return (
      <DrawerContent
        className={cn(
          "max-h-[90vh] flex flex-col",
          className
        )}
      >
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={className} hideClose={hideClose}>
      {children}
    </DialogContent>
  );
};

export const ResponsiveModalHeader = ({
  children,
  className,
}: ResponsiveModalHeaderProps) => {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerHeader className={className}>{children}</DrawerHeader>;
  }

  return <DialogHeader className={className}>{children}</DialogHeader>;
};

export const ResponsiveModalTitle = ({
  children,
  className,
}: ResponsiveModalTitleProps) => {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>;
  }

  return <DialogTitle className={className}>{children}</DialogTitle>;
};

export const ResponsiveModalDescription = ({
  children,
  className,
}: ResponsiveModalDescriptionProps) => {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerDescription className={className}>{children}</DrawerDescription>;
  }

  return <DialogDescription className={className}>{children}</DialogDescription>;
};

export const ResponsiveModalFooter = ({
  children,
  className,
}: ResponsiveModalFooterProps) => {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerFooter className={className}>{children}</DrawerFooter>;
  }

  return <DialogFooter className={className}>{children}</DialogFooter>;
};

export const ResponsiveModalClose = DrawerClose;

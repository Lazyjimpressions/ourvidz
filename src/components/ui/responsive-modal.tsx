import * as React from "react";
import { useState } from "react";
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
  // Compute once on mount - prevents component swapping mid-session
  const [isMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false
  );

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
          "max-h-[90vh] flex flex-col w-full",
          className
        )}
      >
        <div 
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <DialogContent 
      className={cn("max-h-[85vh] flex flex-col", className)} 
      hideClose={hideClose}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
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

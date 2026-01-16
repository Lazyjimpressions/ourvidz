import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface MobileBottomNavItem {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface MobileBottomNavProps {
  items: MobileBottomNavItem[];
  floatingAction?: {
    icon: LucideIcon;
    onClick: () => void;
    label?: string;
  };
  className?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  items,
  floatingAction,
  className
}) => {
  const navigate = useNavigate();

  const handleItemClick = (item: MobileBottomNavItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      navigate(item.href);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {floatingAction && (
        <Button
          onClick={floatingAction.onClick}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
          size="icon"
          aria-label={floatingAction.label || 'Action'}
        >
          <floatingAction.icon className="w-6 h-6" />
        </Button>
      )}

      {/* Bottom Navigation Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}>
        <div className="flex items-center justify-around h-14 px-4">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-lg transition-colors min-w-[64px]",
                item.active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const pillFilterVariants = cva(
  "inline-flex items-center justify-center rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        active: "bg-primary text-primary-foreground hover:bg-primary/90"
      },
      size: {
        sm: "h-6 px-3",
        md: "h-7 px-4"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "sm"
    }
  }
);

export interface PillFilterProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pillFilterVariants> {
  active?: boolean;
}

const PillFilter = React.forwardRef<HTMLButtonElement, PillFilterProps>(
  ({ className, variant, size, active, ...props }, ref) => {
    return (
      <button
        className={cn(
          pillFilterVariants({ 
            variant: active ? 'active' : variant, 
            size, 
            className 
          })
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
PillFilter.displayName = "PillFilter";

export { PillFilter, pillFilterVariants };
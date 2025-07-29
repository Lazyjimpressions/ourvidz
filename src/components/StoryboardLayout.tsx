import React from 'react';
import { Button } from "@/components/ui/button";
import { AuthHeader } from "@/components/AuthHeader";

interface StoryboardLayoutProps {
  children: React.ReactNode;
}

export const StoryboardLayout = ({ children }: StoryboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OV</span>
            </div>
            <span className="font-semibold text-foreground">OurVidz</span>
          </div>

          {/* Right side - Auth Header components */}
          <AuthHeader />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};
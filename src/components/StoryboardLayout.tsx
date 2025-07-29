import React from 'react';
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

interface StoryboardLayoutProps {
  children: React.ReactNode;
}

export const StoryboardLayout = ({ children }: StoryboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader />

      {/* Main Content */}
      <main className="flex-1 pt-12">
        {children}
      </main>
    </div>
  );
};
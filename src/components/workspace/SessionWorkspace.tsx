import React, { useState } from 'react';
import { JobGrid } from './JobGrid';
import { JobThumbnail } from './JobThumbnail';
import { WorkspaceJob } from '@/hooks/useSimplifiedWorkspaceState';

interface SessionWorkspaceProps {
  jobs: WorkspaceJob[];
  onJobSelect: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
  onJobSave: (jobId: string) => void;
  onJobUseAsReference: (jobId: string) => void;
  onJobImport: (jobId: string) => Promise<void>;
  activeJobId?: string;
  isDeleting: Set<string>;
}

export const SessionWorkspace: React.FC<SessionWorkspaceProps> = ({
  jobs,
  onJobSelect,
  onJobDelete,
  onJobSave,
  onJobUseAsReference,
  onJobImport,
  activeJobId,
  isDeleting
}) => {
  const activeJob = jobs.find(job => job.id === activeJobId) || jobs[jobs.length - 1];

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="max-w-md">
          <h3 className="text-2xl font-semibold text-foreground mb-4">
            Let's start with some image storming.
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Type your prompt, set your style, and generate your image. Your workspace will fill with creative content as you explore different ideas and variations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-6">
        {activeJob && (
          <JobGrid
            job={activeJob}
            onJobDelete={onJobDelete}
            onJobSave={onJobSave}
            onJobUseAsReference={onJobUseAsReference}
            isDeleting={isDeleting.has(activeJob.id)}
          />
        )}
      </div>

      {/* Right Sidebar - Job Thumbnails */}
      <div className="w-64 border-l border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Generation Jobs
        </h3>
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobThumbnail
              key={job.id}
              job={job}
              isActive={job.id === activeJob?.id}
              onClick={() => onJobSelect(job.id)}
              onImport={() => onJobImport(job.id)}
              isDeleting={isDeleting.has(job.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
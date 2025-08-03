import React from 'react';
import { Button } from "@/components/ui/button";
import { Save, Trash2, Download, Image, RefreshCw } from "lucide-react";
import { WorkspaceJob } from '@/hooks/useSimplifiedWorkspaceState';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JobGridProps {
  job: WorkspaceJob;
  onJobDelete: (jobId: string) => void;
  onJobSave: (jobId: string) => void;
  onJobUseAsReference: (jobId: string) => void;
  isDeleting: boolean;
}

export const JobGrid: React.FC<JobGridProps> = ({
  job,
  onJobDelete,
  onJobSave,
  onJobUseAsReference,
  isDeleting
}) => {
  const handleDownloadJob = () => {
    job.items.forEach((item, index) => {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = `${job.prompt.slice(0, 20)}-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Job Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-lg font-medium text-foreground mb-2">
              {job.prompt}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Generated {new Date(job.createdAt).toLocaleTimeString()}</span>
              <span>{job.items.length} {job.type}s</span>
              <span className="capitalize">{job.items[0]?.quality} quality</span>
              <span>Status: {job.items[0]?.status || 'generated'}</span>
            </div>
          </div>
        </div>

        {/* Job Actions */}
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onJobSave(job.id)}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Job
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save all images in this job to library</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadJob}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download all images in this job</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {job.type === 'image' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onJobUseAsReference(job.id)}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Use as Reference
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Use first image as reference for new generation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onJobDelete(job.id)}
                  disabled={isDeleting}
                  className="flex items-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-current" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete Job
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove this job from workspace</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 1x3 Grid for Images or 1x1 for Video */}
      {job.type === 'video' ? (
        <div className="w-full max-w-2xl mx-auto">
          <video
            src={job.items[0]?.url}
            className="w-full aspect-video rounded-lg bg-muted"
            controls
            muted
            loop
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {job.items.map((item, index) => (
            <div key={item.id} className="aspect-square relative group">
              <img
                src={item.url}
                alt={`Generated image ${index + 1}`}
                className="w-full h-full object-cover rounded-lg bg-muted cursor-pointer transition-transform hover:scale-105"
                onClick={() => {
                  // TODO: Open lightbox modal
                  window.open(item.url, '_blank');
                }}
              />
              
              {/* Individual Image Actions on Hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-8 h-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Use individual image as reference
                          }}
                        >
                          <Image className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Use as reference</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-8 h-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = item.url;
                            link.download = `${job.prompt.slice(0, 20)}-${index + 1}.png`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download image</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Seed Display */}
              {item.seed && (
                <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs font-mono">
                  Seed: {item.seed}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
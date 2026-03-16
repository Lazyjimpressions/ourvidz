/**
 * Storyboard Page
 *
 * Main storyboard page showing project list with compact card grid.
 * Mobile-responsive toolbar and grid.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { StoryboardLayout } from '@/components/StoryboardLayout';
import { ProjectCard, NewProjectDialog } from '@/components/storyboard';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useStoryboardAI } from '@/hooks/useStoryboardAI';
import { StoryboardService } from '@/lib/services/StoryboardService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Film,
  Loader2,
  FolderOpen,
  Grid3X3,
  List,
} from 'lucide-react';
import { StoryboardProject, ProjectStatus, CreateProjectInput } from '@/types/storyboard';

type ViewMode = 'grid' | 'list';
type SortBy = 'updated' | 'created' | 'title';
type FilterStatus = 'all' | ProjectStatus;

const Storyboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const {
    projects,
    projectsLoading,
    projectsError,
    createProject,
    deleteProject,
    isCreatingProject,
  } = useStoryboard();

  const { generateStoryPlan, isGeneratingPlan, buildAIStoryPlan } = useStoryboardAI();

  // UI State
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [projectToDelete, setProjectToDelete] = useState<StoryboardProject | null>(null);

  // Filter and sort projects
  const filteredProjects = React.useMemo(() => {
    let result = [...projects];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return result;
  }, [projects, searchQuery, filterStatus, sortBy]);

  // Handlers
  const handleCreateProject = async (input: CreateProjectInput) => {
    const project = await createProject(input);
    setIsNewProjectOpen(false);

    if (input.ai_assistance_level === 'full' && input.description?.trim()) {
      console.log('🎬 [Storyboard] Generating AI story plan...');

      const planResult = await generateStoryPlan({
        projectDescription: input.description,
        targetDuration: input.target_duration_seconds || 30,
        contentMode: input.content_tier === 'sfw' ? 'sfw' : 'nsfw',
      });

      if (planResult) {
        console.log('✅ [Storyboard] Story plan generated:', {
          beats: planResult.storyBeats.length,
          scenes: planResult.sceneBreakdown.length,
        });

        const aiStoryPlan = buildAIStoryPlan(planResult);
        await StoryboardService.updateProject(project.id, {
          ai_story_plan: aiStoryPlan,
        });

        for (const sceneData of planResult.sceneBreakdown) {
          const sceneBeats = planResult.storyBeats.filter((_, idx) =>
            sceneData.beats.includes(idx + 1)
          );

          await StoryboardService.createScene({
            project_id: project.id,
            title: sceneData.title,
            description: sceneData.description,
            mood: sceneBeats[0]?.mood,
            target_duration_seconds: sceneData.targetDuration,
          });
        }

        console.log('✅ [Storyboard] Created', planResult.sceneBreakdown.length, 'scenes from AI plan');

        queryClient.invalidateQueries({ queryKey: ['storyboard-project', project.id] });
      }
    }

    navigate(`/storyboard/${project.id}`);
  };

  const handleOpenProject = (project: StoryboardProject) => {
    navigate(`/storyboard/${project.id}`);
  };

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
  };

  if (authLoading || projectsLoading) {
    return (
      <StoryboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </StoryboardLayout>
    );
  }

  if (projectsError) {
    return (
      <StoryboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-sm text-destructive mb-2">Failed to load projects</p>
            <p className="text-xs text-muted-foreground">{projectsError.message}</p>
          </div>
        </div>
      </StoryboardLayout>
    );
  }

  return (
    <StoryboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Storyboards</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Button
            onClick={() => setIsNewProjectOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Toolbar - responsive: stacks on mobile */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 pl-8 text-xs bg-muted border-border"
            />
          </div>

          {/* Status filter */}
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="h-8 w-28 sm:w-32 text-xs bg-muted border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="rendering">Rendering</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort - hide label on mobile */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-8 w-28 sm:w-32 text-xs bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode toggle - hide on very small screens */}
          <div className="hidden sm:flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 rounded-none ${
                viewMode === 'grid' ? 'bg-muted' : ''
              }`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 rounded-none ${
                viewMode === 'list' ? 'bg-muted' : ''
              }`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Project Grid/List */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            {projects.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Film className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground/80 mb-1">
                  No projects yet
                </h3>
                <p className="text-xs text-muted-foreground mb-4 text-center max-w-xs">
                  Create your first storyboard project to start building longer-form video content with AI assistance.
                </p>
                <Button
                  onClick={() => setIsNewProjectOpen(true)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Project
                </Button>
              </>
            ) : (
              <>
                <FolderOpen className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No projects match your filters</p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onEdit={handleOpenProject}
                onDelete={setProjectToDelete}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted hover:border-muted-foreground/20 cursor-pointer transition-all"
                onClick={() => handleOpenProject(project)}
              >
                <div className="w-16 sm:w-20 h-10 sm:h-12 bg-background rounded overflow-hidden flex-shrink-0">
                  {project.final_video_url ? (
                    <img
                      src={project.final_video_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-muted-foreground truncate hidden sm:block">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <span className="hidden sm:inline">{project.aspect_ratio}</span>
                  <span>{project.target_duration_seconds}s</span>
                  <span className="capitalize">{project.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        onSubmit={handleCreateProject}
        isLoading={isCreatingProject || isGeneratingPlan}
      />

      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent className="max-w-sm bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete "{projectToDelete?.title}"? This action
              cannot be undone and will remove all scenes and clips.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="h-8 text-xs bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StoryboardLayout>
  );
};

export default Storyboard;
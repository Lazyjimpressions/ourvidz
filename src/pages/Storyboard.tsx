/**
 * Storyboard Page
 *
 * Main storyboard page showing project list with compact card grid.
 * Follows UI/UX best practices: sleek, clean, professional.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    // Sort
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

    // If AI assistance is 'full' and there's a description, generate story plan
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

        // Build the AI story plan and update the project
        const aiStoryPlan = buildAIStoryPlan(planResult);
        await StoryboardService.updateProject(project.id, {
          ai_story_plan: aiStoryPlan,
        });

        // Create scenes from the breakdown
        for (const sceneData of planResult.sceneBreakdown) {
          // Get beats for this scene
          const sceneBeats = planResult.storyBeats.filter((_, idx) =>
            sceneData.beats.includes(idx + 1) // beats are 1-indexed
          );

          await StoryboardService.createScene({
            project_id: project.id,
            title: sceneData.title,
            description: sceneData.description,
            mood: sceneBeats[0]?.mood, // Use first beat's mood for scene
            target_duration_seconds: sceneData.targetDuration,
          });
        }

        console.log('✅ [Storyboard] Created', planResult.sceneBreakdown.length, 'scenes from AI plan');
      }
    }

    // Navigate to the new project editor
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

  // Loading state
  if (authLoading || projectsLoading) {
    return (
      <StoryboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading projects...</p>
          </div>
        </div>
      </StoryboardLayout>
    );
  }

  // Error state
  if (projectsError) {
    return (
      <StoryboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-sm text-red-400 mb-2">Failed to load projects</p>
            <p className="text-xs text-gray-500">{projectsError.message}</p>
          </div>
        </div>
      </StoryboardLayout>
    );
  }

  return (
    <StoryboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-100">Storyboards</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Button
            onClick={() => setIsNewProjectOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="h-8 pl-8 text-xs bg-gray-900 border-gray-800"
            />
          </div>

          {/* Status filter */}
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="h-8 w-32 text-xs bg-gray-900 border-gray-800">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="rendering">Rendering</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-8 w-32 text-xs bg-gray-900 border-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last updated</SelectItem>
              <SelectItem value="created">Date created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode toggle */}
          <div className="flex items-center border border-gray-800 rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 rounded-none ${
                viewMode === 'grid' ? 'bg-gray-800' : ''
              }`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 rounded-none ${
                viewMode === 'list' ? 'bg-gray-800' : ''
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
                <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-4">
                  <Film className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-300 mb-1">
                  No projects yet
                </h3>
                <p className="text-xs text-gray-500 mb-4 text-center max-w-xs">
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
                <FolderOpen className="w-10 h-10 text-gray-600 mb-3" />
                <p className="text-sm text-gray-500">No projects match your filters</p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
          // List view
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:bg-gray-900 hover:border-gray-700 cursor-pointer transition-all"
                onClick={() => handleOpenProject(project)}
              >
                {/* Thumbnail */}
                <div className="w-20 h-12 bg-gray-950 rounded overflow-hidden flex-shrink-0">
                  {project.final_video_url ? (
                    <img
                      src={project.final_video_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-5 h-5 text-gray-700" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-100 truncate">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{project.aspect_ratio}</span>
                  <span>{project.target_duration_seconds}s</span>
                  <span className="capitalize">{project.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        onSubmit={handleCreateProject}
        isLoading={isCreatingProject || isGeneratingPlan}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent className="max-w-sm bg-gray-950 border-gray-800">
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
              className="h-8 text-xs bg-red-600 hover:bg-red-700"
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

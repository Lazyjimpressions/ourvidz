import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Hash,
  Users,
  Star,
} from 'lucide-react';
import { usePromptScoringStats, ModelPerformance } from '@/hooks/usePromptScoringStats';
import { cn } from '@/lib/utils';

const getScoreColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score >= 4) return 'text-green-500';
  if (score >= 2.5) return 'text-yellow-500';
  return 'text-red-500';
};

const getScoreBgColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'bg-gray-100 dark:bg-gray-800';
  if (score >= 4) return 'bg-green-50 dark:bg-green-900/20';
  if (score >= 2.5) return 'bg-yellow-50 dark:bg-yellow-900/20';
  return 'bg-red-50 dark:bg-red-900/20';
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
};

export const PromptScoringAnalytics = () => {
  const {
    timeRange,
    setTimeRange,
    isLoading,
    overallStats,
    modelPerformance,
    tagFrequencies,
    refetch,
  } = usePromptScoringStats('30d');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Prompt Scoring Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Model-specific prompt performance insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d' | 'all')}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Total Scored</span>
            </div>
            <div className="text-3xl font-bold">{overallStats.totalScored.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Star className="h-4 w-4" />
              <span className="text-sm">Avg Score</span>
            </div>
            <div className={cn('text-3xl font-bold', getScoreColor(overallStats.avgComposite))}>
              {overallStats.avgComposite || '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Hash className="h-4 w-4" />
              <span className="text-sm">Models Analyzed</span>
            </div>
            <div className="text-3xl font-bold">{overallStats.modelsAnalyzed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Admin Rated</span>
            </div>
            <div className="text-3xl font-bold">
              {overallStats.adminRatedCount}
              <span className="text-sm font-normal text-gray-500 ml-1">
                / {overallStats.totalScored}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Model Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Model Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {modelPerformance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No scoring data available for the selected time range
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                  <TableHead className="text-center">Appearance</TableHead>
                  <TableHead className="text-center">Quality</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">n</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelPerformance.map((model: ModelPerformance) => (
                  <TableRow key={model.model_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{model.model_name}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {model.model_key}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-block px-2 py-1 rounded text-sm font-medium',
                          getScoreBgColor(model.avg_action),
                          getScoreColor(model.avg_action)
                        )}
                      >
                        {model.avg_action || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-block px-2 py-1 rounded text-sm font-medium',
                          getScoreBgColor(model.avg_appearance),
                          getScoreColor(model.avg_appearance)
                        )}
                      >
                        {model.avg_appearance || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-block px-2 py-1 rounded text-sm font-medium',
                          getScoreBgColor(model.avg_quality),
                          getScoreColor(model.avg_quality)
                        )}
                      >
                        {model.avg_quality || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-block px-3 py-1 rounded font-bold',
                          getScoreBgColor(model.avg_composite),
                          getScoreColor(model.avg_composite)
                        )}
                      >
                        {model.avg_composite || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-gray-500">
                      {model.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <TrendIcon trend={model.trend} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Common Feedback Tags</CardTitle>
        </CardHeader>
        <CardContent>
          {tagFrequencies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No feedback tags recorded yet
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tagFrequencies.slice(0, 15).map((tag) => {
                const isNegative = [
                  'wrong_pose',
                  'wrong_action',
                  'missing_element',
                  'wrong_appearance',
                  'wrong_body_part',
                  'artifact',
                  'wrong_style',
                  'low_quality',
                  'wrong_setting',
                ].includes(tag.tag);

                return (
                  <Badge
                    key={tag.tag}
                    variant="outline"
                    className={cn(
                      'text-sm px-3 py-1',
                      isNegative
                        ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400'
                    )}
                  >
                    {tag.tag.replace(/_/g, ' ')}
                    <span className="ml-2 text-xs opacity-70">
                      {tag.percentage}%
                    </span>
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">Score Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-green-500"></span>
              <span>4.0+ Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-yellow-500"></span>
              <span>2.5-4.0 Acceptable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-red-500"></span>
              <span>&lt;2.5 Needs Work</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

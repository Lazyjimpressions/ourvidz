import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';

export interface PerformanceMetric {
  modelId: string;
  modelName: string;
  modelKey: string;
  modality: string;
  providerName: string;
  totalRequests: number;
  successRate: number;
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  status: string;
}

interface PerformanceChartProps {
  data: PerformanceMetric[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const formatTime = (ms: number) => {
    if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms)}ms`;
  };

  const getStatusBadge = (status: string, avgTime: number, errorRate: number) => {
    // Error rate takes priority
    if (errorRate > 10) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          High Errors
        </Badge>
      );
    }
    if (errorRate > 5) {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500">
          <AlertTriangle className="h-3 w-3" />
          Errors
        </Badge>
      );
    }

    // Then check response time
    if (avgTime > 30000) {
      return (
        <Badge variant="outline" className="gap-1 border-red-500 text-red-500">
          <Clock className="h-3 w-3" />
          Slow
        </Badge>
      );
    }
    if (avgTime > 10000) {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-500">
          <Clock className="h-3 w-3" />
          Moderate
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
        <CheckCircle2 className="h-3 w-3" />
        Good
      </Badge>
    );
  };

  const getModalityBadge = (modality: string) => {
    const colors: Record<string, string> = {
      image: 'bg-purple-500/10 text-purple-500',
      video: 'bg-blue-500/10 text-blue-500',
      chat: 'bg-green-500/10 text-green-500',
    };
    return (
      <Badge variant="secondary" className={colors[modality] || ''}>
        {modality}
      </Badge>
    );
  };

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No performance data available for the selected time range
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Requests</TableHead>
          <TableHead className="text-right">Success Rate</TableHead>
          <TableHead className="text-right">Avg Time</TableHead>
          <TableHead className="text-right">P95</TableHead>
          <TableHead className="text-right">P99</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((metric) => (
          <TableRow key={metric.modelId}>
            <TableCell className="font-medium">{metric.providerName}</TableCell>
            <TableCell className="max-w-[200px] truncate" title={metric.modelKey}>
              {metric.modelName}
            </TableCell>
            <TableCell>{getModalityBadge(metric.modality)}</TableCell>
            <TableCell className="text-right">{metric.totalRequests.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <span className={metric.successRate < 95 ? 'text-red-500' : 'text-green-500'}>
                {metric.successRate.toFixed(1)}%
              </span>
            </TableCell>
            <TableCell className="text-right font-mono text-xs">
              {formatTime(metric.avgResponseTime)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-muted-foreground">
              {formatTime(metric.p95ResponseTime)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-muted-foreground">
              {formatTime(metric.p99ResponseTime)}
            </TableCell>
            <TableCell>
              {getStatusBadge(metric.status, metric.avgResponseTime, metric.errorRate)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

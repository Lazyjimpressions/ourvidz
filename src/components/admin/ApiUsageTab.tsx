import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useApiBalances, useSyncBalances, useApiUsageAggregates, useApiUsageLogs, useApiModels, useApiPerformanceMetrics } from '@/hooks/useApiUsage';
import { UsageChart } from './charts/UsageChart';
import { CostChart } from './charts/CostChart';
import { TokenChart } from './charts/TokenChart';
import { PerformanceChart } from './charts/PerformanceChart';
import { RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp, TrendingUp, DollarSign, Activity, BarChart3, Image, Video, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export const ApiUsageTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);

  const { data: balances, isLoading: balancesLoading } = useApiBalances();
  const { data: models } = useApiModels();
  const { data: aggregates, isLoading: aggregatesLoading } = useApiUsageAggregates(timeRange, selectedProvider);
  const { data: logsData, isLoading: logsLoading } = useApiUsageLogs({
    providerId: selectedProvider || undefined,
    page: logsPage,
    pageSize: 25
  });
  const { data: performanceData, isLoading: performanceLoading } = useApiPerformanceMetrics(timeRange, selectedProvider);

  const syncBalancesMutation = useSyncBalances();

  const handleSyncBalances = async () => {
    try {
      await syncBalancesMutation.mutateAsync();
      toast.success('Balances synced successfully');
    } catch (error) {
      toast.error('Failed to sync balances');
      console.error('Sync error:', error);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Build model inventory with usage stats
  const modelInventory = React.useMemo(() => {
    if (!models) return [];

    // Create usage stats map from aggregates
    const usageMap = new Map<string, { requests: number; cost: number; avgCost: number }>();
    
    aggregates?.forEach(agg => {
      if (agg.model_id) {
        const existing = usageMap.get(agg.model_id) || { requests: 0, cost: 0, avgCost: 0 };
        existing.requests += agg.request_count;
        existing.cost += Number(agg.cost_usd_total) || 0;
        usageMap.set(agg.model_id, existing);
      }
    });

    // Calculate avg cost
    usageMap.forEach((stats, key) => {
      stats.avgCost = stats.requests > 0 ? stats.cost / stats.requests : 0;
    });

    return models.map(model => {
      const usage = usageMap.get(model.id) || { requests: 0, cost: 0, avgCost: 0 };
      return {
        ...model,
        requests: usage.requests,
        totalCost: usage.cost,
        avgCost: usage.avgCost,
        hasUsage: usage.requests > 0
      };
    }).sort((a, b) => {
      // Sort by: provider, then by usage (models with usage first)
      if (a.api_providers.display_name !== b.api_providers.display_name) {
        return a.api_providers.display_name.localeCompare(b.api_providers.display_name);
      }
      return b.requests - a.requests;
    });
  }, [models, aggregates]);

  // Calculate totals for summary
  const totals = React.useMemo(() => {
    let totalRequests = 0;
    let totalCost = 0;
    let totalErrors = 0;

    aggregates?.forEach(agg => {
      totalRequests += agg.request_count;
      totalCost += Number(agg.cost_usd_total) || 0;
      totalErrors += agg.error_count;
    });

    return { totalRequests, totalCost, totalErrors };
  }, [aggregates]);

  // Get modality icon
  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'image': return <Image className="h-3 w-3" />;
      case 'video': return <Video className="h-3 w-3" />;
      case 'chat': return <MessageSquare className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Header with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">API Usage & Costs</h2>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={selectedProvider || 'all'} 
            onValueChange={(value) => setSelectedProvider(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {balances?.map((balance) => (
                <SelectItem key={balance.provider_id} value={balance.provider_id}>
                  {balance.api_providers.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleSyncBalances} 
            disabled={syncBalancesMutation.isPending}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${syncBalancesMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* Compact Balance Summary Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
        {balancesLoading ? (
          <span className="text-muted-foreground">Loading balances...</span>
        ) : balances && balances.length > 0 ? (
          <>
            {balances.map((balance) => {
              const isSpend = balance.balance_metadata?.total_spend_usd !== undefined;
              const displayValue = isSpend 
                ? formatCurrency(balance.balance_metadata?.total_spend_usd)
                : formatCurrency(balance.balance_usd);
              const label = isSpend ? 'spent' : 'balance';
              
              return (
                <div key={balance.provider_id} className="flex items-center gap-1.5 px-2 py-1 bg-background rounded border">
                  <span className="font-medium">{balance.api_providers.display_name}:</span>
                  <span className={isSpend ? 'text-orange-500' : 'text-green-500'}>
                    {displayValue}
                  </span>
                  <span className="text-muted-foreground text-xs">{label}</span>
                  {balance.sync_status === 'failed' && (
                    <Badge variant="destructive" className="h-4 text-[10px] px-1">!</Badge>
                  )}
                </div>
              );
            })}
            <div className="ml-auto flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {totals.totalRequests.toLocaleString()} requests
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(totals.totalCost)} total
              </span>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">No provider balances configured</span>
        )}
      </div>

      {/* Tabbed Charts Section */}
      <Card>
        <Tabs defaultValue="usage" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="usage" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="costs" className="text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                Costs
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="tokens" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                Tokens
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            {aggregatesLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Loading usage data...
              </div>
            ) : (
              <>
                <TabsContent value="usage" className="mt-0">
                  {aggregates && aggregates.length > 0 ? (
                    <UsageChart data={aggregates} />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No usage data for selected time range
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="costs" className="mt-0">
                  {aggregates && aggregates.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <CostChart data={aggregates} type="bar" />
                      <CostChart data={aggregates} type="pie" />
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No cost data for selected time range
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="performance" className="mt-0">
                  {performanceLoading ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Loading performance data...
                    </div>
                  ) : performanceData && performanceData.length > 0 ? (
                    <PerformanceChart data={performanceData} />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No performance data for selected time range
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="tokens" className="mt-0">
                  {aggregates && aggregates.length > 0 ? (
                    <TokenChart data={aggregates} />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No token data for selected time range
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </CardContent>
        </Tabs>
      </Card>

      {/* Model Inventory with Usage Stats */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Model Inventory & Usage</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelInventory.map((model) => (
                <TableRow key={model.id} className={!model.hasUsage ? 'opacity-60' : ''}>
                  <TableCell className="font-medium text-xs">
                    {model.api_providers.display_name}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs" title={model.model_key}>
                    {model.display_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      {getModalityIcon(model.modality)}
                      {model.modality}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {model.requests > 0 ? model.requests.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {model.totalCost > 0 ? formatCurrency(model.totalCost) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {model.avgCost > 0 ? formatCurrency(model.avgCost) : '-'}
                  </TableCell>
                  <TableCell>
                    {model.hasUsage ? (
                      <Badge variant="outline" className="gap-1 text-[10px] border-green-500 text-green-500">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        No usage
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Collapsible Recent Logs */}
      <Collapsible open={logsExpanded} onOpenChange={setLogsExpanded}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="py-3 cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent API Calls</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {logsData?.count || 0} total
                  </span>
                  {logsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {logsLoading ? (
                <div className="py-4 text-center text-muted-foreground text-sm">Loading logs...</div>
              ) : logsData && logsData.data.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Time</TableHead>
                        <TableHead className="text-xs">Provider</TableHead>
                        <TableHead className="text-xs">Model</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-right text-xs">Cost</TableHead>
                        <TableHead className="text-right text-xs">Time</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData.data.map((log) => (
                        <React.Fragment key={log.id}>
                          <TableRow>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(log.created_at)}
                            </TableCell>
                            <TableCell className="text-xs">{log.api_providers.display_name}</TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">
                              {log.api_models?.display_name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{log.request_type}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {log.cost_usd ? formatCurrency(log.cost_usd) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono">
                              {log.response_time_ms >= 1000 
                                ? `${(log.response_time_ms / 1000).toFixed(1)}s`
                                : `${log.response_time_ms}ms`
                              }
                            </TableCell>
                            <TableCell>
                              {log.response_status && log.response_status < 400 ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                              >
                                {expandedLogId === log.id ? 'Hide' : 'Details'}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedLogId === log.id && (
                            <TableRow>
                              <TableCell colSpan={8} className="bg-muted/50">
                                <div className="space-y-2 p-2 text-xs">
                                  <div>
                                    <strong>Request:</strong>
                                    <pre className="mt-1 p-2 bg-background rounded overflow-auto max-h-32 text-[10px]">
                                      {JSON.stringify(log.request_payload, null, 2)}
                                    </pre>
                                  </div>
                                  {log.error_message && (
                                    <div>
                                      <strong className="text-red-500">Error:</strong>
                                      <p className="text-red-500 mt-1">{log.error_message}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                  {logsData.totalPages > 1 && (
                    <div className="flex justify-between items-center mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        Page {logsPage} of {logsData.totalPages}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                          disabled={logsPage === 1}
                        >
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setLogsPage(p => Math.min(logsData.totalPages, p + 1))}
                          disabled={logsPage === logsData.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center text-muted-foreground text-sm">
                  No usage logs found
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiBalances, useSyncBalances, useApiUsageAggregates, useApiUsageLogs } from '@/hooks/useApiUsage';
import { UsageChart } from './charts/UsageChart';
import { CostChart } from './charts/CostChart';
import { TokenChart } from './charts/TokenChart';
import { RefreshCw, DollarSign, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const ApiUsageTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: balances, isLoading: balancesLoading } = useApiBalances();
  const { data: aggregates, isLoading: aggregatesLoading } = useApiUsageAggregates(timeRange, selectedProvider);
  const { data: logsData, isLoading: logsLoading } = useApiUsageLogs({
    providerId: selectedProvider || undefined,
    page: logsPage,
    pageSize: 50
  });

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  // Calculate cost breakdown from aggregates
  const costBreakdown = React.useMemo(() => {
    if (!aggregates) return [];

    const breakdown = new Map<string, {
      provider: string;
      model: string;
      totalCost: number;
      requestCount: number;
      avgCost: number;
    }>();

    aggregates.forEach(item => {
      const key = `${item.provider_id}-${item.model_id || 'all'}`;
      const existing = breakdown.get(key) || {
        provider: item.api_providers.display_name,
        model: item.api_models?.display_name || 'All Models',
        totalCost: 0,
        requestCount: 0,
        avgCost: 0
      };

      existing.totalCost += Number(item.cost_usd_total) || 0;
      existing.requestCount += item.request_count;
      breakdown.set(key, existing);
    });

    return Array.from(breakdown.values())
      .map(item => ({
        ...item,
        avgCost: item.requestCount > 0 ? item.totalCost / item.requestCount : 0
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [aggregates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">API Usage & Costs</h2>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleSyncBalances} 
            disabled={syncBalancesMutation.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncBalancesMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Balances
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {balancesLoading ? (
          <div className="col-span-3 text-center py-8">Loading balances...</div>
        ) : balances && balances.length > 0 ? (
          balances.map((balance) => (
            <Card key={balance.provider_id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{balance.api_providers.display_name}</span>
                  {balance.sync_status === 'failed' && (
                    <Badge variant="destructive">Sync Failed</Badge>
                  )}
                  {balance.sync_status === 'success' && (
                    <Badge variant="default">Synced</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Balance</span>
                    <p className="text-2xl font-bold">
                      {formatCurrency(balance.balance_usd)}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last synced: {formatDate(balance.last_synced_at)}
                  </div>
                  {balance.sync_status === 'failed' && balance.sync_error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {balance.sync_error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            No provider balances found
          </div>
        )}
      </div>

      {/* Provider Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by provider:</span>
        <Select 
          value={selectedProvider || 'all'} 
          onValueChange={(value) => setSelectedProvider(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
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
      </div>

      {/* Usage Charts */}
      {aggregatesLoading ? (
        <Card>
          <CardContent className="py-8 text-center">Loading usage data...</CardContent>
        </Card>
      ) : aggregates && aggregates.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <UsageChart data={aggregates} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <CostChart data={aggregates} type="bar" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <CostChart data={aggregates} type="pie" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Token Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <TokenChart data={aggregates} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No usage data available for the selected time range
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown Table */}
      {costBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown by Provider/Model</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Avg Cost/Request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costBreakdown.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.provider}</TableCell>
                    <TableCell>{item.model}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalCost)}
                    </TableCell>
                    <TableCell className="text-right">{item.requestCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.avgCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detailed Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent API Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="py-8 text-center">Loading logs...</div>
          ) : logsData && logsData.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Response Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.data.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow>
                        <TableCell className="text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.api_providers.display_name}</TableCell>
                        <TableCell className="text-xs">
                          {log.api_models?.display_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.request_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {log.tokens_total ? log.tokens_total.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {log.cost_usd ? formatCurrency(log.cost_usd) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {log.response_time_ms}ms
                        </TableCell>
                        <TableCell>
                          {log.response_status && log.response_status < 400 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          >
                            {expandedLogId === log.id ? 'Hide' : 'Details'}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedLogId === log.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/50">
                            <div className="space-y-2 p-4">
                              <div>
                                <strong>Request:</strong>
                                <pre className="text-xs mt-1 p-2 bg-background rounded overflow-auto max-h-40">
                                  {JSON.stringify(log.request_payload, null, 2)}
                                </pre>
                              </div>
                              {log.error_message && (
                                <div>
                                  <strong className="text-red-500">Error:</strong>
                                  <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                                </div>
                              )}
                              {log.response_payload && (
                                <div>
                                  <strong>Response:</strong>
                                  <pre className="text-xs mt-1 p-2 bg-background rounded overflow-auto max-h-40">
                                    {JSON.stringify(log.response_payload, null, 2)}
                                  </pre>
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
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {logsPage} of {logsData.totalPages} ({logsData.count} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                      disabled={logsPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
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
            <div className="py-8 text-center text-muted-foreground">
              No usage logs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

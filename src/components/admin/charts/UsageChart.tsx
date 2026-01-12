import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ApiUsageAggregate } from '@/hooks/useApiUsage';

interface UsageChartProps {
  data: ApiUsageAggregate[];
}

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  // Group data by date_bucket and sum request counts
  const chartData = React.useMemo(() => {
    const grouped = new Map<string, { date: string; requests: number; errors: number }>();

    data.forEach(item => {
      const key = item.date_bucket;
      const existing = grouped.get(key) || { date: key, requests: 0, errors: 0 };
      existing.requests += item.request_count;
      existing.errors += item.error_count;
      grouped.set(key, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis />
        <Tooltip 
          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        />
        <Legend />
        <Line type="monotone" dataKey="requests" stroke="#8884d8" name="Requests" strokeWidth={2} />
        <Line type="monotone" dataKey="errors" stroke="#ff4444" name="Errors" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

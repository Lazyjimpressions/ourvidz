import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ApiUsageAggregate } from '@/hooks/useApiUsage';

interface TokenChartProps {
  data: ApiUsageAggregate[];
}

export const TokenChart: React.FC<TokenChartProps> = ({ data }) => {
  // Aggregate tokens by provider
  const providerTokens = React.useMemo(() => {
    const grouped = new Map<string, { 
      name: string; 
      input: number; 
      output: number; 
      cached: number;
      total: number;
    }>();

    data.forEach(item => {
      const providerName = item.api_providers.display_name;
      const existing = grouped.get(providerName) || { 
        name: providerName, 
        input: 0, 
        output: 0, 
        cached: 0,
        total: 0
      };
      existing.input += Number(item.tokens_input_total) || 0;
      existing.output += Number(item.tokens_output_total) || 0;
      existing.cached += Number(item.tokens_cached_total) || 0;
      existing.total = existing.input + existing.output;
      grouped.set(providerName, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  const formatToken = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={providerTokens}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={formatToken} />
        <Tooltip 
          formatter={(value: number) => formatToken(value)}
          labelFormatter={(label) => `Provider: ${label}`}
        />
        <Legend />
        <Bar dataKey="input" stackId="tokens" fill="#8884d8" name="Input Tokens" />
        <Bar dataKey="output" stackId="tokens" fill="#82ca9d" name="Output Tokens" />
        <Bar dataKey="cached" stackId="tokens" fill="#ffc658" name="Cached Tokens" />
      </BarChart>
    </ResponsiveContainer>
  );
};

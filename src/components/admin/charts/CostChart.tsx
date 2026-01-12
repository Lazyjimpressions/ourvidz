import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ApiUsageAggregate } from '@/hooks/useApiUsage';

interface CostChartProps {
  data: ApiUsageAggregate[];
  type?: 'bar' | 'pie';
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

export const CostChart: React.FC<CostChartProps> = ({ data, type = 'bar' }) => {
  // Aggregate costs by provider
  const providerCosts = React.useMemo(() => {
    const grouped = new Map<string, { name: string; cost: number }>();

    data.forEach(item => {
      const providerName = item.api_providers.display_name;
      const existing = grouped.get(providerName) || { name: providerName, cost: 0 };
      existing.cost += Number(item.cost_usd_total) || 0;
      grouped.set(providerName, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost);
  }, [data]);

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={providerCosts}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="cost"
          >
            {providerCosts.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={providerCosts}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        <Legend />
        <Bar dataKey="cost" fill="#8884d8" name="Cost (USD)" />
      </BarChart>
    </ResponsiveContainer>
  );
};

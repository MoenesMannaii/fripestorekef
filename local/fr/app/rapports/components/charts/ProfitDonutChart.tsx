import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatsData {
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
}

interface ProfitDonutChartProps {
  statsData: StatsData;
}

const ProfitDonutChart: React.FC<ProfitDonutChartProps> = ({ statsData }) => {
  // Safe number conversion
  const safeTotalCost = statsData.totalCost ?? 0;
  const safeTotalProfit = statsData.totalProfit ?? 0;

  const data = [
    { name: 'Profit', value: safeTotalProfit, color: '#65738D' },
    { name: 'Coût', value: safeTotalCost, color: '#a2adbd' }
  ];

  // Filter out zero values to avoid chart issues
  const validData = data.filter(item => item.value > 0);

  // If all values are zero, show a placeholder
  if (validData.length === 0) {
    return (
      <div style={{ width: '100%', height: 300 }} className="flex items-center justify-center">
        <p className="text-gray-500">Aucune donnée à afficher</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={validData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(1)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {validData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => {
              const safeValue = value ?? 0;
              return [`${safeValue.toFixed(3)} DT`, 'Montant'];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProfitDonutChart;
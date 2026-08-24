import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatsData {
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  totalQuantitySold: number;
  period: {
    startDate: string;
    endDate: string;
    isSingleDay: boolean;
  };
}

const SalesTrendChart: React.FC<{ statsData: StatsData }> = ({ statsData }) => {
  // Safe number conversion
  const safeTotalRevenue = statsData.totalRevenue ?? 0;
  const safeTotalProfit = statsData.totalProfit ?? 0;
  const safeTotalCost = statsData.totalCost ?? 0;

  const chartData = [
    {
      name: 'Performance',
      Revenue: safeTotalRevenue,
      Profit: safeTotalProfit,
      Cost: safeTotalCost,
    }
  ];

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value: number) => {
              const safeValue = value ?? 0;
              return [`${safeValue.toFixed(3)} DT`, ''];
            }} 
          />
          <Legend />
          <Bar dataKey="Revenue" fill="#334055" name="Revenu Total" />
          <Bar dataKey="Profit" fill="#65738D" name="Profit" />
          <Bar dataKey="Cost" fill="#a2adbd" name="Coût" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesTrendChart;
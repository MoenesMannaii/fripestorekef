import { Package, ShoppingCart, Coins, File } from 'lucide-react';
import React from 'react';

import Image from 'next/image';
import dinar from '../../../assets/dinar.png';
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
  filter: {
    category?: string;
    productName?: string;
  };
}

interface MetricsCardsProps {
  statsData: StatsData | null;
}

// Safe number formatting utility
const safeToFixed = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(3);
};

const safeToString = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toString();
};

const MetricsCards: React.FC<MetricsCardsProps> = ({ statsData }) => {
  // Use safe values to prevent TypeScript errors
  const safeStatsData = statsData || {
    totalCost: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    totalQuantitySold: 0,
    period: {
      startDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date()),
      endDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date()),
      isSingleDay: false
    },
    filter: {}
  };

  const metrics = [
    {
      title: "Ventes Totales",
      value: `${safeToFixed(safeStatsData.totalRevenue)} DT`,
      icon: <Image src={dinar.src} className='w-11 h-10' width={11} height={10} alt='Dinar Logo' />,
      color: "text-gray-500",
      description: "Chiffre d'affaires total"
    },
    {
      title: "Transactions",
      value: safeToString(safeStatsData.totalOrders),
      icon: <File className="w-6 h-6" />,
      color: "text-gray-500",
      description: "Nombre total de commandes"
    },
    {
      title: "Produits Vendus",
      value: safeToString(safeStatsData.totalQuantitySold),
      icon: <Package className="w-6 h-6"/>,
      color: "text-gray-500",
      description: "Quantité totale vendue"
    },
    {
      title: "Profit Net",
      value: `${safeToFixed(safeStatsData.totalProfit)} DT`,
      icon: <ShoppingCart className="w-6 h-6" />,
      color: "text-gray-500",
      description: "Bénéfice après coûts"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {metrics.map((metric, index) => (
        <div 
          key={index}
          className="bg-white border border-gray-200 p-4 sm:p-6 flex justify-between items-start "
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 mb-2">{metric.title}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              {metric.value}
            </p>
            <p className="text-xs text-gray-400">
              {metric.description}
            </p>
          </div>
          <div className={`${metric.color} rounded-md p-2`}>
            {metric.icon}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsCards;

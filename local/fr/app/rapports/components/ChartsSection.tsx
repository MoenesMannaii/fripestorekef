import React, { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import ProfitDonutChart from './charts/ProfitDonutChart';
import SalesTrendChart from './charts/SalesTrendChart';
import { ExportService } from '../../../utils/exportService';
// ✅ IMPORT TIMEZONE HELPER
import { formatTunisiaLocal } from '../../../utils/timezone';
import { useAlert } from '../../../components/AlertContext';

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

interface ChartsSectionProps {
  statsData: StatsData | null;
  onExport: (format: 'pdf' | 'csv') => void;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ statsData, onExport }) => {
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const { showAlert } = useAlert();

  const getChartTitle = () => {
    if (!statsData) return 'Analyse des Performances';
    
    if (statsData.filter.category) {
      return `Analyse - Catégorie: ${statsData.filter.category}`;
    } else if (statsData.filter.productName) {
      return `Analyse - Produit: ${statsData.filter.productName}`;
    } else {
      return 'Analyse des Performances - Toutes les données';
    }
  };

  const getPeriodText = () => {
    if (!statsData) return '';
    
    // ✅ CHANGED: Tunisia-aware formatting
    const start = formatTunisiaLocal(statsData.period.startDate, 'dd/MM/yyyy');
    const end = formatTunisiaLocal(statsData.period.endDate, 'dd/MM/yyyy');
    
    if (statsData.period.isSingleDay) {
      return `Données du ${start}`;
    } else {
      return `Période: ${start} - ${end}`;
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!statsData) return;

    setExporting(format);
    
    try {
      const filename = ExportService.getExportFilename(statsData);
      let success = false;

      switch (format) {
        case 'pdf':
          success = await ExportService.exportToPDF(statsData, filename);
          break;
        case 'csv':
          success = ExportService.exportToCSV(statsData, filename);
          break;
      }

      if (success) {
        onExport(format);
      } else {
        showAlert(`Erreur lors de l'export ${format.toUpperCase()}`, 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showAlert(`Erreur lors de l'export ${format.toUpperCase()}`, 'error');
    } finally {
      setExporting(null);
    }
  };  

  return (
    <div className="bg-white border border-gray-200 p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {getChartTitle()}
          </h2>
          {statsData && (
            <p className="text-sm text-gray-500 mt-1">
              {getPeriodText()}
            </p>
          )}
        </div>
        
        {statsData && (
          <div className="flex gap-2 mt-4 sm:mt-0">
            <button 
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50  text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload className="w-4 h-4" />
              {exporting === 'pdf' ? 'Export...' : 'PDF'}
            </button>
            <button 
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50  text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload className="w-4 h-4" />
              {exporting === 'csv' ? 'Export...' : 'CSV'}
            </button>
          </div>
        )}
      </div>

      {!statsData ? (
        <div className="text-center text-gray-500 py-12">
          <p>Chargement des données statistiques...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit Breakdown Donut Chart */}
          <div className="bg-white border border-gray-300 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Répartition des Revenus
            </h3>
            <ProfitDonutChart statsData={statsData} />
          </div>

          {/* Sales Trend Chart */}
          <div className="bg-white border border-gray-300 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {statsData.period.isSingleDay ? 'Détails de la Journée' : 'Aperçu des Performances'}
            </h3>
            <SalesTrendChart statsData={statsData} />
          </div>
        </div>
      )}

      {/* Export Loading Overlay */}
      {exporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-none shadow-lg">
            <div className="flex items-center gap-3">
              <div className=" rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <p className="text-gray-700">
                Génération du fichier {exporting.toUpperCase()}...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartsSection;

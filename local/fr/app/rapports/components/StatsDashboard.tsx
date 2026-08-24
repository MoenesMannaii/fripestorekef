"use client";
import { Filter } from 'lucide-react';

import React, { useState, useEffect } from 'react';

import { FiFileText, FiPackage, FiClock } from "react-icons/fi";
import MetricsCards from './MetricsCards';
import FilterModal from './FilterModal';
import ChartsSection from './ChartsSection';
import TransactionsTable from './TransactionsTable';
import LoadingSpinner from './LoadingSpinner';
import ProductsSoldModal from './ProductsSoldModal'; // You'll need to create this component
import { useAlert } from '../../../components/AlertContext';
import { formatTunisiaLocal } from '../../../utils/timezone';

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
    shiftId: number | null;
  };
  shiftInfo?: {
    id: number;
    user_name: string;
    start_time: string;
    end_time: string;
    status: string;
    starting_cash: number;
    ending_cash: number;
    notes: string;
  } | null;
  filter: {
    category?: string;
    productName?: string;
    cashierId?: number;
  };
}

export default function StatsDashboard() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isProductsSoldModalOpen, setIsProductsSoldModalOpen] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [printingReport, setPrintingReport] = useState(false);
  const [productsSoldData, setProductsSoldData] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const { showAlert } = useAlert();

  // Fetch user role and default stats when component mounts
  useEffect(() => {
    fetchUserRole();
    fetchDefaultStats();
  }, []);

  // Fetch stats when filters change
  useEffect(() => {
    if (filters) {
      fetchStatsData(filters);
    }
  }, [filters]);

  const fetchUserRole = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch('http://localhost:4000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.user.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchDefaultStats = async () => {
    // Define today ONCE so it's available everywhere
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date());
    try {
      setLoading(true);
      setStatsError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      // Use today as BOTH start and end date
      const params = new URLSearchParams();
      params.append('startDate', today);
      params.append('endDate', today);
      const response = await fetch(
        `http://localhost:4000/api/stats/products?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stats API error:', errorText);
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setStatsData(data.data);
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching default stats:', error);
      setStatsError(error instanceof Error ? error.message : 'Unknown error');
      // Safe fallback data
      setStatsData({
        totalCost: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalOrders: 0,
        totalQuantitySold: 0,
        period: {
          startDate: today,
          endDate: today,
          isSingleDay: true,
          shiftId: null
        },
        filter: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsData = async (filterParams: any) => {
    try {
      setLoading(true);
      setStatsError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      const params = new URLSearchParams();
      if (filterParams.startDate) params.append('startDate', filterParams.startDate);
      if (filterParams.endDate) params.append('endDate', filterParams.endDate);
      if (filterParams.productName) params.append('productName', filterParams.productName);
      if (filterParams.category) params.append('category', filterParams.category);
      if (filterParams.shiftId) params.append('shiftId', filterParams.shiftId);
      // ✅ CRITICAL FIX: Include cashierId in the request
      if (filterParams.cashierId) params.append('cashierId', filterParams.cashierId.toString());

      const response = await fetch(`http://localhost:4000/api/stats/products?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setStatsData(data.data);
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatsError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = (appliedFilters: any) => {
    setFilters(appliedFilters);
  };

  const handleClearFilters = () => {
    setFilters(null);
    setStatsError(null);
    fetchDefaultStats();
  };

  const handleExport = (format: 'pdf' | 'png' | 'csv') => {
    console.log('Exporting in format:', format);
  };

  // Handle Print Report
  const handlePrintReport = async () => {
    try {
      setPrintingReport(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Prepare filter params
      let params = new URLSearchParams();
      if (filters?.startDate && filters?.endDate) {
        params.append('startDate', filters.startDate);
        params.append('endDate', filters.endDate);
      } else {
        // Default to today if no filters
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date());
        params.append('startDate', today);
        params.append('endDate', today);
      }

      if (filters?.category) params.append('category', filters.category);
      if (filters?.productName) params.append('productName', filters.productName);
      if (filters?.shiftId) params.append('shiftId', filters.shiftId);
      // ✅ Include cashierId in print request
      if (filters?.cashierId) params.append('cashierId', filters.cashierId.toString());

      // Fetch detailed report data
      const response = await fetch(
        `http://localhost:4000/api/stats/detailed-report?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch report: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        throw new Error('Invalid report data');
      }

      // ✅ CORRECTED: Changed endpoint from /api/print/print-sales-report to /api/print-sales-report
      const printResponse = await fetch(
        'http://localhost:4000/api/print-sales-report',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reportData: data.data }),
        }
      );

      if (!printResponse.ok) {
        const errorData = await printResponse.json();
        throw new Error(errorData.message || 'Failed to print report');
      }

      const printResult = await printResponse.json();
      console.log('✅ Report printed successfully:', printResult.message);
    } catch (error) {
      console.error('Error printing report:', error);
      showAlert(error instanceof Error ? error.message : 'Erreur lors de l\'impression du rapport', 'error');
    } finally {
      setPrintingReport(false);
    }
  };

  // Handle View Products Sold - USING THE SAME ENDPOINT
  const handleViewProductsSold = async () => {
    try {
      setLoadingProducts(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Prepare filter params
      const params = new URLSearchParams();
      if (filters?.startDate && filters?.endDate) {
        params.append('startDate', filters.startDate);
        params.append('endDate', filters.endDate);
      } else {
        // Default to today if no filters
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date());
        params.append('startDate', today);
        params.append('endDate', today);
      }

      if (filters?.category) params.append('category', filters.category);
      if (filters?.productName) params.append('productName', filters.productName);
      if (filters?.shiftId) params.append('shiftId', filters.shiftId);
      if (filters?.cashierId) params.append('cashierId', filters.cashierId.toString());

      // Fetch detailed report data - USING THE SAME ENDPOINT
      const response = await fetch(
        `http://localhost:4000/api/stats/detailed-report?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch report: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Extract products from the detailed report data
        // This depends on how your detailed-report endpoint structures the data
        // Assuming it has a products array or we need to transform it
        const products = extractProductsFromReport(data.data);
        setProductsSoldData(products);
        setIsProductsSoldModalOpen(true);
      } else {
        throw new Error('Invalid report data');
      }
    } catch (error) {
      console.error('Error fetching products sold:', error);
      showAlert(error instanceof Error ? error.message : 'Erreur lors du chargement des produits', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Helper function to extract products from the detailed report data
  const extractProductsFromReport = (reportData: any): any[] => {
    // This function needs to be adapted based on your actual data structure
    // Here are some common scenarios:
    
    // Scenario 1: If reportData already has a products array
    if (reportData.products && Array.isArray(reportData.products)) {
      return reportData.products;
    }
    
    // Scenario 2: If reportData has transactions with products
    if (reportData.transactions && Array.isArray(reportData.transactions)) {
      const products: any[] = [];
      reportData.transactions.forEach((transaction: any) => {
        if (transaction.items && Array.isArray(transaction.items)) {
          transaction.items.forEach((item: any) => {
            products.push({
              id: item.productId || item.id,
              name: item.productName || item.name,
              category: item.category || 'N/A',
              quantity: item.quantity || 0,
              price: item.price || 0,
              total: (item.price || 0) * (item.quantity || 0),
              cashierName: transaction.cashierName,
              saleDate: transaction.createdAt || transaction.date,
              transactionId: transaction.id
            });
          });
        }
      });
      return products;
    }
    
    // Scenario 3: If reportData itself is an array of products
    if (Array.isArray(reportData)) {
      return reportData;
    }
    
    // Default: return empty array
    console.warn('Could not extract products from report data structure:', reportData);
    return [];
  };

  const isWorker = userRole === 'worker';

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {statsError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            <p className="font-medium">Erreur de chargement des statistiques</p>
            <p className="text-sm">{statsError}</p>
            <button
              onClick={fetchDefaultStats}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Header Section - Blurred for workers */}
        <div className={`mb-8 ${isWorker ? 'filter blur-sm pointer-events-none' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Tableau de bord des Rapports
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {filters ? 'Statistiques filtrées' : 'Statistiques globales du mois en cours'}
              </p>
              {statsData?.period?.shiftId ? (
                <p className="text-sm text-green-700 font-bold mt-1">
                  Rapport par Session (SHIFT ID: {statsData.period.shiftId})
                </p>
              ) : statsData?.period && (
                <p className="text-sm text-gray-500 mt-1">
                  Période: {formatTunisiaLocal(statsData.period.startDate, 'dd/MM/yyyy')} - {formatTunisiaLocal(statsData.period.endDate, 'dd/MM/yyyy')}
                </p>
              )}
              {/* ✅ Show cashier filter info */}
              {filters?.cashierId && (
                <p className="text-sm text-gray-700 italic mt-1">
                  Filtré par caissier: {filters.cashierName || 'ID: ' + filters.cashierId}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {filters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
                >
                  <span className="text-sm font-medium">Aujourd'hui</span>
                </button>
              )}
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {filters ? 'Modifier Filtres' : 'Filtrer Statistiques'}
                </span>
              </button>
              
              {/* New Products Sold Button */}
              <button
                onClick={handleViewProductsSold}
                disabled={loadingProducts}
                className="flex items-center gap-2 px-4 py-4 bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-400 shadow-sm"
              >
                {loadingProducts ? (
                  <>
                    <span className="text-sm font-medium">Chargement...</span>
                  </>
                ) : (
                  <>
                    <FiPackage className="w-4 h-4" />
                    <span className="text-sm font-medium">Voir Produits Vendus</span>
                  </>
                )}
              </button>

              {/* Print Total Report Button */}
              <button
                onClick={handlePrintReport}
                disabled={printingReport}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white hover:bg-green-700 disabled:bg-green-400 shadow-sm"
              >
                {printingReport ? (
                  <>
                    <span className="text-sm font-medium">Impression...</span>
                  </>
                ) : (
                  <>
                    <FiFileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Imprimer Rapport Total</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metrics Cards */}
          <MetricsCards statsData={statsData} />

          {/* Shift Details Section - Shown only when filtering by shift */}
          {statsData?.shiftInfo && (
            <div className="mb-8 p-6 bg-gray-50 border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FiClock className="text-gray-500" /> Détails de Session
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Employé: <span className="font-semibold text-gray-700">{statsData.shiftInfo.user_name}</span> | 
                    Session #{statsData.shiftInfo.id}
                  </p>
                </div>
                <div className="flex gap-8">
                  <div className="text-left">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Début</p>
                    <p className="text-sm font-medium">{new Date(statsData.shiftInfo.start_time).toLocaleString('fr-TN')}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Fin</p>
                    <p className="text-sm font-medium">
                      {statsData.shiftInfo.end_time ? new Date(statsData.shiftInfo.end_time).toLocaleString('fr-TN') : 'Active'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 border border-gray-100 shadow-xs">
                  <p className="text-xs text-gray-500 font-medium mb-1 uppercase">Caisse Départ</p>
                  <p className="text-xl font-bold text-gray-800">{parseFloat(statsData.shiftInfo.starting_cash.toString()).toFixed(3)} DT</p>
                </div>
                <div className="bg-white p-4 border border-gray-100 shadow-xs">
                  <p className="text-xs text-gray-500 font-medium mb-1 uppercase">Total Ventes</p>
                  <p className="text-xl font-bold text-gray-800">{statsData.totalRevenue.toFixed(3)} DT</p>
                </div>
                <div className="bg-white p-4 border-2 border-gray-200 shadow-xs">
                  <p className="text-xs text-blue-800 font-bold mb-1 uppercase">Attendu en Caisse</p>
                  <p className="text-xl font-bold text-blue-800">
                    {(parseFloat(statsData.shiftInfo.starting_cash.toString()) + statsData.totalRevenue).toFixed(3)} DT
                  </p>
                </div>
                <div className="bg-white p-4 border border-gray-100 shadow-xs">
                  <p className="text-xs text-gray-500 font-medium mb-1 uppercase">Déclaré par Employé</p>
                  <p className="text-xl font-bold text-gray-800">
                    {statsData.shiftInfo.ending_cash ? parseFloat(statsData.shiftInfo.ending_cash.toString()).toFixed(3) : '0.000'} DT
                  </p>
                </div>
                <div className={`p-4 border-2 shadow-xs ${
                  (parseFloat(statsData.shiftInfo.ending_cash?.toString() || '0') - (parseFloat(statsData.shiftInfo.starting_cash.toString()) + statsData.totalRevenue)) >= 0
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-xs font-bold mb-1 uppercase ${
                    (parseFloat(statsData.shiftInfo.ending_cash?.toString() || '0') - (parseFloat(statsData.shiftInfo.starting_cash.toString()) + statsData.totalRevenue)) >= 0
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}>Écart (Différence)</p>
                  <p className={`text-xl font-bold ${
                    (parseFloat(statsData.shiftInfo.ending_cash?.toString() || '0') - (parseFloat(statsData.shiftInfo.starting_cash.toString()) + statsData.totalRevenue)) >= 0
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    {(parseFloat(statsData.shiftInfo.ending_cash?.toString() || '0') - (parseFloat(statsData.shiftInfo.starting_cash.toString()) + statsData.totalRevenue)).toFixed(3)} DT
                  </p>
                </div>
              </div>

              {statsData.shiftInfo.notes && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 italic text-sm text-amber-900 border-l-4 border-l-amber-400">
                  <p className="font-bold text-xs uppercase mb-1 not-italic text-amber-700">Notes de Session:</p>
                  "{statsData.shiftInfo.notes}"
                </div>
              )}
            </div>
          )}

          {/* Charts Section */}
          <ChartsSection statsData={statsData} onExport={handleExport} />
        </div>

        {/* Transactions Table - Always visible for all roles */}
        <div className={isWorker ? '' : 'mt-8'}>
          <TransactionsTable />
        </div>

        {/* Filter Modal - Blurred for workers */}
        <div className={isWorker ? 'filter blur-sm pointer-events-none' : ''}>
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            onApply={handleFilterApply}

          />
        </div>

        {/* Products Sold Modal */}
        <ProductsSoldModal
          isOpen={isProductsSoldModalOpen}
          onClose={() => setIsProductsSoldModalOpen(false)}
          products={productsSoldData}
          period={{
            startDate: filters?.startDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date()),
            endDate: filters?.endDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date())
          }}
        />
      </div>
    </div>
  );
}
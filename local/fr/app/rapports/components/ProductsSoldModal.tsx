"use client";
import React, { useState, useMemo } from 'react';
import { FiX, FiPackage, FiSearch, FiArrowLeft, FiPrinter, FiDownload, FiShoppingCart, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
// ✅ IMPORT TIMEZONE HELPER
import { formatTunisiaLocal } from '../../../utils/timezone';

interface Product {
  product_id: number;
  product_name: string;
  product_category: string;
  product_barcode: string;
  total_quantity: number;
  total_revenue: number;
  avg_price: number;
  total_profit: number;
  cashierName?: string;
  saleDate?: string;
}

interface ProductsSoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function ProductsSoldModal({ isOpen, onClose, products, period }: ProductsSoldModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      (p.product_name || '').toLowerCase().includes(query) ||
      (p.product_category || '').toLowerCase().includes(query) ||
      (p.product_barcode || '').toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const totalQuantity = useMemo(() => products.reduce((sum, product) => sum + (product.total_quantity || 0), 0), [products]);
  const totalRevenue = useMemo(() => products.reduce((sum, product) => sum + (product.total_revenue || 0), 0), [products]);
  const totalProfit = useMemo(() => products.reduce((sum, product) => sum + (product.total_profit || 0), 0), [products]);

  if (!isOpen) return null;

  // Tunisia-aware date formatting for period display
  const startDateStr = formatTunisiaLocal(period.startDate, 'dd/MM/yyyy');
  const endDateStr = formatTunisiaLocal(period.endDate, 'dd/MM/yyyy');

  return (
    <div className="fixed inset-0 z-70 bg-gray-50 flex flex-col overflow-hidden   ">
      {/* ── POS DARK HEADER ── */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600  text-sm font-medium border border-gray-600"
          >
            <FiArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="h-6 w-px bg-gray-600 mx-2 hidden sm:block" />
          <div className="flex items-center gap-2">
            <FiPackage className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-bold tracking-tight uppercase">
              Inventaire des Produits Vendus
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
        
          <button 
            onClick={onClose}
            className="p-4 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-900 hover:text-gray-800  ml-2"
          >
            <FiX className="w-6 h-6 inline" /> Fermer
          </button>
        </div>
      </div>

      {/* ── KPI SECTION ── */}
      <div className="bg-white border-b border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="border border-gray-200 p-5 flex items-center gap-4 bg-gray-50">
          <div className="p-3 bg-gray-800 text-white">
            <FiShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Articles Vendus</p>
            <p className="text-2xl font-black text-gray-900">{totalQuantity} <span className="text-sm font-normal text-gray-500">Unités</span></p>
          </div>
        </div>

        <div className="border border-gray-200 p-5 flex items-center gap-4 bg-gray-50">
          <div className="p-3 bg-gray-800 text-white">
            <FiDollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Chiffre d'Affaires</p>
            <p className="text-2xl font-black text-gray-900">{totalRevenue.toFixed(3)} <span className="text-sm font-normal text-gray-500">DT</span></p>
          </div>
        </div>

        <div className="border border-gray-200 p-5 flex items-center gap-4 bg-gray-50">
          <div className="p-3 bg-emerald-700 text-white">
            <FiTrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Bénéfice Net</p>
            <p className="text-2xl font-black text-emerald-700">{totalProfit.toFixed(3)} <span className="text-sm font-normal text-gray-500 italic">DT</span></p>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="bg-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 shrink-0">
        <div className="relative w-full max-w-xl">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Rechercher par nom, catégorie ou code-barres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 focus:ring-1 focus:ring-gray-800 outline-none text-sm  shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
          <span className="font-bold text-gray-900">{startDateStr}</span>
          <span>au</span>
          <span className="font-bold text-gray-900">{endDateStr}</span>
        </div>
      </div>

      {/* ── MAIN PRODUCTS TABLE ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50">
        <div className="bg-white border border-gray-200 min-w-full inline-block align-middle">
          <table className="min-w-full divide-y divide-gray-200 border-collapse">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-widest border-r border-gray-700 w-16">#</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-widest border-r border-gray-700">Produit</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-widest border-r border-gray-700 hidden lg:table-cell">Catégorie</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-300 uppercase tracking-widest border-r border-gray-700">Qté</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-300 uppercase tracking-widest border-r border-gray-700">Prix Moy.</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-300 uppercase tracking-widest border-r border-gray-700"> Total</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-300 uppercase tracking-widest">Bénéfice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <FiSearch className="w-12 h-12 opacity-20" />
                      <p className="text-lg font-medium">Aucun produit ne correspond à votre recherche</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr key={product.product_id || index} className="hover:bg-gray-50  group">
                    <td className="px-6 py-4 text-sm text-gray-400 border-r border-gray-100 group-hover:text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-gray-950">{product.product_name || 'N/A'}</span>
                        <span className="text-[10px] text-gray-400 uppercase mt-0.5">{product.product_barcode || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 border-r border-gray-100 hidden lg:table-cell uppercase text-xs">
                      {product.product_category || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-100">
                      <span className="inline-flex items-center px-2.5 py-1 text-sm font-bold bg-gray-100 text-gray-800">
                        {product.total_quantity || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 border-r border-gray-100">
                      {(product.avg_price || 0).toFixed(3)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 border-r border-gray-100">
                      {(product.total_revenue || 0).toFixed(3)} DT
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-black ${(product.total_profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {(product.total_profit || 0).toFixed(3)} DT
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredProducts.length > 0 && (
              <tfoot className="bg-gray-100">
                <tr className="border-t-2 border-gray-800">
                  <td colSpan={3} className="px-6 py-4 text-right font-bold text-gray-800 uppercase tracking-wider text-xs hidden lg:table-cell">TOTAUX</td>
                  <td colSpan={2} className="px-6 py-4 text-right font-bold text-gray-800 uppercase tracking-wider text-xs lg:hidden">TOTAUX</td>
                  <td className="px-6 py-4 text-center font-black text-gray-900 text-base">{filteredProducts.reduce((s, p) => s + (p.total_quantity || 0), 0)}</td>
                  <td className="px-6 py-4 border-r border-gray-200"></td>
                  <td className="px-6 py-4 text-right font-black text-gray-900 text-base">{filteredProducts.reduce((s, p) => s + (p.total_revenue || 0), 0).toFixed(3)} DT</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-800 text-base">{filteredProducts.reduce((s, p) => s + (p.total_profit || 0), 0).toFixed(3)} DT</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── FOOTER STATUS BAR ── */}
      <div className="bg-gray-800 text-white px-6 py-3 shrink-0 flex justify-between items-center text-xs">
        <div className="flex items-center gap-4">
          <span className="opacity-70">Nombre de lignes: {filteredProducts.length}</span>
          <span className="w-1 h-1 bg-gray-600 rounded-full" />
          <span className="opacity-70 italic">Inventaire généré le {new Date().toLocaleDateString('fr-TN')}</span>
        </div>
        <div className="flex gap-4 uppercase font-bold tracking-tighter">
          <span>{totalRevenue.toFixed(3)} DT</span>
          <span className="text-emerald-400">{totalProfit.toFixed(3)} DT NET</span>
        </div>
      </div>
    </div>
  );
}

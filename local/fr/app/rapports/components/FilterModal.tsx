"use client";

import React, { useState, useEffect } from 'react';
import Select, { SingleValue } from 'react-select';
import { CalendarDays, Clock, X } from 'lucide-react';
import { getTodayTunisia, getYesterdayTunisia } from '../../../utils/timezone';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  userRole?: string | null;
}

interface Product {
  id: number;
  name: string;
  category: string;
  barcode: string;
}

interface User {
  id: number;
  name: string;
  role: string;
}

const customSelectStyles = {
  control: (provided: any) => ({
    ...provided,
    minHeight: '60px',
    borderColor: '#A2ACBC',
    borderRadius: '0px',
    boxShadow: 'none',
    '&:hover': { borderColor: '#d1d5db' },
    '&:focus-within': {
      borderColor: '#6b7280',
      outline: 'none',
      boxShadow: '0 0 0 1px #6b7280',
    },
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    borderRadius: '0px',
    backgroundColor: state.isFocused ? '#f3f4f6' : 'white',
    color: '#1f2937',
    padding: '12px 16px',
    fontSize: '0.875rem',
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: '#1f2937',
    fontSize: '0.875rem',
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: '#9ca3af',
    fontSize: '0.875rem',
  }),
  menu: (provided: any) => ({
    ...provided,
    zIndex: 60,
    borderRadius: '0px',
  }),
  menuList: (provided: any) => ({
    ...provided,
    maxHeight: '220px',
    overflowY: 'auto',
  }),
};

export default function FilterModal({ isOpen, onClose, onApply }: FilterModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<SingleValue<{ value: number; label: string }> | null>(null);
  const [filters, setFilters] = useState({
    mode: 'calendar',
    dateRange: 'today',
    fromDate: '',
    toDate: '',
    category: '',
    selectedProduct: '',
    shiftId: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchProductsAndCategories();
      fetchCashiers();
      fetchShifts();
      setFilters({
        mode: 'calendar',
        dateRange: 'today',
        fromDate: '',
        toDate: '',
        category: '',
        selectedProduct: '',
        shiftId: '',
      });
      setSelectedCashier(null);
    }
  }, [isOpen]);

  const fetchProductsAndCategories = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const productsRes = await fetch('http://localhost:4000/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productsData = await productsRes.json();
      const products = productsData.products || productsData.data?.products || [];

      const categoriesRes = await fetch('http://localhost:4000/api/stats/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const categoriesData = await categoriesRes.json();
      const categories = categoriesData.data || categoriesData.categories || [];

      setProducts(products);
      setCategories(categories);
    } catch (error) {
      console.error('Error fetching products and categories:', error);
    }
  };

  const fetchCashiers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/users', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      const cashierUsers = (data.users || data || []).filter(
        (user: User) => user.role === 'worker' || user.role === 'admin'
      );
      setCashiers(cashierUsers);
    } catch (error) {
      console.error('Error fetching cashiers:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/shifts?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setShifts(data.data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filterData: any = {};

    if (filters.mode === 'shift') {
      if (!filters.shiftId) {
        alert('Veuillez sélectionner une session');
        return;
      }
      filterData.shiftId = filters.shiftId;
    } else {
      if (filters.dateRange === 'today') {
        const today = getTodayTunisia();
        filterData.startDate = today;
        filterData.endDate = today;
      } else if (filters.dateRange === 'yesterday') {
        const yesterday = getYesterdayTunisia();
        filterData.startDate = yesterday;
        filterData.endDate = yesterday;
      } else if (filters.dateRange === 'custom' && filters.fromDate && filters.toDate) {
        filterData.startDate = filters.fromDate;
        filterData.endDate = filters.toDate;
      }
    }

    if (filters.selectedProduct) {
      const selectedProduct = products.find(p => p.id === Number(filters.selectedProduct));
      if (selectedProduct) filterData.productName = selectedProduct.name;
    } else if (filters.category) {
      filterData.category = filters.category;
    }

    if (selectedCashier?.value) {
      filterData.cashierId = selectedCashier.value;
    }

    onApply(filterData);
    onClose();
  };

  if (!isOpen) return null;

  const dateRangeOptions = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'custom', label: 'Personnalisé' },
  ];

  const categoryOptions = categories.map(cat => ({ value: cat, label: cat }));
  const productOptions = products.map(p => ({
    value: p.id.toString(),
    label: `${p.name} - ${p.barcode}`,
  }));
  const cashierOptions = cashiers.map(c => ({
    value: c.id,
    label: `${c.name} (${c.role})`,
  }));

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-none p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Filtrer les Statistiques</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-4 rounded-none  bg-gray-100 hover:bg-gray-200">
            <X className="w-5 h-5 inline" /> Fermer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Mode Switcher ── */}
          <div className="flex bg-gray-100 p-1 rounded-none">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, mode: 'calendar' })}
              className={`flex-1 py-4 px-4 rounded-none text-sm font-semibold  ${
                filters.mode === 'calendar'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarDays className="w-5 h-5 inline" /> Calendrier
            </button>
            <button
              type="button"
              onClick={() => setFilters({ ...filters, mode: 'shift' })}
              className={`flex-1 py-4 px-4 rounded-none text-sm font-semibold  ${
                filters.mode === 'shift'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-5 h-5 inline" /> Sessions (Shifts)
            </button>
          </div>

          {/* ── Calendar Branch ── */}
          {filters.mode === 'calendar' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                <Select
                  options={dateRangeOptions}
                  value={dateRangeOptions.find(o => o.value === filters.dateRange)}
                  onChange={o => setFilters({ ...filters, dateRange: o?.value || 'today' })}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>

              {filters.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Début</label>
                    <input
                      type="date"
                      value={filters.fromDate}
                      onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
                      className="w-full px-3 py-4 border border-gray-300 rounded-none focus:ring-1 focus:ring-gray-500 text-sm"
                      max={getTodayTunisia()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fin</label>
                    <input
                      type="date"
                      value={filters.toDate}
                      onChange={e => setFilters({ ...filters, toDate: e.target.value })}
                      className="w-full px-3 py-4 border border-gray-300 rounded-none focus:ring-1 focus:ring-gray-500 text-sm"
                      max={getTodayTunisia()}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Shift Branch ── */}
          {filters.mode === 'shift' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner une Session
              </label>
              <Select
                options={shifts.map(s => ({
                  value: s.id.toString(),
                  label: `${new Date(s.start_time).toLocaleString('fr-TN')} — ${s.User?.name || 'Inconnu'} (${s.status})`,
                }))}
                onChange={o => setFilters({ ...filters, shiftId: o?.value || '' })}
                placeholder="Chercher une session..."
                styles={customSelectStyles}
              />
              <p className="text-xs text-gray-500 mt-2 italic">
                Rapport basé sur les heures réelles de travail (Clock In / Out).
              </p>
            </div>
          )}

          {/* ── Common Filters ── */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Caissier</label>
              <Select
                options={cashierOptions}
                value={selectedCashier}
                onChange={setSelectedCashier}
                placeholder="Tous les caissiers"
                styles={customSelectStyles}
                isClearable
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
              <Select
                options={categoryOptions}
                value={categoryOptions.find(o => o.value === filters.category) || null}
                onChange={o =>
                  setFilters({ ...filters, category: o?.value || '', selectedProduct: '' })
                }
                placeholder="Toutes les catégories"
                styles={customSelectStyles}
                isClearable
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produit spécifique
              </label>
              <Select
                options={productOptions}
                value={productOptions.find(o => o.value === filters.selectedProduct) || null}
                onChange={o =>
                  setFilters({ ...filters, selectedProduct: o?.value || '', category: '' })
                }
                placeholder="Tous les produits"
                styles={customSelectStyles}
                isClearable
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 bg-gray-100 text-gray-700 rounded-none hover:bg-gray-200  font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-4 bg-gray-900 text-white rounded-none hover:bg-gray-800  font-semibold shadow"
            >
              Appliquer les filtres
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

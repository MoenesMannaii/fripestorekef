"use client";
import { Search, Plus, Trash2, Pencil, RefreshCw, Image as ImageIcon, ScanBarcode, Package, Tag, DollarSign, ChevronDown, ChevronUp, X, TriangleAlert, Calculator, Network, Building2 } from 'lucide-react';

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Select from 'react-select';
import dinar from "../../assets/dinar.png";
import { useAlert } from '../../components/AlertContext';


interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  is_primary: boolean;
  created_at: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  barcode: string;
  description: string;
  category: string;
  has_sub_units?: boolean;
  pieces_per_box?: number;
  sell_by_weight?: boolean;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  remise_percentage?: number;
  Promotions?: any[];
  ProductImages?: ProductImage[];
}

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "worker";
  pin: string;
  created_at: string;
  is_active: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

export interface ProductFieldsConfig {
  barcode: boolean;
  sku: boolean;
  cost_price: boolean;
  sell_by_weight: boolean;
  has_sub_units: boolean;
  category: boolean;
  description: boolean;
}

interface RenameCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryOptions: SelectOption[];
  customSelectStyles: any;
  onRename: (oldName: string, newName: string) => Promise<void>;
}

function RenameCategoryModal({ isOpen, onClose, categoryOptions, customSelectStyles, onRename }: RenameCategoryModalProps) {
  const [oldName, setOldName] = useState("");
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!oldName || !newName) return;
    setIsSubmitting(true);
    await onRename(oldName, newName);
    setIsSubmitting(false);
    setOldName("");
    setNewName("");
  };

  return (
    <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-gray-200 w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Renommer une catégorie
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 space-y-4">
            <p className="text-sm text-gray-600">
              Cette action modifiera la catégorie de tous les produits associés.
            </p>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Catégorie actuelle
              </label>
              <Select
                options={categoryOptions.filter(opt => opt.value !== "all")}
                value={oldName ? { value: oldName, label: oldName } : null}
                onChange={(opt: any) => setOldName(opt?.value || "")}
                styles={customSelectStyles}
                placeholder="Sélectionner une catégorie..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Nouveau nom
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Entrez le nouveau nom..."
                className="w-full px-4 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 focus:ring-1 focus:ring-gray-400"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !oldName || !newName}
              className="px-4 py-4 bg-gray-600 text-white text-sm hover:bg-gray-700 border border-gray-300 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-400"
            >
              {isSubmitting ? "Traitement..." : "Confirmer le changement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [categoryFilter, setCategoryFilter] = useState<SelectOption>({ value: "all", label: "Toutes les catégories" });
  const [stockFilter, setStockFilter] = useState<SelectOption>({ value: "all", label: "Tous les stocks" });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({
    isOpen: false,
    product: null,
  });
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [productFields, setProductFields] = useState<ProductFieldsConfig>({
    barcode: true,
    sku: true,
    cost_price: true,
    sell_by_weight: true,
    has_sub_units: true,
    category: true,
    description: true
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { showAlert } = useAlert();

  // Debounce search input (300ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchTemplateConfig = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/templates/current', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const template = await response.json();
        if (template.product_fields_config) {
          setProductFields(template.product_fields_config);
          localStorage.setItem('pos_product_fields_config', JSON.stringify(template.product_fields_config));
        }
      }
    } catch (err) {
      console.error('Error fetching template config:', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      setUserLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setUserLoading(false);
        return;
      }

      const response = await fetch("http://localhost:4000/api/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response || !response.ok) {
        console.warn(
          "Could not fetch user from API, using default permissions"
        );
        setCurrentUser({ role: "admin" } as User);
        setUserLoading(false);
        return;
      }

      const data = await response.json();
      setCurrentUser(data.user || data);
    } catch (err) {
      console.error("Error fetching current user:", err);
      setCurrentUser({ role: "admin" } as User);
    } finally {
      setUserLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }

      const url = `http://localhost:4000/api/products?${new URLSearchParams({
        sort: sortField,
        order: sortDirection,
      })}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...products];

    // 🔍 Advanced search: name, category, barcode, price
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        const matchesName = product.name?.toLowerCase().includes(query);
        const matchesCategory = product.category?.toLowerCase().includes(query);
        const matchesBarcode = product.barcode?.toLowerCase().includes(query);
        const matchesPrice = product.price.toString().includes(query);
        return matchesName || matchesCategory || matchesBarcode || matchesPrice;
      });
    }

    // 🏷️ Category filter
    if (categoryFilter.value !== "all") {
      filtered = filtered.filter(
        (product) => product.category === categoryFilter.value
      );
    }

    // 📦 Stock filter
    if (stockFilter.value !== "all") {
      switch (stockFilter.value) {
        case "out":
          filtered = filtered.filter((product) => product.stock === 0);
          break;
        case "low":
          filtered = filtered.filter(
            (product) => product.stock > 0 && product.stock <= 10
          );
          break;
        case "normal":
          filtered = filtered.filter((product) => product.stock > 10);
          break;
      }
    }

    // 🔤 Sorting (client-side for consistency with filters)
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "stock":
          comparison = a.stock - b.stock;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    setFilteredProducts(filtered);
  }, [products, debouncedSearch, categoryFilter, stockFilter, sortField, sortDirection]);

  const handleDeleteProduct = async () => {
    if (!deleteModal.product) return;

    if (currentUser?.role === "worker") {
      showAlert(
        "Vous n'avez pas les autorisations nécessaires pour supprimer des produits.",
        "warning"
      );
      setDeleteModal({ isOpen: false, product: null });
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        showAlert("Authentication token not found. Please log in again.", "error");
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/products/${deleteModal.product.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      setProducts((prev) =>
        prev.filter((product) => product.id !== deleteModal.product!.id)
      );
      setDeleteModal({ isOpen: false, product: null });
    } catch (err) {
      showAlert(
        err instanceof Error
          ? err.message
          : "Échec de la suppression du produit",
        "error"
      );
      console.error("Error deleting product:", err);
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!oldName || !newName) {
      showAlert("Les deux noms de catégorie sont requis.", "warning");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        showAlert("Session expirée. Veuillez vous reconnecter.", "error");
        return;
      }

      const response = await fetch("http://localhost:4000/api/products/categories/rename", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldName, newName }),
      });

      if (!response.ok) {
        throw new Error("Échec du renommage de la catégorie");
      }

      const data = await response.json();
      showAlert(data.message, "success");
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.category === oldName ? { ...p, category: newName } : p
      ));
      
      setRenameModalOpen(false);
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Erreur lors du renommage", "error");
    }
  };


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const openDeleteModal = (product: Product) => {
    if (currentUser?.role === "worker") {
      showAlert(
        "Vous n'avez pas les autorisations nécessaires pour supprimer des produits.",
        "warning"
      );
      return;
    }
    setDeleteModal({ isOpen: true, product });
  };

  const handleEditProduct = (product: Product) => {
    if (currentUser?.role === "worker") {
      showAlert(
        "Vous n'avez pas les autorisations nécessaires pour modifier des produits.",
        "warning"
      );
      return;
    }
    window.location.href = `/gestion/edit?id=${product.id}`;
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, product: null });
  };

  const categoryOptions: SelectOption[] = [
    { value: "all", label: "Toutes les catégories" },
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map(
      (category) => ({
        value: category,
        label: category,
      })
    ),
  ];

  const stockOptions: SelectOption[] = [
    { value: "all", label: "Tous les stocks" },
    { value: "out", label: "Rupture de stock" },
    { value: "low", label: "Stock faible" },
    { value: "normal", label: "Stock normal" },
  ];

  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      border: '1px solid #d1d5db',
      borderRadius: '0px',
      boxShadow: state.isFocused ? '0 0 0 1px #9ca3af' : 'none',
      '&:hover': {
        borderColor: '#9ca3af',
      },
      minHeight: '52px',
      padding: '0px 4px',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#4b5563' : state.isFocused ? '#f3f4f6' : 'white',
      color: state.isSelected ? 'white' : '#374151',
      padding: '12px 16px',
      fontSize: '14px',
      textTransform: 'capitalize',
      '&:hover': {
        backgroundColor: '#364153',
        color: 'white',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '0px',
      border: '1px solid #d1d5db',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }),
    menuList: (provided: any) => ({
      ...provided,
      padding: '4px 0',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      fontSize: '14px',
      color: '#374151',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      fontSize: '14px',
      color: '#9ca3af',
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: '8px',
    }),
    clearIndicator: (provided: any) => ({
      ...provided,
      padding: '8px',
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '4px 12px',
    }),
    input: (provided: any) => ({
      ...provided,
      margin: '0px',
      padding: '0px',
    }),
  };

  const isWorker = currentUser?.role === "worker";

  useEffect(() => {
    const loadData = async () => {
      await fetchTemplateConfig();
      await fetchCurrentUser();
      await fetchProducts();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!userLoading) {
      fetchProducts();
    }
  }, [sortField, sortDirection, userLoading]);

  useEffect(() => {
    if (!loading && !userLoading) {
      applyFilters();
    }
  }, [applyFilters, loading, userLoading]);

  const formatPrice = (price: number) => {
    return (
      new Intl.NumberFormat("fr-TN", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(price) + " DT"
    );
  };

  const getProductImageUrl = (product: Product) => {
    if (product.ProductImages && product.ProductImages.length > 0) {
      const imageUrl = product.ProductImages[0].url;
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      }
      return `http://localhost:4000/${imageUrl.replace(/^[\\\/]+/, "").replace(/\\/g, "/")}`;
    }
    return null;
  };

  const isParentProduct = (product: Product) => {
    return products.some(p => p.parent_id === product.id);
  };

  const stats = {
    total: filteredProducts.length,
    lowStock: filteredProducts.filter((p) => p.stock > 0 && p.stock <= 10)
      .length,
    outOfStock: filteredProducts.filter((p) => p.stock === 0).length,
    totalValue: filteredProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-900 font-bold border-2 border-gray-900 px-4 py-2 uppercase">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-5">
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.product && (
        <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirmer la suppression
                  </h3>
                </div>
                <button
                  onClick={closeDeleteModal}
                  className="p-1 text-gray-400 hover:text-gray-600  rounded-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Êtes-vous sûr de vouloir supprimer le produit suivant ?
                </p>
                <div className="bg-gray-50 p-3 border border-gray-200">
                  <p className="font-medium text-gray-900">
                    {deleteModal.product.name}
                  </p>
                  {deleteModal.product.sku && (
                    <p className="text-xs text-gray-500">
                      SKU: {deleteModal.product.sku}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    Prix: {formatPrice(deleteModal.product.price)} | Stock:{" "}
                    {deleteModal.product.stock}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Cette action peut être annulée. Le produit pourra être
                  restauré si nécessaire.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50  focus:ring-1 focus:ring-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="px-4 py-4 bg-red-600 text-white text-sm hover:bg-red-700  border border-gray-300 focus:ring-1 focus:ring-gray-400 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Gestion des Produits
            </h1>
            <p className="text-sm text-gray-600">
              Gérez vos produits et suivez vos stocks
            </p>
            {currentUser && (
              <p className="text-xs text-gray-500 mt-1">
                Connecté en tant que:{" "}
                <span className="font-medium">
                  {currentUser.name || "Utilisateur"}
                </span>
                ({currentUser.role === "admin" ? "Administrateur" : "Employé"})
                {isWorker && (
                  <span className="ml-2 text-red-600">
                    (Permissions limitées)
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            className="flex items-center gap-1 px-4 py-4 bg-gray-600 text-white text-sm hover:bg-gray-700 mt-4 lg:mt-0 border border-gray-300 font-medium focus:ring-1 focus:ring-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => (window.location.href = "/gestion/add")}
            title={
              isWorker
                ? "Non autorisé à ajouter des produits"
                : "Ajouter un produit"
            }
          >
            <Plus className="w-5 h-5" />
            Ajouter un produit
          </button>
        </div>

      

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">
                  Total Produits
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Package className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">
                  Stock Faible
                </p>
                <p className="text-xl font-semibold text-yellow-600">
                  {stats.lowStock}
                </p>
              </div>
              <Package className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">Rupture</p>
                <p className="text-xl font-semibold text-red-600">
                  {stats.outOfStock}
                </p>
              </div>
              <Package className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">
                  Valeur Stock
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatPrice(stats.totalValue)}
                </p>
              </div>
              <Image
                src={dinar.src}
                className="w-11 h-10"
                width={11}
                height={10}
                alt="Dinar Logo"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center">
            <TriangleAlert className="w-4 h-4 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white border border-gray-200">
        {/* Filters and Search */}
        <div className="border-b border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 lg:mb-0 w-full sm:w-auto">
              <div className="w-full sm:w-52">
                <Select
                  value={categoryFilter}
                  onChange={(newValue) => setCategoryFilter(newValue as SelectOption)}
                  options={categoryOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>
              <div className="w-full sm:w-52">
                <Select
                  value={stockFilter}
                  onChange={(newValue) => setStockFilter(newValue as SelectOption)}
                  options={stockOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>
                {/* Rename Category Button & Modal */}
        {currentUser?.role === "admin" && (
          <div className=" ml-4 flex justify-end">
            <button
              onClick={() => setRenameModalOpen(true)}
              className="flex items-center gap-1 px-4 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50  font-medium focus:ring-1 focus:ring-gray-400"
            >
              <Tag className="w-4 h-4" />
              Renommer une catégorie globalement
            </button>
          </div>
        )}

        <RenameCategoryModal 
          isOpen={renameModalOpen}
          onClose={() => setRenameModalOpen(false)}
          categoryOptions={categoryOptions}
          customSelectStyles={customSelectStyles}
          onRename={handleRenameCategory}
        />
            </div>

            {/* Search */}
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, catégorie, code-barre ou prix..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 w-full sm:w-64 text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-4 bg-gray-600 text-white text-sm hover:bg-gray-700  border border-gray-300 focus:ring-1 focus:ring-gray-400"
              >
                Rechercher
              </button>
              <button
                onClick={fetchProducts}
                className="flex items-center gap-2 px-3 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50  focus:ring-1 focus:ring-gray-400"
                title="Réinitialiser la recherche"
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
            </form>
          </div>
        </div>

        {/* Products Count */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="text-sm text-gray-600">
            {filteredProducts.length} produit(s) trouvé(s)
            {(categoryFilter.value !== "all" || stockFilter.value !== "all") && (
              <span className="text-xs text-gray-500 ml-2">
                (filtré sur {products.length} total)
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 uppercase hover:text-gray-700"
                    title="Trier par nom (A-Z / Z-A)"
                  >
                    Nom
                    {sortField === "name" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  <button
                    onClick={() => handleSort("price")}
                    className="flex items-center gap-1 uppercase hover:text-gray-700"
                  >
                    Prix
                    {sortField === "price" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  <button
                    onClick={() => handleSort("stock")}
                    className="flex items-center gap-1 uppercase hover:text-gray-700"
                  >
                    Stock
                    {sortField === "stock" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                {productFields.category && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Promotion
                </th>
                {productFields.barcode && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code à barre
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 ">
                    <td className="px-4 py-3">
                      <div className="w-12 h-12  flex items-center justify-center overflow-hidden border border-gray-200 mix-blend-multiply bg-white">
                        {getProductImageUrl(product) ? (
                          <img src={getProductImageUrl(product)!} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          {product.name}
                          {isParentProduct(product) && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1 border border-indigo-100 rounded">Varié</span>}
                          {product.parent_id && <span className="text-[10px] bg-gray-50 text-gray-500 px-1 border border-gray-200 rounded">Variante</span>}
                        </span>
                        {productFields.sku && (
                          <span className="text-xs text-gray-400">{product.sku}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-bold">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        product.stock > 10 ? "bg-green-100 text-green-800" : product.stock > 0 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                      }`}>
                        {productFields.has_sub_units && product.has_sub_units && product.pieces_per_box ? (
                          `${Math.floor(product.stock)} B + ${Math.round((product.stock % 1) * product.pieces_per_box)} U`
                        ) : (
                          `${product.stock} ${product.sell_by_weight && productFields.sell_by_weight ? 'kg' : 'u'}`
                        )}
                      </span>
                    </td>
                    {productFields.category && (
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {product.category || "-"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {(product.remise_percentage && product.remise_percentage > 0) || (product.Promotions && product.Promotions.some((p) => p.is_active)) ? (
                        <span className="text-green-600 bg-green-50 px-2 py-2 border border-green-100 text-sm flex items-center gap-1 w-fit">
                           Oui
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Non</span>
                      )}
                    </td>
                    {productFields.barcode && (
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {product.barcode || "-"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                    <div className="flex gap-4">
                        <button onClick={() => !isWorker && handleEditProduct(product)} className="px-6 py-4 border hover:bg-gray-100 text-gray-600"><Pencil /></button>
                        <button onClick={() => !isWorker && openDeleteModal(product)} className="px-6 py-4 border hover:bg-red-50 text-red-600"><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

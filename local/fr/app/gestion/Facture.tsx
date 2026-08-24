"use client";
import { Search, Plus, Trash2, Eye, CheckCircle, XCircle, Download, FileText, Calendar, User, Phone, Mail, MapPin, Package, Clock, RefreshCw, Pencil, ChevronDown, ChevronUp, X, TriangleAlert, Info } from 'lucide-react';

import React, { useState, useEffect, useRef, useCallback } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import Image from "next/image";
import Select from 'react-select';
import dinar from "../../assets/dinar.png";

import { useAlert } from "../../components/AlertContext";

// Initialize pdfmake with fonts
(pdfMake as any).vfs = (pdfFonts as any).vfs;

// ==================== TYPES ====================
interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  stock: number;
  price: number;
  cost_price?: number;
  ProductImages?: any[];
  category?: string;
}

interface FactureItem {
  id?: number;
  product_id: number;
  product?: Product;   // local (form/create)
  Product?: Product;   // Sequelize association (API response)
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface Facture {
  id: number;
  facture_number: string;
  supplier_name: string;
  supplier_info: string;
  supplier_phone?: string;
  supplier_email?: string;
  supplier_address?: string;
  facture_date: string;
  total_amount: number;
  comment: string;
  status: "draft" | "confirmed" | "cancelled";
  created_at: string;
  updated_at: string;
  FactureItems: FactureItem[];
}

interface SelectOption {
  value: string;
  label: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

// ==================== HELPER FUNCTIONS ====================
const formatPrice = (price: number): string =>
  new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price) + " DT";

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const formatDateShort = (dateString: string): string =>
  new Date(dateString).toLocaleDateString("fr-FR");

const generateFactureNumber = (): string =>
  `FACT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;

// ==================== CUSTOM HOOKS ====================
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const useEscapeKey = (onEscape: () => void, enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onEscape, enabled]);
};

// ==================== MAIN COMPONENT ====================
export default function FactureManagementPage() {
  // State
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { showConfirm } = useAlert();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const [statusFilterOption, setStatusFilterOption] = useState<SelectOption>({
    value: "all",
    label: "Tous les statuts",
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("facture_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form state (for both create and edit)
  const [formData, setFormData] = useState({
    supplier_name: "",
    supplier_info: "",
    facture_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date()),
    comment: "",
    supplier_phone: "",
    supplier_email: "",
    supplier_address: "",
  });
  const [items, setItems] = useState<FactureItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // ==================== TOAST NOTIFICATIONS ====================
  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // ==================== API FUNCTIONS ====================
  const fetchFactures = useCallback(async () => {
    try {
      if (initialLoading) setLoading(true);
      setError(null);
      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Token d'authentification introuvable. Veuillez vous reconnecter.");
        setInitialLoading(false);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (debouncedSearch.trim()) {
        if (debouncedSearch.toUpperCase().startsWith("FACT-")) {
          params.append("facture_number", debouncedSearch);
        } else {
          params.append("supplier", debouncedSearch);
        }
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.append("sort", sortField);
      params.append("order", sortDirection);

      const response = await fetch(
        `http://localhost:4000/api/factures?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Échec du chargement des factures");

      const data = await response.json();
      setFactures(data.factures || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
      addToast(message, "error");
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sortField, sortDirection, addToast]);



  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:4000/api/products?q=${encodeURIComponent(query)}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.products || []);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Error searching products:", err);
    }
  }, []);

  // ==================== STATISTICS ====================
  const stats = React.useMemo(() => {
    return {
      total: factures.length,
      draft: factures.filter((f) => f.status === "draft").length,
      confirmed: factures.filter((f) => f.status === "confirmed").length,
      cancelled: factures.filter((f) => f.status === "cancelled").length,
      totalAmount: factures.reduce((sum, f) => sum + f.total_amount, 0),
    };
  }, [factures]);

  const filteredFactures = React.useMemo(() => {
    let result = factures;
    if (activeTab !== "all") {
      result = result.filter((f) => f.status === activeTab);
    }
    return result;
  }, [factures, activeTab]);

  // ==================== ITEM MANAGEMENT ====================
  const addProductToItems = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
              ...item,
              quantity: item.quantity + 1,
              total_cost: (item.quantity + 1) * item.unit_cost,
            }
            : item
        );
      }
      const unitCost = product.cost_price || product.price * 0.8;
      return [
        ...prev,
        {
          product_id: product.id,
          product,
          quantity: 1,
          unit_cost: unitCost,
          total_cost: unitCost,
        },
      ];
    });
    setProductSearch("");
    setSearchResults([]);
    setShowSearchResults(false);
    addToast("Produit ajouté", "success");
  }, [addToast]);

  const quickAddProduct = useCallback((product: Product, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
              ...item,
              quantity: item.quantity + quantity,
              total_cost: (item.quantity + quantity) * item.unit_cost,
            }
            : item
        );
      }
      const unitCost = product.cost_price || product.price * 0.8;
      return [
        ...prev,
        {
          product_id: product.id,
          product,
          quantity,
          unit_cost: unitCost,
          total_cost: unitCost * quantity,
        },
      ];
    });
    addToast(`${quantity}x ${product.name} ajouté(s)`, "success");
  }, [addToast]);

  const updateItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, quantity, total_cost: quantity * item.unit_cost }
          : item
      )
    );
  }, []);

  const updateItemUnitCost = useCallback((index: number, unit_cost: number) => {
    if (unit_cost < 0) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, unit_cost, total_cost: item.quantity * unit_cost }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    addToast("Produit supprimé", "info");
  }, [addToast]);

  const clearAllItems = useCallback(async () => {
    if (items.length > 0 && await showConfirm("Supprimer tous les produits ?")) {
      setItems([]);
      addToast("Liste vidée", "info");
    }
  }, [items.length, addToast, showConfirm]);

  const calculateTotal = React.useMemo(() =>
    items.reduce((sum, item) => sum + item.total_cost, 0),
    [items]
  );

  // ==================== FACTURE ACTIONS ====================
  const createFacture = useCallback(async () => {
    if (!formData.supplier_name.trim()) {
      addToast("Nom du fournisseur requis", "error");
      return;
    }
    if (items.length === 0) {
      addToast("Ajoutez au moins un produit", "error");
      return;
    }

    try {
      setActionLoading(-1);
      const token = localStorage.getItem("authToken");

      const response = await fetch("http://localhost:4000/api/factures", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          facture_number: generateFactureNumber(),
          supplier_name: formData.supplier_name,
          supplier_info: formData.supplier_info,
          supplier_phone: formData.supplier_phone,
          supplier_email: formData.supplier_email,
          supplier_address: formData.supplier_address,
          facture_date: formData.facture_date,
          comment: formData.comment,
          items: items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
          })),
        }),
      });

      if (!response.ok) throw new Error("Échec de la création");

      const data = await response.json();
      if (data.success) {
        setShowCreateForm(false);
        resetForm();
        fetchFactures();
        addToast("Facture créée avec succès !", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de la création";
      addToast(message, "error");
    } finally {
      setActionLoading(null);
    }
  }, [formData, items, fetchFactures, addToast]);

  // 🔧 NEW: Update existing facture
  const updateFacture = useCallback(async () => {
    if (!selectedFacture) return;
    if (!formData.supplier_name.trim()) {
      addToast("Nom du fournisseur requis", "error");
      return;
    }
    if (items.length === 0) {
      addToast("Ajoutez au moins un produit", "error");
      return;
    }

    try {
      setActionLoading(selectedFacture.id);
      const token = localStorage.getItem("authToken");

      const response = await fetch(`http://localhost:4000/api/factures/${selectedFacture.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier_name: formData.supplier_name,
          supplier_info: formData.supplier_info,
          supplier_phone: formData.supplier_phone,
          supplier_email: formData.supplier_email,
          supplier_address: formData.supplier_address,
          facture_date: formData.facture_date,
          comment: formData.comment,
          items: items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
          })),
        }),
      });

      if (!response.ok) throw new Error("Échec de la modification");

      const data = await response.json();
      if (data.success) {
        setShowEditForm(false);
        setSelectedFacture(null);
        resetForm();
        fetchFactures();
        addToast("Facture modifiée avec succès !", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de la modification";
      addToast(message, "error");
    } finally {
      setActionLoading(null);
    }
  }, [selectedFacture, formData, items, fetchFactures, addToast]);

  const confirmFacture = useCallback(async (factureId: number) => {
    if (!await showConfirm("Confirmer cette facture ? Le stock sera mis à jour.")) return;

    try {
      setActionLoading(factureId);
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:4000/api/factures/${factureId}/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Échec de la confirmation");

      fetchFactures();
      addToast("Facture confirmée et stock mis à jour !", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de la confirmation";
      addToast(message, "error");
    } finally {
      setActionLoading(null);
    }
  }, [fetchFactures, addToast, showConfirm]);

  const cancelFacture = useCallback(async (factureId: number) => {
    if (!await showConfirm("Annuler cette facture ? Cette action est irréversible.")) return;

    try {
      setActionLoading(factureId);
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:4000/api/factures/${factureId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Échec de l'annulation");

      fetchFactures();
      addToast("Facture annulée", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de l'annulation";
      addToast(message, "error");
    } finally {
      setActionLoading(null);
    }
  }, [fetchFactures, addToast, showConfirm]);

  // View facture details
  const viewFactureDetails = useCallback(async (facture: Facture) => {
    setSelectedFacture(facture);
    setShowDetails(true);
  }, []);

  // 🔧 NEW: Open edit form with existing facture data
  const openEditForm = useCallback(async (facture: Facture) => {
    setSelectedFacture(facture);

    // Populate form with existing data
    setFormData({
      supplier_name: facture.supplier_name,
      supplier_info: facture.supplier_info || "",
      supplier_phone: facture.supplier_phone || "",
      supplier_email: facture.supplier_email || "",
      supplier_address: facture.supplier_address || "",
      facture_date: facture.facture_date,
      comment: facture.comment || "",
    });

    // Populate items
    setItems(facture.FactureItems.map(item => ({
      ...item,
      product: item.product || undefined,
    })));

    setShowEditForm(true);
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      supplier_name: "",
      supplier_info: "",
      facture_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date()),
      comment: "",
      supplier_phone: "",
      supplier_email: "",
      supplier_address: "",
    });
    setItems([]);
    setProductSearch("");
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  // ==================== SORT & FILTER ====================
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  const handleStatusFilterChange = useCallback((newValue: SelectOption | null) => {
    if (newValue) {
      setStatusFilterOption(newValue);
      setStatusFilter(newValue.value);
    }
  }, []);

  // ==================== EXPORT FUNCTIONS ====================
  const exportToPDF = useCallback(() => {
    if (!selectedFacture) return;

    const factureItems = selectedFacture.FactureItems || [];
    const tableBody = [
      [
        { text: "Produit", style: "tableHeader" },
        { text: "Quantité", style: "tableHeader" },
        { text: "Prix Unitaire", style: "tableHeader" },
        { text: "Total", style: "tableHeader" },
      ],
      ...factureItems.map((item: FactureItem) => {
        const prod = (item as any).Product || item.product;
        return [
        prod?.name || `Produit #${item.product_id}`,
        item.quantity.toString(),
        formatPrice(item.unit_cost),
        formatPrice(item.total_cost),
        ];
      }),
    ];

    tableBody.push([
      {
        text: "TOTAL",
        style: "totalLabel",
        colSpan: 3,
        alignment: "right",
      } as any,
      "" as any,
      "" as any,
      {
        text: formatPrice(selectedFacture.total_amount),
        style: "totalAmount",
      },
    ]);

    const docDefinition: any = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          columns: [
            {
              stack: [
                { text: "FACTURE", style: "header" },
                { text: `N° ${selectedFacture.facture_number}`, style: "factureNumber" },
                { text: `Date: ${formatDate(selectedFacture.facture_date)}`, style: "date" },
                {
                  text: `Statut: ${selectedFacture.status.toUpperCase()}`,
                  style: selectedFacture.status === "confirmed" ? "statusConfirmed" :
                    selectedFacture.status === "draft" ? "statusDraft" : "statusCancelled",
                },
              ],
              width: "50%",
            },
            {
              stack: [
                { text: "FOURNISSEUR", style: "sectionHeader" },
                { text: selectedFacture.supplier_name, style: "supplierName" },
                ...(selectedFacture.supplier_address ? [{ text: selectedFacture.supplier_address, style: "supplierInfo" }] : []),
                ...(selectedFacture.supplier_phone ? [{ text: `Tél: ${selectedFacture.supplier_phone}`, style: "supplierInfo" }] : []),
                ...(selectedFacture.supplier_email ? [{ text: `Email: ${selectedFacture.supplier_email}`, style: "supplierInfo" }] : []),
                ...(selectedFacture.supplier_info ? [{ text: selectedFacture.supplier_info, style: "supplierInfo" }] : []),
              ],
              width: "50%",
              alignment: "right",
            },
          ],
          margin: [0, 0, 0, 30],
        },
        {
          stack: [
            { text: "DÉTAIL DES PRODUITS", style: "sectionHeader" },
            {
              table: {
                headerRows: 1,
                widths: ["*", "auto", "auto", "auto"],
                body: tableBody,
              },
              layout: {
                hLineWidth: (i: number, node: any) => i === 0 || i === node.table.body.length ? 1 : 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => "#374151",
                vLineColor: () => "#374151",
                fillColor: (rowIndex: number) => {
                  if (rowIndex === 0) return "#374151";
                  if (rowIndex === tableBody.length - 1) return "#f1f5f9";
                  return rowIndex % 2 === 0 ? "#f8fafc" : null;
                },
              },
            },
          ],
        },
        ...(selectedFacture.comment ? [{
          stack: [
            { text: "OBSERVATIONS", style: "sectionHeader", margin: [0, 20, 0, 5] },
            { text: selectedFacture.comment, style: "comment", margin: [0, 0, 0, 20] },
          ],
        }] : []),
        {
          columns: [
            { text: "Merci pour votre confiance", style: "thankYou", width: "50%" },
            {
              text: `Généré le ${formatDateShort(new Date().toISOString())}`,
              style: "footer",
              width: "50%",
              alignment: "right",
            },
          ],
          margin: [0, 30, 0, 0],
        },
      ],
      styles: {
        header: { fontSize: 24, bold: true, color: "#1e293b" },
        factureNumber: { fontSize: 14, bold: true, color: "#374151" },
        date: { fontSize: 10, color: "#64748b" },
        statusConfirmed: { fontSize: 10, color: "#059669", bold: true },
        statusDraft: { fontSize: 10, color: "#d97706", bold: true },
        statusCancelled: { fontSize: 10, color: "#dc2626", bold: true },
        sectionHeader: { fontSize: 12, bold: true, color: "#374151", margin: [0, 0, 0, 5] },
        supplierName: { fontSize: 11, bold: true, color: "#1e293b" },
        supplierInfo: { fontSize: 9, color: "#64748b", margin: [0, 2, 0, 0] },
        tableHeader: { fontSize: 9, bold: true, color: "#ffffff", fillColor: "#374151" },
        totalLabel: { fontSize: 10, bold: true, color: "#1e293b", alignment: "right" },
        totalAmount: { fontSize: 10, bold: true, color: "#1e293b" },
        comment: { fontSize: 9, color: "#64748b", italics: true },
        thankYou: { fontSize: 9, color: "#64748b", italics: true },
        footer: { fontSize: 8, color: "#94a3b8" },
      },
      defaultStyle: { fontSize: 9, color: "#374151" },
    };

    pdfMake.createPdf(docDefinition).download(`facture-${selectedFacture.facture_number}.pdf`);
    addToast("PDF téléchargé", "success");
  }, [selectedFacture, addToast]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchFactures();
  }, [fetchFactures]);

  useEffect(() => {
    if (debouncedProductSearch.trim()) {
      searchProducts(debouncedProductSearch);
    }
  }, [debouncedProductSearch, searchProducts]);

  // Close modals on Escape
  useEscapeKey(() => {
    if (showDetails) setShowDetails(false);
    if (showCreateForm) {
      setShowCreateForm(false);
      resetForm();
    }
    if (showEditForm) {
      setShowEditForm(false);
      setSelectedFacture(null);
      resetForm();
    }
  }, showDetails || showCreateForm || showEditForm);

  // Close search results on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus on modal open
  useEffect(() => {
    if ((showCreateForm || showEditForm) && formRef.current) {
      const input = formRef.current.querySelector("input") as HTMLInputElement;
      input?.focus();
    }
  }, [showCreateForm, showEditForm]);

  // ==================== SELECT STYLES ====================
  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      border: "1px solid #d1d5db",
      borderRadius: "0px",
      boxShadow: state.isFocused ? "0 0 0 1px #9ca3af" : "none",
      "&:hover": { borderColor: "#9ca3af" },
      minHeight: "53px",
      padding: "0px 4px",
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#4b5563" : state.isFocused ? "#f3f4f6" : "white",
      color: state.isSelected ? "white" : "#374151",
      padding: "12px 16px",
      fontSize: "14px",
      "&:hover": { backgroundColor: "#f3f4f6" },
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: "0px",
      border: "1px solid #d1d5db",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    }),
    menuList: (provided: any) => ({ ...provided, padding: "4px 0" }),
    singleValue: (provided: any) => ({ ...provided, fontSize: "14px", color: "#374151" }),
    placeholder: (provided: any) => ({ ...provided, fontSize: "14px", color: "#9ca3af" }),
    dropdownIndicator: (provided: any) => ({ ...provided, padding: "8px" }),
    clearIndicator: (provided: any) => ({ ...provided, padding: "8px" }),
    valueContainer: (provided: any) => ({ ...provided, padding: "4px 12px" }),
    input: (provided: any) => ({ ...provided, margin: "0px", padding: "0px" }),
  };

  const statusOptions: SelectOption[] = [
    { value: "all", label: "Tous les statuts" },
    { value: "draft", label: "Brouillon" },
    { value: "confirmed", label: "Confirmé" },
    { value: "cancelled", label: "Annulé" },
  ];

  // ==================== RENDER ====================
  // Initial full-page loading only
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className=" rounded-full h-10 w-10 border-2 border-gray-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white px-5 pb-10">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded shadow-lg border ${toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : toast.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-gray-50 border-gray-200 text-gray-800"
              }`}
          >
            {toast.type === "success" && <CheckCircle className="w-4 h-4" />}
            {toast.type === "error" && <TriangleAlert className="w-4 h-4" />}
            {toast.type === "info" && <Info className="w-4 h-4" />}
            <span className="text-sm">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Gestion des Factures</h1>
            <p className="text-sm text-gray-600">Gérez vos factures fournisseurs et suivez vos achats</p>
          </div>
          <button
            className="flex items-center gap-1 px-4 py-4 bg-gray-600 text-white hover:bg-gray-700  mt-4 lg:mt-0 border border-gray-300 focus:ring-1 focus:ring-gray-400"
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            aria-label="Créer une nouvelle facture"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Nouvelle Facture</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total", value: stats.total, icon: FileText, color: "text-gray-900" },
            { label: "Brouillons", value: stats.draft, icon: Clock, color: "text-yellow-600" },
            { label: "Confirmées", value: stats.confirmed, icon: CheckCircle, color: "text-green-600" },
            { label: "Annulées", value: stats.cancelled, icon: XCircle, color: "text-red-600" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className="w-5 h-5 text-gray-500" />
              </div>
            </div>
          ))}
          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">Montant Total</p>
                <p className="text-xl font-semibold text-gray-900">{formatPrice(stats.totalAmount)}</p>
              </div>
              <Image src={dinar.src} className="w-11 h-10" width={11} height={10} alt="Dinar" />
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
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white border border-gray-200">
        {/* Tabs & Filters */}
        <div className="border-b border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 gap-4">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "Toutes", count: stats.total },
                { id: "draft", label: "Brouillons", count: stats.draft },
                { id: "confirmed", label: "Confirmées", count: stats.confirmed },
                { id: "cancelled", label: "Annulées", count: stats.cancelled },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium  border-b-2 ${activeTab === tab.id
                      ? "border-gray-600 text-gray-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                >
                  {tab.label}
                  <span className="ml-1.5 bg-gray-100 text-gray-600 px-1.5 py-0.5 text-xs rounded">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher (fournisseur ou FACT-...)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchFactures()}
                  className={`pl-10 pr-4 py-3 border focus:outline-none focus:ring-1 focus:ring-gray-400 w-full sm:w-64 text-sm  ${
                    loading ? "bg-gray-50 border-gray-200 opacity-70" : "bg-white border-gray-300"
                  }`}
                  aria-label="Rechercher des factures"
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className=" rounded-full h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent" />
                  </div>
                )}
              </div>
              <div className="w-44">
                <Select
                  value={statusFilterOption}
                  onChange={handleStatusFilterChange}
                  options={statusOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                  aria-label="Filtrer par statut"
                />
              </div>
              <button
                onClick={fetchFactures}
                className="flex items-center gap-1.5 px-3 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50  text-sm focus:ring-1 focus:ring-gray-400"
                aria-label="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { label: "Facture", field: "facture_number" },
                  { label: "Fournisseur", field: null },
                  { label: "Date", field: "facture_date" },
                  { label: "Montant", field: "total_amount" },
                  { label: "Statut", field: null },
                  { label: "Actions", field: null },
                ].map((col, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    scope="col"
                  >
                    {col.field ? (
                      <button
                        onClick={() => handleSort(col.field!)}
                        className="flex items-center gap-1 uppercase hover:text-gray-700 "
                        aria-label={`Trier par ${col.label}`}
                      >
                        {col.label}
                        {sortField === col.field &&
                          (sortDirection === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFactures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center text-gray-500">
                      <FileText className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium mb-1">Aucune facture trouvée</p>
                      <p className="text-sm mb-4">
                        {searchQuery || statusFilter !== "all"
                          ? "Ajustez vos filtres de recherche"
                          : "Créez votre première facture"}
                      </p>
                      {!searchQuery && statusFilter === "all" && (
                        <button
                          onClick={() => {
                            resetForm();
                            setShowCreateForm(true);
                          }}
                          className="px-4 py-2 bg-gray-600 text-white text-sm hover:bg-gray-700  border border-gray-300"
                        >
                          Créer une facture
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFactures.map((facture) => (
                  <tr key={facture.id} className="hover:bg-gray-50 ">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{facture.facture_number}</div>
                        <div className="text-xs text-gray-500">{facture.FactureItems?.length || 0} produits</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{facture.supplier_name}</div>
                        {facture.supplier_info && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{facture.supplier_info}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDateShort(facture.facture_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{formatPrice(facture.total_amount)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-none ${facture.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : facture.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                      >
                        {facture.status === "confirmed" && <CheckCircle className="w-3 h-3" />}
                        {facture.status === "draft" && <Clock className="w-3 h-3" />}
                        {facture.status === "cancelled" && <XCircle className="w-3 h-3" />}
                        {facture.status === "confirmed" ? "Confirmé" : facture.status === "draft" ? "Brouillon" : "Annulé"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => viewFactureDetails(facture)}
                          className="flex items-center gap-1 px-6 py-4 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100  border border-gray-300"
                          title="Voir détails"
                          aria-label={`Voir détails de ${facture.facture_number}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Détails
                        </button>
                        {facture.status === "draft" && (
                          <>
                          
                            <button
                              onClick={() => confirmFacture(facture.id)}
                              disabled={actionLoading === facture.id}
                              className="flex items-center gap-1 px-6 py-4 text-xs text-green-600 hover:text-green-800 hover:bg-green-50  border border-gray-300 disabled:opacity-50"
                              title="Confirmer"
                            >
                              {actionLoading === facture.id ? (
                                <span className="w-3.5 h-3.5  rounded-full border-2 border-green-600 border-t-transparent" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Confirmer
                            </button>
                            <button
                              onClick={() => cancelFacture(facture.id)}
                              disabled={actionLoading === facture.id}
                              className="flex items-center gap-1 px-6 py-4 text-xs text-red-600 hover:text-red-800 hover:bg-red-50  border border-gray-300 disabled:opacity-50"
                              title="Annuler"
                            >
                              {actionLoading === facture.id ? (
                                <span className="w-3.5 h-3.5  rounded-full border-2 border-red-600 border-t-transparent" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              Annuler
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedFacture(facture);
                            exportToPDF();
                          }}
                          className="p-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100  border border-gray-300 rounded-none"
                          title="Télécharger PDF"
                          aria-label={`Exporter ${facture.facture_number} en PDF`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedFacture && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div ref={modalRef} className="bg-white w-full max-w-5xl max-h-[95vh] overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
                    Détails de la Facture
                  </h2>
                  <p className="text-sm text-gray-600">N° {selectedFacture.facture_number}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-1.5 px-6 py-4 bg-gray-600 text-white text-sm hover:bg-gray-700  border border-gray-300"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600  rounded-none"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5 inline" /> Fermer
                  </button>
                </div>
              </div>

              {/* Loading State for Details */}
              {detailsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className=" rounded-full h-10 w-10 border-2 border-gray-600 border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* Invoice Preview */}
                  <div className="bg-white border border-gray-200 print:border-0">
                    <div className="bg-gray-100 p-6 print:bg-white print:p-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="text-2xl font-semibold mb-1">FACTURE</h1>
                          <p className="text-gray-600 text-sm">N° {selectedFacture.facture_number}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-600 text-sm">Date</div>
                          <div className="text-black text-sm font-medium">{formatDateShort(selectedFacture.facture_date)}</div>
                          <span
                            className={`mt-1 px-2 py-0.5 text-xs font-medium inline-block rounded-none ${selectedFacture.status === "confirmed"
                                ? "bg-green-600 text-white"
                                : selectedFacture.status === "draft"
                                  ? "bg-yellow-600 text-white"
                                  : "bg-red-600 text-white"
                              }`}
                          >
                            {selectedFacture.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 🔧 FIX: Supplier Information - ALL FIELDS NOW DISPLAY */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 print:p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">FOURNISSEUR</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="font-medium text-gray-900">{selectedFacture.supplier_name}</p>
                          {selectedFacture.supplier_address && (
                            <p className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {selectedFacture.supplier_address}
                            </p>
                          )}
                          {selectedFacture.supplier_phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              {selectedFacture.supplier_phone}
                            </p>
                          )}
                          {selectedFacture.supplier_email && (
                            <p className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              {selectedFacture.supplier_email}
                            </p>
                          )}
                          {selectedFacture.supplier_info && (
                            <p className="text-gray-600 mt-1">{selectedFacture.supplier_info}</p>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 print:bg-transparent print:p-0">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">RÉSUMÉ</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Nombre de produits:</span>
                            <span className="font-medium text-gray-900">{selectedFacture.FactureItems?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Statut:</span>
                            <span className={`font-medium ${selectedFacture.status === "confirmed" ? "text-green-600" :
                                selectedFacture.status === "draft" ? "text-yellow-600" : "text-red-600"
                              }`}>
                              {selectedFacture.status === "confirmed" ? "Confirmé" :
                                selectedFacture.status === "draft" ? "Brouillon" : "Annulé"}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="text-gray-600 font-medium">Total:</span>
                            <span className="font-bold text-gray-900">{formatPrice(selectedFacture.total_amount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-6 print:px-4 print:pb-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">PRODUITS</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">Produit</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">Qté</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border-b">Prix</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border-b">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedFacture.FactureItems || []).map((item, idx) => {
                              // Sequelize returns the association capitalised (item.Product) when fetched from API
                              const prod = (item as any).Product || item.product;
                              return (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {prod?.name || `Produit #${item.product_id}`}
                                  </div>
                                  {prod?.sku && (
                                    <div className="text-xs text-gray-500">SKU: {prod.sku}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-gray-600">{item.quantity}</td>
                                <td className="px-4 py-3 text-right text-sm text-gray-600">{formatPrice(item.unit_cost)}</td>
                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                  {formatPrice(item.total_cost)}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50">
                              <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                TOTAL:
                              </td>
                              <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                                {formatPrice(selectedFacture.total_amount)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {selectedFacture.comment && (
                      <div className="px-6 pb-6 print:px-4 print:pb-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">OBSERVATIONS</h3>
                        <div className="bg-gray-50 border border-gray-200 p-4 print:bg-transparent print:border-0 print:p-0">
                          <p className="text-sm text-gray-700">{selectedFacture.comment}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 print:bg-transparent print:border-0 print:p-0">
                      <div className="text-center text-xs text-gray-500">
                        <p>Généré le {formatDateShort(new Date().toISOString())}</p>
                        <p className="mt-0.5">Merci pour votre confiance</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔧 NEW: Edit Facture Modal */}
      {showEditForm && selectedFacture && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div
            ref={formRef}
            className="bg-white w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-200"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 id="edit-modal-title" className="text-xl font-semibold text-gray-900">
                    Modifier la Facture
                  </h2>
                  <p className="text-sm text-gray-600">N° {selectedFacture.facture_number}</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedFacture(null);
                    resetForm();
                  }}
                  className="p-4 flex items-center gap-2 bg-gray-100 text-gray-500 hover:text-gray-600  rounded-none"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                  Fermer
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supplier Info */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      Fournisseur
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nom *
                        </label>
                        <input
                          type="text"
                          value={formData.supplier_name}
                          onChange={(e) =>
                            setFormData({ ...formData, supplier_name: e.target.value })
                          }
                          className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                          placeholder="Nom du fournisseur"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            <Phone className="w-3 h-3 inline mr-1" />
                            Tél
                          </label>
                          <input
                            type="tel"
                            value={formData.supplier_phone}
                            onChange={(e) =>
                              setFormData({ ...formData, supplier_phone: e.target.value })
                            }
                            className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                            placeholder="+216"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            <Mail className="w-3 h-3 inline mr-1" />
                            Email
                          </label>
                          <input
                            type="email"
                            value={formData.supplier_email}
                            onChange={(e) =>
                              setFormData({ ...formData, supplier_email: e.target.value })
                            }
                            className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                            placeholder="email@exemple.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          Adresse
                        </label>
                        <input
                          type="text"
                          value={formData.supplier_address}
                          onChange={(e) =>
                            setFormData({ ...formData, supplier_address: e.target.value })
                          }
                          className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                          placeholder="Adresse complète"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Facture
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={formData.facture_date}
                          onChange={(e) =>
                            setFormData({ ...formData, facture_date: e.target.value })
                          }
                          className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Commentaire
                        </label>
                        <textarea
                          value={formData.comment}
                          onChange={(e) =>
                            setFormData({ ...formData, comment: e.target.value })
                          }
                          className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                          rows={2}
                          placeholder="Notes..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      Ajouter des Produits
                    </h3>
                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        onFocus={() => debouncedProductSearch && setShowSearchResults(true)}
                        className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm pr-10"
                        placeholder="Rechercher par nom, SKU, code-barre..."
                        aria-label="Rechercher un produit"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

                      {showSearchResults && searchResults.length > 0 && (
                        <div
                          ref={searchResultsRef}
                          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 max-h-60 overflow-y-auto shadow-lg"
                          role="listbox"
                        >
                          {searchResults.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer "
                              onClick={() => addProductToItems(product)}
                              role="option"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {product.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    SKU: {product.sku} | Stock: {product.stock} | {formatPrice(product.price)}
                                  </div>
                                  {product.category && (
                                    <div className="text-xs text-gray-600 mt-0.5">{product.category}</div>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-3 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAddProduct(product, 1);
                                    }}
                                    className="px-2 py-4 bg-gray-600 text-white text-xs hover:bg-gray-700  border border-gray-300 rounded-none"
                                  >
                                    +1
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAddProduct(product, 5);
                                    }}
                                    className="px-2 py-4 bg-gray-600 text-white text-xs hover:bg-gray-700  border border-gray-300 rounded-none"
                                  >
                                    +5
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="bg-white border border-gray-200">
                      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          Produits ({items.length})
                        </h3>
                        <button
                          onClick={clearAllItems}
                          className="flex items-center gap-1 px-4 py-4 text-sm text-red-600 hover:text-red-800 hover:bg-red-50  border border-gray-300"
                        >
                          <Trash2 className="w-5 h-5" />
                          Tout supprimer
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                Produit
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                Quantité
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border-b">
                                Prix Unitaire
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border-b">
                                Total
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.product?.name || "Produit inconnu"}
                                  </div>
                                  {item.product?.sku && (
                                    <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                      className="w-7 h-7 flex items-center justify-center border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed  text-sm"
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItemQuantity(index, parseInt(e.target.value) || 1)
                                      }
                                      className="w-14 px-2 py-1 border border-gray-300 text-center focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                                    />
                                    <button
                                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                      className="w-7 h-7 flex items-center justify-center border border-gray-300 hover:bg-gray-100  text-sm"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.unit_cost}
                                    onChange={(e) =>
                                      updateItemUnitCost(index, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 px-2 py-1 border border-gray-300 text-right focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                  {formatPrice(item.total_cost)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => removeItem(index)}
                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50  border border-gray-300"
                                    title="Supprimer"
                                    aria-label="Supprimer ce produit"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                TOTAL:
                              </td>
                              <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                                {formatPrice(calculateTotal)}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowEditForm(false);
                        setSelectedFacture(null);
                        resetForm();
                      }}
                      className="px-4 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 "
                    >
                      Annuler
                    </button>
                    <button
                      onClick={updateFacture}
                      disabled={
                        actionLoading !== null ||
                        !formData.supplier_name.trim() ||
                        items.length === 0
                      }
                      className="px-4 py-4 bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed  border border-gray-300 flex items-center gap-2"
                    >
                      {actionLoading === selectedFacture?.id ? (
                        <span className="w-4 h-4  rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Enregistrer les modifications
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
        >
          <div
            ref={formRef}
            className="bg-white w-full max-w-7xl max-h-[95vh] overflow-y-auto border border-gray-200"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 id="create-modal-title" className="text-xl font-semibold text-gray-900">
                    Nouvelle Facture
                  </h2>
                  <p className="text-sm text-gray-600">Créez une nouvelle facture fournisseur</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 "
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 inline" /> Fermer
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supplier Info */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      Fournisseur
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nom *
                        </label>
                        <input
                          type="text"
                          value={formData.supplier_name}
                          onChange={(e) =>
                            setFormData({ ...formData, supplier_name: e.target.value })
                          }
                          className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                          placeholder="Nom du fournisseur"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            <Phone className="w-3 h-3 inline mr-1" />
                            Tél
                          </label>
                          <input
                            type="tel"
                            value={formData.supplier_phone}
                            onChange={(e) =>
                              setFormData({ ...formData, supplier_phone: e.target.value })
                            }
                            className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                            placeholder="+216"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            <Mail className="w-3 h-3 inline mr-1" />
                            Email
                          </label>
                          <input
                            type="email"
                            value={formData.supplier_email}
                            onChange={(e) =>
                              setFormData({ ...formData, supplier_email: e.target.value })
                            }
                            className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                            placeholder="email@exemple.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          Adresse
                        </label>
                        <input
                          type="text"
                          value={formData.supplier_address}
                          onChange={(e) =>
                            setFormData({ ...formData, supplier_address: e.target.value })
                          }
                          className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                          placeholder="Adresse complète"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Facture
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={formData.facture_date}
                          onChange={(e) =>
                            setFormData({ ...formData, facture_date: e.target.value })
                          }
                          className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Commentaire
                        </label>
                        <textarea
                          value={formData.comment}
                          onChange={(e) =>
                            setFormData({ ...formData, comment: e.target.value })
                          }
                          className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                          rows={2}
                          placeholder="Notes..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      Ajouter des Produits
                    </h3>
                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        onFocus={() => debouncedProductSearch && setShowSearchResults(true)}
                        className="w-full px-6 py-4.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm pr-10"
                        placeholder="Rechercher par nom, SKU, code-barre..."
                        aria-label="Rechercher un produit"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

                      {showSearchResults && searchResults.length > 0 && (
                        <div
                          ref={searchResultsRef}
                          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 max-h-60 overflow-y-auto shadow-lg"
                          role="listbox"
                        >
                          {searchResults.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer "
                              onClick={() => addProductToItems(product)}
                              role="option"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {product.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    SKU: {product.sku} | Stock: {product.stock} | {formatPrice(product.price)}
                                  </div>
                                  {product.category && (
                                    <div className="text-xs text-gray-600 mt-0.5">{product.category}</div>
                                  )}
                                </div>
                                <div className="flex gap-4 ml-3 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAddProduct(product, 1);
                                    }}
                                    className="px-2 py-1 bg-gray-600 text-white text-base hover:bg-gray-700  border border-gray-300"
                                  >
                                    +1
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAddProduct(product, 5);
                                    }}
                                    className="px-2 py-1 bg-gray-600 text-white text-base hover:bg-gray-700  border border-gray-300"
                                  >
                                    +5
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="bg-white border border-gray-200">
                      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          Produits ({items.length})
                        </h3>
                        <button
                          onClick={clearAllItems}
                          className="flex items-center gap-1 px-2 py-3 text-xs text-red-600 hover:text-red-800 hover:bg-red-50  border border-gray-300"
                        >
                          <Trash2 className="w-3 h-3" />
                          Tout supprimer
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                Produit
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                Quantité
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border-b">
                                Prix Unitaire
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase border-b">
                                Total
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.product?.name || "Produit inconnu"}
                                  </div>
                                  {item.product?.sku && (
                                    <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-4">
                                    <button
                                      onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                      className="w-12 h-10 p-4 flex items-center justify-center border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed  text-xl"
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItemQuantity(index, parseInt(e.target.value) || 1)
                                      }
                                      className="w-22 px-2 py-2 border border-gray-300 text-center focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                                    />
                                    <button
                                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                      className="w-12 h-10 p-4 flex items-center justify-center border border-gray-300 hover:bg-gray-100  text-xl"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.unit_cost}
                                    onChange={(e) =>
                                      updateItemUnitCost(index, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 px-2 py-2 border border-gray-300 text-right focus:outline-none focus:ring-1 focus:ring-gray-400 text-base"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right text-base font-medium text-gray-900">
                                  {formatPrice(item.total_cost)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => removeItem(index)}
                                    className="p-4 text-red-600 hover:text-red-800 hover:bg-red-50  border border-gray-300"
                                    title="Supprimer"
                                    aria-label="Supprimer ce produit"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                TOTAL:
                              </td>
                              <td className="px-4 py-3 text-right text-xl font-bold text-gray-900">
                                {formatPrice(calculateTotal)}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        resetForm();
                      }}
                      className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 "
                    >
                      Annuler
                    </button>
                    <button
                      onClick={createFacture}
                      disabled={
                        actionLoading !== null ||
                        !formData.supplier_name.trim() ||
                        items.length === 0
                      }
                      className="px-4 py-2.5 bg-gray-600 text-white text-sm hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed  border border-gray-300 flex items-center gap-2"
                    >
                      {actionLoading === -1 ? (
                        <span className="w-4 h-4  rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Créer la Facture
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

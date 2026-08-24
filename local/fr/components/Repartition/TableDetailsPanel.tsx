"use client";
import { useState, useEffect, useRef } from "react";
import {
  Users,
  MapPin,
  Clock,
  User,
  Plus,
  X,
  Merge,
  Trash2,
  ShoppingCart,
  ChevronRight,
  Check,
  CreditCard,
  Smartphone,
  Coffee,
  Utensils,
  Wine,
  Cake,
  Filter,
  Search,
  PlusCircle,
  MinusCircle,
  Package,
  Tag,
  Calendar,
  Eye,
  Receipt,
  ClipboardList,
  Printer,
  CheckCircle,
  Clock as ClockIcon,
  AlertCircle,
  Calculator,
  ExternalLink,
  Lock,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  description?: string;
  barcode?: string;
  ProductImages?: { url: string }[];
  printer?: string; // Added: printer field for each product
}

interface TableDetailsPanelProps {
  table: any;
  onCloseTable: (tableId: number) => void;
  onMergeTables: (fromTableId: number, toTableId: number) => void;
  onOpenTable: (tableId: number, customerCount: number) => void;
  onClosePanel: () => void;
  onDeleteTable: (tableId: number) => void;
  tables: any[];
  tableOrders: any[];
  onRefreshData: () => void;
  isAdmin: boolean;
}

export default function TableDetailsPanel({
  table,
  onCloseTable,
  onMergeTables,
  onOpenTable,
  onClosePanel,
  onDeleteTable,
  tables,
  tableOrders = [],
  onRefreshData,
  isAdmin,
}: TableDetailsPanelProps) {
  const [customerCount, setCustomerCount] = useState(1);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [orders, setOrders] = useState<any[]>(tableOrders);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination for products
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(20);
  
  interface CartItem {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes?: string;
    printer?: string; // Added: printer field for cart items
  }
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [showSessionOrdersModal, setShowSessionOrdersModal] = useState(false);
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);
  const [loadingSessionOrders, setLoadingSessionOrders] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [justOpenedTable, setJustOpenedTable] = useState(false);

  // Refs for performance
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const productListRef = useRef<HTMLDivElement>(null);

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.product_id === product.id);
      if (existingItem) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unit_price,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.price,
            total: product.price,
            notes: "",
            printer: product.printer || "kitchen", // Default to kitchen
          },
        ];
      }
    });
  };

  const calculateTableTotal = () => {
    if (!table.currentSession || table.status !== "occupied") {
      return 0;
    }
    if (!orders || orders.length === 0) return 0;
    return orders.reduce((total, order) => total + (order.total || 0), 0);
  };

  const tableTotal = calculateTableTotal();

  const loadTableOrders = async () => {
    if (!table.currentSession) return;
    setLoadingOrders(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `http://localhost:4000/api/orders/table/${table.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadSessionOrders = async () => {
    if (!table.currentSession) return;
    setLoadingSessionOrders(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `http://localhost:4000/api/orders/session/${table.currentSession.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSessionOrders(data.orders || []);
        setShowSessionOrdersModal(true);
      } else {
        console.error("Failed to fetch session orders");
        const fallbackRes = await fetch(
          `http://localhost:4000/api/orders/table/${table.id}/active`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setSessionOrders(fallbackData.orders || []);
          setShowSessionOrdersModal(true);
        }
      }
    } catch (error) {
      console.error("Error loading session orders:", error);
    } finally {
      setLoadingSessionOrders(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`http://localhost:4000/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOrderDetails = async (orderId: number) => {
    setLoadingOrderDetails(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
        setShowOrderDetailsModal(true);
      }
    } catch (error) {
      console.error("Error loading order details:", error);
      const orderFromList = orders.find((o) => o.id === orderId);
      if (orderFromList) {
        setSelectedOrder(orderFromList);
        setShowOrderDetailsModal(true);
      }
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handleViewOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  };

  const handleViewSessionOrders = () => {
    if (table.status === "occupied" && tableTotal > 0) {
      loadSessionOrders();
    }
  };

  useEffect(() => {
    setOrders(tableOrders);
  }, [tableOrders]);

  useEffect(() => {
    if (showOrderModal) {
      loadProducts();
      setCurrentPage(1);
    }
  }, [showOrderModal]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + item.total, 0).toFixed(2);
  };

  const calculateSessionTotal = () => {
    if (!sessionOrders || sessionOrders.length === 0) return 0;
    return sessionOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );
  };

  const getAvailableTablesForMerging = () => {
    return tables.filter(
      (t) =>
        t.id !== table.id &&
        t.status === "occupied" &&
        t.currentSession &&
        t.currentSession.id !== table.currentSession?.id
    );
  };

  const availableTablesForMerge = getAvailableTablesForMerging();

  const handleMerge = () => {
    if (mergeTarget) {
      onMergeTables(table.id, mergeTarget);
      setShowMergeModal(false);
      setMergeTarget(null);
    }
  };

  const handleOpen = () => {
    if (table.status !== "occupied") {
      onOpenTable(table.id, customerCount);
      setOrders([]);
      setJustOpenedTable(true);
    }
  };

const handleClose = async () => {
  if (table.status !== "occupied") return;

  try {
    setShowOrderModal(false);
    setJustOpenedTable(false);

    // Try to print session summary (customer receipt)
    await printSessionSummary();
  } catch (error) {
    console.error("Error closing table:", error);
    alert("Erreur lors de l'impression. La table sera quand même fermée.");
  } finally {
    // ALWAYS executed
    onCloseTable(table.id);
    setOrders([]);
    onRefreshData();
  }
};


  const handleDeleteTable = () => {
    if (!isAdmin) {
      alert("Seuls les administrateurs peuvent supprimer des tables");
      return;
    }
    if (!deleteReason.trim()) {
      alert("Veuillez fournir une raison pour la suppression");
      return;
    }
    onDeleteTable(table.id);
    setShowDeleteModal(false);
    setDeleteReason("");
  };

  const handleOpenOrderModal = () => {
    if (table.status === "occupied" && table.currentSession) {
      setShowOrderModal(true);
    }
  };

  const handleOpenMergeModal = () => {
    if (!table.currentSession) {
      alert("La table doit être occupée pour être fusionnée");
      return;
    }
    if (availableTablesForMerge.length === 0) {
      alert("Aucune autre table occupée disponible pour la fusion");
      return;
    }
    setShowMergeModal(true);
  };

  const handleOpenDeleteModal = () => {
    if (table.status === "occupied") {
      alert("Impossible de supprimer une table occupée. Veuillez d'abord clôturer la session.");
      return;
    }
    if (!isAdmin) {
      alert("Seuls les administrateurs peuvent supprimer des tables");
      return;
    }
    setShowDeleteModal(true);
  };

  const handleUpdateCartQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.unit_price,
            }
          : item
      )
    );
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Search handler with debouncing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const categories = [
    "all",
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-red-100 text-red-800 border-red-200";
      case "reserved":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cleaning":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "occupied":
        return "Occupée";
      case "reserved":
        return "Réservée";
      case "cleaning":
        return "Nettoyage";
      default:
        return "Disponible";
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "coffee":
        return <Coffee className="w-4 h-4" />;
      case "food":
        return <Utensils className="w-4 h-4" />;
      case "drinks":
        return <Wine className="w-4 h-4" />;
      case "desserts":
        return <Cake className="w-4 h-4" />;
      default:
        return <Coffee className="w-4 h-4" />;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "preparing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ready":
        return "bg-green-100 text-green-800 border-green-200";
      case "served":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "preparing":
        return "En préparation";
      case "ready":
        return "Prête";
      case "served":
        return "Servie";
      case "cancelled":
        return "Annulée";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Print functions - MODIFIED
  const printOrder = async (orderId: number, printerType: string = "kitchen") => {
    setPrinting(true);
    try {
      const token = localStorage.getItem("authToken");
      
      // Use specific printer type (kitchen or bar) - don't print customer receipt here
      const url = `http://localhost:4000/api/print/order/${orderId}/direct?printerType=${printerType}`;
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Échec de l'impression");
      }
      
      return data;
    } catch (error) {
      console.error("Error printing order:", error);
      throw error;
    } finally {
      setPrinting(false);
    }
  };

  const printSessionSummary = async () => {
    if (!table.currentSession) return;
    setPrinting(true);
    try {
      const token = localStorage.getItem("authToken");
      const url = `http://localhost:4000/api/print/session-summary/${table.id}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Removed alert for session summary printing
        }
        return data;
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to print session summary");
      }
    } catch (error) {
      console.error("Error printing session summary:", error);
      // Removed alert for session summary error
      throw error;
    } finally {
      setPrinting(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert("Le panier est vide");
      return;
    }
    if (!table.currentSession) {
      alert("La table doit être ouverte pour passer une commande");
      return;
    }
    setSubmittingOrder(true);
    try {
      const token = localStorage.getItem("authToken");
      const orderData = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        table_id: table.id,
        session_id: table.currentSession.id,
        order_type: "dine_in",
        payment_method: paymentMethod,
        note: notes,
        paid_amount: parseFloat(calculateCartTotal()),
      };
      const res = await fetch("http://localhost:4000/api/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
      if (res.ok) {
        const data = await res.json();
        const orderId = data.order.id;
        
        // MODIFIED: Only print to kitchen/bar printers, not customer receipt
        try {
          // Get unique printers from cart
          const printers = new Set<string>();
          cart.forEach(item => {
            if (item.printer) {
              printers.add(item.printer);
            }
          });
          
          // Print to each unique printer
          let printResults = [];
          for (const printer of printers) {
            if (printer === 'kitchen' || printer === 'bar') {
              try {
                const result = await printOrder(orderId, printer);
                printResults.push({ printer, success: true });
              } catch (error) {
                printResults.push({ printer, success: false, error: error.message });
              }
            }
          }
          
          // REMOVED: Show summary of printing alerts
          // Just log any errors to console but don't show alerts
          let successCount = printResults.filter(r => r.success).length;
          let failCount = printResults.filter(r => !r.success).length;
          
          if (failCount > 0) {
            console.error(`⚠️ Commande créée mais certaines impressions ont échoué (${successCount} réussie(s), ${failCount} échouée(s))`);
          }
          
        } catch (printError) {
          console.error(`⚠️ Commande créée mais impression échouée : ${printError.message}`);
        }
        
        setOrderSuccess(true);
        setCart([]);
        setNotes("");
        // Set a timeout to close the modal and refresh data
        setTimeout(() => {
          setOrderSuccess(false);
          setShowOrderModal(false);
          loadTableOrders();
          onRefreshData();
        }, 1500); // Reduced from 3000ms to 1500ms for faster closure
      } else {
        const error = await res.json();
        alert(`❌ Erreur : ${error.message || "Échec de la commande"}`);
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("❌ Erreur lors de la création de la commande");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {table.display_name}
              </h2>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  table.status
                )}`}
              >
                {getStatusText(table.status)}
              </span>
              {!isAdmin && table.status === "occupied" && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  Mode employé
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Table #{table.table_number}
            </p>
          </div>
          <button
            onClick={onClosePanel}
            className="flex items-center gap-2 p-3 bg-gray-100 hover:bg-gray-200"
          >
            <X className="w-5 h-5 text-gray-500" /> Fermer
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-430px)]">
        {/* Table Info */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Section</span>
              </div>
              <p className="font-medium text-gray-900">
                {table.section || "Aucune"}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span>Capacité</span>
              </div>
              <p className="font-medium text-gray-900">
                {table.capacity} places
              </p>
            </div>
          </div>
        </div>
        {/* Session Info */}
        {table.currentSession && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">
                  Session Active
                </h3>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    Débutée à{" "}
                    {new Date(
                      table.currentSession.started_at
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {table.currentSession.customer_count}
                </p>
                <p className="text-xs text-gray-600">Clients</p>
              </div>
            </div>
            {table.currentSession.waiter && (
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-2" />
                <span>Serveur : {table.currentSession.waiter.name}</span>
              </div>
            )}
          </div>
        )}
        {/* Table Total Section */}
        {table.status === "occupied" &&
          table.currentSession &&
          (() => {
            const currentSessionOrders = orders.filter(
              (order) => order.session_id === table.currentSession?.id
            );
            const sessionTotal = currentSessionOrders.reduce(
              (total, order) => total + (order.total || 0),
              0
            );
            return sessionTotal > 0 ? (
              <div
                className="px-6 py-4 border-b border-gray-200 bg-green-50 cursor-pointer hover:bg-green-100"
                onClick={handleViewSessionOrders}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calculator className="w-5 h-5 text-green-700 mr-3" />
                    <div>
                      <h3 className="font-medium text-sm text-green-900 flex items-center">
                        Total de la Session actuelle
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </h3>
                      <p className="text-xs text-green-700">
                        Cliquez pour voir toutes les commandes de la session
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-900">
                        {sessionTotal.toFixed(3)} DT
                      </p>
                      <p className="text-xs italic text-green-700">
                      {currentSessionOrders.length} commande(s)
                    </p>
                  </div>
                </div>
              </div>
            ) : null;
          })()}
        {/* Recent Orders */}
        <div className="px-6 py-4">
         {/*  <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-sm text-gray-900">Commandes Récentes</h3>
            {table.status === "occupied" && (
              <div className="flex space-x-2">
                <button
                  onClick={handleOpenMergeModal}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 flex items-center space-x-1"
                >
                  <Merge className="w-4 h-4" />
                  <span>Fusionner</span>
                </button>
                <button
                  onClick={handleOpenOrderModal}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Commande</span>
                </button>
              </div>
            )}
          </div> */}
          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <div className="rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 p-3 hover:shadow-sm cursor-pointer"
                  onClick={() => handleViewOrderDetails(order)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        Commande #{order.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 block">
                        {parseFloat(order.total).toFixed(3)} DT
                      </span>
                      <div className="flex items-center mt-1 text-xs text-blue-600">
                        <Eye className="w-3 h-3 mr-1" />
                        <span>Voir les détails</span>
                      </div>
                    </div>
                  </div>
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-sm text-gray-600">
                      {order.order_items
                        .slice(0, 2)
                        .map((item: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="truncate max-w-[120px] capitalize">
                              {item.name}
                            </span>
                            <span>×{item.quantity}</span>
                          </div>
                        ))}
                      {order.order_items.length > 2 && (
                        <div className="text-xs text-gray-500 mt-1">
                          +{order.order_items.length - 2} Plus d'articles
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {orders.length > 3 && (
                <button
                  onClick={() => loadTableOrders()}
                  className="w-full py-2 text-center text-gray-900 hover:text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Voir toutes les commandes ({orders.length})
                  <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-200">
              <div className="text-gray-400 mb-3">
                <ShoppingCart className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500 mb-2">Aucune commande pour l'instant</p>
              {table.status === "occupied" && (
                <button
                  onClick={handleOpenOrderModal}
                  className="px-4 py-4 bg-gray-700 hover:bg-gray-800 text-white text-sm"
                >
                  Passer la première commande
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Action Buttons */}
      <div className="border-t border-gray-200 p-6 space-y-3">
        {table.status === "occupied" ? (
          <>
            {/* New Order Button */}
            <button
              onClick={handleOpenOrderModal}
              className="w-full py-3 bg-gray-700 hover:bg-gray-800 text-white font-medium flex items-center justify-center space-x-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Nouvelle commande</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              {/* Merge Button */}
              <button
                onClick={handleOpenMergeModal}
                className="py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2"
              >
                <Merge className="w-5 h-5" />
                <span>Fusionner</span>
              </button>
              {/* Close Table Button */}
              <button
                onClick={handleClose}
                className="py-3 bg-red-600 hover:bg-red-700 text-white"
              >
                Clôturer la table
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Open Table Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Clients
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() =>
                    setCustomerCount((prev) => Math.max(1, prev - 1))
                  }
                  className="p-4 border border-gray-300 hover:bg-gray-50"
                >
                  <MinusCircle className="w-5 h-5 text-gray-600" />
                </button>
                <span className="w-12 text-center font-medium text-lg">
                  {customerCount}
                </span>
                <button
                  onClick={() =>
                    setCustomerCount((prev) =>
                      Math.min(table.capacity, prev + 1)
                    )
                  }
                  className="p-4 border border-gray-300 hover:bg-gray-50"
                >
                  <PlusCircle className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Open Table Button */}
              <button
                onClick={handleOpen}
                className="py-3 bg-gray-700 hover:bg-gray-800 text-white"
              >
                Ouvrir la table
              </button>
              {/* Delete Table Button */}
              <button
                onClick={handleOpenDeleteModal}
                disabled={!isAdmin}
                className={`py-3 border text-sm flex items-center justify-center space-x-2 ${
                  isAdmin
                    ? "border-red-300 text-red-700 hover:bg-red-50"
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                title={!isAdmin ? "Seuls les administrateurs peuvent supprimer des tables" : ""}
              >
                {!isAdmin && <Lock className="w-4 h-4" />}
                <Trash2 className="w-4 h-4" />
                <span>Supprimer</span>
              </button>
            </div>
          </>
        )}
      </div>
      {/* Delete Table Modal */}
      {showDeleteModal && isAdmin && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Supprimer la table (Admin uniquement)
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Cette action est irréversible
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Veuillez confirmer la suppression :
                </p>
                <div className="bg-gray-50 border border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                      <span className="font-bold text-gray-900">
                        #{table.table_number}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {table.display_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {table.section} • {table.capacity} places
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de la suppression
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
                  rows={3}
                  placeholder="Veuillez expliquer pourquoi vous supprimez cette table..."
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason("");
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteTable}
                disabled={!deleteReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer la table</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Merge Tables Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-300 w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Fusionner les tables
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Transférer les convives vers une autre table
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">De la table :</p>
                <div className="bg-blue-50 border border-blue-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {table.display_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        #{table.table_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {table.currentSession?.customer_count || 0}
                      </p>
                      <p className="text-xs text-gray-600">clients</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sélectionner la table cible
                </label>
                {availableTablesForMerge.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300">
                    <div className="text-gray-400 mb-3">
                      <Users className="w-12 h-12 mx-auto" />
                    </div>
                    <p className="text-gray-600 font-medium">
                      Aucune table disponible
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Toutes les autres tables sont vides ou déjà fusionnées
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {availableTablesForMerge.map((targetTable) => (
                      <label
                        key={targetTable.id}
                        className={`flex items-center p-4 border cursor-pointer ${
                          mergeTarget === targetTable.id
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mergeTarget"
                          value={targetTable.id}
                          checked={mergeTarget === targetTable.id}
                          onChange={(e) =>
                            setMergeTarget(parseInt(e.target.value))
                          }
                          className="mr-3 text-gray-900"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">
                                {targetTable.display_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Table #{targetTable.table_number}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                {targetTable.currentSession?.customer_count ||
                                  0}
                              </p>
                              <p className="text-xs text-gray-600">clients</p>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-4 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleMerge}
                disabled={!mergeTarget}
                className="px-4 py-4 bg-gray-700 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Merge className="w-4 h-4" />
                <span>Fusionner les tables</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center z-[900] pb-9">
          <div className="bg-white border border-gray-300 w-full h-full flex flex-col">
            {/* HEADER */}
            <div className="px-6 py-5 border-b border-gray-300 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Nouvelle commande
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {table.display_name} • Table #{table.table_number} •{" "}
                  {table.currentSession?.customer_count || 0} Client(s)
                </p>
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setJustOpenedTable(false);
                }}
                className="flex items-center gap-2 px-4 py-4 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
              >
                <X className="w-4 h-4" /> Fermer
              </button>
            </div>
            {/* SUCCESS MESSAGE */}
            {orderSuccess && (
              <div className="bg-green-50 border-l-4 border-green-600 my-4">
                <div className="p-4 ">
                <p className="font-medium text-green-800">
                  Commande envoyée avec succès !
                </p>
                <p className="text-green-700 text-sm">
                  La commande a été transmise à la cuisine.
                </p>
                </div>
              </div>
            )}
            <div className="flex-1 flex overflow-hidden">
              {/* PRODUCTS SECTION */}
              <div className="flex-1 overflow-y-auto px-4 pb-6" ref={productListRef}>
                {/* SEARCH + CATEGORIES */}
                <div className="sticky top-0 mb-4 space-y-4 z-50 bg-white">
                  {/* SEARCH */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Rechercher un produit..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600"
                    />
                  </div>
                  {/* CATEGORY FILTERS */}
                  <div className="flex overflow-x-auto scrollbar-hide space-x-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setCurrentPage(1);
                        }}
                        className={`px-6 py-4 text-sm capitalize border border-gray-300 whitespace-nowrap ${
                          selectedCategory === category
                            ? "bg-gray-700 text-white"
                            : "bg-gray-50 text-black hover:bg-gray-100"
                        }`}
                      >
                        {category === "all" ? "Tous" : category}
                      </button>
                    ))}
                  </div>
                </div>
                {/* PRODUCTS GRID */}
                {loadingProducts ? (
                  <div className="flex justify-center py-16">
                    <div className="h-10 w-10 border-b-2 border-gray-900"></div>
                  </div>
                ) : currentProducts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {currentProducts.map((product) => (
                        <div
                          key={product.id}
                          className="border border-gray-300 p-4 relative cursor-pointer bg-white"
                        >
                          {/* Category Label */}
                          <span className="text-xs bg-yellow-50 italic px-2 capitalize py-2 text-black absolute top-2 left-2">
                            {product.category || "Sans catégorie"}
                          </span>
                          {/* Printer Label */}
                          {product.printer && (
                            <span className={`text-xs absolute top-2 right-2 px-2 py-1 ${
                              product.printer === 'kitchen' ? 'bg-orange-100 text-orange-800' :
                              product.printer === 'bar' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {product.printer === 'kitchen' ? '🍳 Cuisine' : 
                               product.printer === 'bar' ? '🍹 Bar' : 
                               product.printer}
                            </span>
                          )}
                          {/* Product Image */}
                          {product.ProductImages?.length > 0 ? (
                            <div className="h-36 mb-3 flex items-center justify-center overflow-hidden">
                              <img
                                src={`http://localhost:4000${product.ProductImages[0].url}`}
                                alt={product.name}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const placeholder = target.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.classList.remove('hidden');
                                }}
                              />
                              <div className={`w-6 h-6 text-gray-400 hidden`}>
                                {getCategoryIcon(product.category)}
                              </div>
                              {product.stock <= 10 && (
                                <div className="absolute top-10 right-2 bg-red-800 text-white px-2 py-1 text-xs capitalize">
                                  {product.stock} restant(s)
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-40 mb-3 bg-gray-100 flex items-center justify-center">
                              <div className="text-gray-400">
                                {getCategoryIcon(product.category)}
                              </div>
                            </div>
                          )}
                          {/* NAME + PRICE */}
                          <h4 className="font-semibold text-sm text-gray-900 mb-1 uppercase w-48 overflow-hidden wrap-break-word line-clamp-1">
                            {product.name}
                          </h4>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-lg font-bold bg-green-50 text-black px-2.5 py-1">
                              {parseFloat(product.price?.toString() || "0").toFixed(3)} DT
                            </span>
                          </div>
                          {/* ADD BUTTON */}
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="absolute bottom-0 right-0 h-18 w-18 bg-gray-700 text-white text-sm flex items-center justify-center border-t border-gray-300"
                          >
                            <Plus className="w-8 h-8" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 border-t border-gray-200 pt-4 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Affichage {Math.min(startIndex + 1, filteredProducts.length)} à {Math.min(endIndex, filteredProducts.length)} sur {filteredProducts.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`px-3 py-4 text-sm border border-gray-300 ${
                              currentPage === 1
                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Précédent
                          </button>
                          
                          {/* Page numbers */}
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              if (pageNum < 1 || pageNum > totalPages) return null;
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`px-6 py-4 text-sm border ${
                                    currentPage === pageNum
                                      ? 'bg-gray-600 text-white border-gray-600'
                                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            {totalPages > 5 && currentPage < totalPages - 2 && (
                              <>
                                <span className="px-4 text-gray-500">...</span>
                                <button
                                  onClick={() => setCurrentPage(totalPages)}
                                  className={`px-6 py-4 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50`}
                                >
                                  {totalPages}
                                </button>
                              </>
                            )}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-4 text-sm border border-gray-300 ${
                              currentPage === totalPages
                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Suivant
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucun produit trouvé</p>
                    <p className="text-sm text-gray-500">Essayez une autre recherche</p>
                  </div>
                )}
              </div>
              {/* CART SIDEBAR */}
              <div className="w-[420px] border-l border-gray-300 flex flex-col">
                {/* CART HEADER */}
                <div className="p-4 border-b border-gray-300">
                  <h3 className="font-semibold text-base text-gray-900">
                    Commande Client
                  </h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">
                      {cart.length} articles
                    </span>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Effacer tout
                      </button>
                    )}
                  </div>
                </div>
                {/* CART ITEMS */}
                <div className="flex-1 overflow-y-auto p-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-16">
                      <ShoppingCart className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Le panier est vide</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.product_id}
                          className="border border-gray-300 p-4"
                        >
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm capitalize">
                                {item.product_name}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {parseFloat(item.unit_price?.toString() || "0").toFixed(3)} DT × {item.quantity}
                              </p>
                              {item.printer && (
                                <span className={`text-xs inline-block mt-1 px-2 py-1 ${
                                  item.printer === 'kitchen' ? 'bg-orange-100 text-orange-800' :
                                  item.printer === 'bar' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.printer === 'kitchen' ? '🍳 Cuisine' : 
                                   item.printer === 'bar' ? '🍹 Bar' : 
                                   item.printer}
                                </span>
                              )}
                              {item.notes && (
                                <p className="text-xs text-blue-600 mt-1 italic">
                                  Note : {item.notes}
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-gray-900">
                              {parseFloat(item.total?.toString() || "0").toFixed(3)} DT
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() =>
                                handleUpdateCartQuantity(
                                  item.product_id,
                                  item.quantity - 1
                                )
                              }
                              className="px-4 py-4 border border-gray-300"
                            >
                              <MinusCircle className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateCartQuantity(
                                  item.product_id,
                                  item.quantity + 1
                                )
                              }
                              className="px-4 py-4 border border-gray-300"
                            >
                              <PlusCircle className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() =>
                                handleRemoveFromCart(item.product_id)
                              }
                              className="ml-auto px-3 py-2 text-red-700 border border-red-400 hover:bg-red-100"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* FOOTER TOTAL + SUBMIT */}
                {cart.length > 0 && (
                  <div className="border-t border-gray-300 p-6 bg-gray-50">
                    {/* NOTES */}
                    <div className="mb-4">
                      <label className="text-sm text-gray-700">
                        Notes de Cuisine
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gray-600"
                        placeholder="Par exemple, bien cuit, sans sel..."
                      />
                    </div>
                    {/* PAYMENT METHOD - REMOVED FOR NOW */}
                    <div className="mb-6 hidden">
                      <label className="block text-sm text-gray-700 mb-2">
                        Moyen de paiement
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "cash", label: "Espèces", icon: CreditCard },
                          { value: "card", label: "Carte", icon: CreditCard },
                          {
                            value: "mobile",
                            label: "Mobile",
                            icon: Smartphone,
                          },
                        ].map(({ value, label, icon: Icon }) => (
                          <label
                            key={value}
                            className="border border-gray-300 p-2 text-center cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={value}
                              checked={paymentMethod === value}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="hidden"
                            />
                            <Icon className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-xs">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* TOTAL */}
                    <div className="flex justify-between mb-4">
                      <span className="text-lg font-medium text-gray-900">
                        Total
                      </span>
                      <span className="text-xl font-bold text-gray-900">
                        {parseFloat(calculateCartTotal().toString()).toFixed(3)} DT
                      </span>
                    </div>
                    {/* SEND BUTTON */}
                    <button
                      onClick={handleSubmitOrder}
                      disabled={submittingOrder}
                      className="w-full py-3 bg-gray-900 text-white font-medium text-sm border border-gray-700 disabled:opacity-40"
                    >
                      {submittingOrder ? "Envoi en cours..." : "Envoyer à la cuisine"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white border border-gray-300 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-3">
                  <Receipt className="w-6 h-6 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Détails de la commande
                  </h2>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Tag className="w-4 h-4 mr-1" />
                    <span>Commande #{selectedOrder.id}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    <span>
                      {formatDate(selectedOrder.created_at)} à{" "}
                      {formatTime(selectedOrder.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  setSelectedOrder(null);
                }}
                className="flex items-center gap-2 p-3 bg-gray-100 hover:bg-gray-200"
              >
                <X className="w-5 h-5 text-gray-500" /> Fermer
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingOrderDetails ? (
                <div className="flex justify-center items-center py-12">
                  <div className="h-8 w-8 border-b-2 border-gray-900"></div>
                  <span className="ml-3 text-gray-600">
                    Chargement des détails de la commande...
                  </span>
                </div>
              ) : (
                <div className="p-6">
                  <div className="bg-gray-50 border border-gray-200 p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Table</p>
                        <p className="font-medium text-gray-900">
                          {table.display_name} (#{table.table_number})
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Statut de la commande</p>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(
                              selectedOrder.status || "pending"
                            )}`}
                          >
                            {getOrderStatusText(
                              selectedOrder.status || "pending"
                            )}
                          </span>
                          {selectedOrder.status === "ready" && (
                            <AlertCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type de commande</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {selectedOrder.order_type?.replace("_", " ") ||
                            "Sur place"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Moyen de paiement</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {selectedOrder.payment_method || "Non spécifié"}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.note && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">
                          Notes de cuisine
                        </p>
                        <p className="text-sm text-gray-900 italic">
                          {selectedOrder.note}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900 flex items-center">
                        <ClipboardList className="w-5 h-5 mr-2" />
                        Articles de commande
                      </h3>
                      <div className="text-sm text-gray-600">
                        Table : {table.display_name} • #{table.table_number}
                      </div>
                    </div>
                    {(
                      selectedOrder.OrderItems ||
                      selectedOrder.order_items ||
                      []
                    ).length > 0 ? (
                      <div className="border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-200">
                          <div className="grid grid-cols-12 gap-4 px-4 py-3">
                            <div className="col-span-6">
                              <span className="text-xs font-medium text-gray-700 uppercase">
                                Produit
                              </span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="text-xs font-medium text-gray-700 uppercase">
                                Quantité
                              </span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="text-xs font-medium text-gray-700 uppercase">
                                Prix unitaire
                              </span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-xs font-medium text-gray-700 uppercase">
                                Total
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {(
                            selectedOrder.OrderItems ||
                            selectedOrder.order_items ||
                            []
                          ).map((item: any, index: number) => {
                            const itemData = {
                              name: item.name || item.product_name || "Inconnu",
                              quantity: item.quantity || 1,
                              unit_price: item.unit_price || 0,
                              total:
                                item.total ||
                                item.unit_price * item.quantity ||
                                0,
                              notes: item.notes || "",
                              product: item.Product || {},
                            };
                            return (
                              <div
                                key={index}
                                className="px-4 py-3 hover:bg-gray-50"
                              >
                                <div className="grid grid-cols-12 gap-4 items-center">
                                  <div className="col-span-6">
                                    <div className="flex items-center">
                                      <div className="shrink-0 w-8 h-8 bg-gray-100 flex items-center justify-center mr-3">
                                        <Package className="w-4 h-4 text-gray-500" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 capitalize">
                                          {itemData.name}
                                        </p>
                                        {itemData.notes && (
                                          <p className="text-xs text-gray-500 italic mt-1">
                                            {itemData.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-span-2 text-center">
                                    <span className="text-sm text-gray-900 font-medium">
                                      {itemData.quantity}
                                    </span>
                                  </div>
                                  <div className="col-span-2 text-center">
                                    <span className="text-sm text-gray-900">
                                      {parseFloat(itemData.unit_price).toFixed(
                                        3
                                      )}{" "}
                                      DT
                                    </span>
                                  </div>
                                  <div className="col-span-2 text-right">
                                    <span className="text-sm font-medium text-gray-900">
                                      {parseFloat(itemData.total).toFixed(3)} DT
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">
                          Aucun article trouvé dans cette commande
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          Les articles n'ont peut-être pas été chargés
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sous-total</span>
                        <span className="text-gray-900">
                          {(() => {
                            const items =
                              selectedOrder.OrderItems ||
                              selectedOrder.order_items ||
                              [];
                            const subtotal = items.reduce(
                              (sum: number, item: any) => {
                                return sum + (item.total || 0);
                              },
                              0
                            );
                            return subtotal.toFixed(3);
                          })()}{" "}
                          DT
                        </span>
                      </div>
                      {selectedOrder.tax && selectedOrder.tax > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Taxe</span>
                          <span className="text-gray-900">
                            {parseFloat(selectedOrder.tax).toFixed(3)} DT
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-3 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-medium text-gray-900">
                            Total
                          </span>
                          <span className="text-2xl font-bold text-gray-900">
                            {parseFloat(selectedOrder.total).toFixed(3)} DT
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Montant payé</span>
                        <span>
                          {parseFloat(selectedOrder.paid_amount || 0).toFixed(
                            3
                          )}{" "}
                          DT
                        </span>
                      </div>
                      {selectedOrder.change_amount > 0 && (
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Monnaie</span>
                          <span>
                            {parseFloat(selectedOrder.change_amount).toFixed(3)}{" "}
                            DT
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(selectedOrder.created_at)}</span>
                <span>•</span>
                <ClockIcon className="w-4 h-4" />
                <span>{formatTime(selectedOrder.created_at)}</span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowOrderDetailsModal(false);
                    setSelectedOrder(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                {/* Removed customer receipt print button */}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Session Orders Modal */}
      {showSessionOrdersModal && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-[80] p-4">
          <div className="bg-white border border-gray-300 w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-3">
                  <ClipboardList className="w-6 h-6 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Commandes de session
                  </h2>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Tag className="w-4 h-4 mr-1" />
                    <span>Session #{table.currentSession?.session_number}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    <span>
                      Débutée : {formatTime(table.currentSession?.started_at)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{table.currentSession?.customer_count} Client(s)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSessionOrdersModal(false);
                  setSessionOrders([]);
                }}
                className="flex items-center gap-2 p-3 bg-gray-100 hover:bg-gray-200"
              >
                <X className="w-5 h-5 text-gray-500" /> Fermer
              </button>
            </div>
            {loadingSessionOrders ? (
              <div className="flex justify-center items-center py-12">
                <div className="h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-3 text-gray-600">
                  Chargement des commandes de session...
                </span>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="bg-gray-50 border border-gray-200 p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Table</p>
                      <p className="font-medium text-gray-900">
                        {table.display_name} (#{table.table_number})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Numéro de session</p>
                      <p className="font-medium text-gray-900">
                        #{table.currentSession?.session_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Serveur</p>
                      <p className="font-medium text-gray-900">
                        {table.currentSession?.waiter?.name || "Non attribué"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Durée de la session</p>
                      <p className="font-medium text-gray-900">
                        {Math.floor(
                          (Date.now() -
                            new Date(
                              table.currentSession?.started_at
                            ).getTime()) /
                            60000
                        )}{" "}
                        minutes
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 flex items-center">
                      <Receipt className="w-5 h-5 mr-2" />
                      Toutes les commandes ({sessionOrders.length})
                    </h3>
                    <div className="text-sm text-gray-600">
                      Total de la session : {calculateSessionTotal().toFixed(3)} DT
                    </div>
                  </div>
                  {sessionOrders.length > 0 ? (
                    <div className="border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-12 gap-4 px-4 py-3">
                          <div className="col-span-3">
                            <span className="text-xs font-medium text-gray-700 uppercase">
                              Commande #
                            </span>
                          </div>
                          <div className="col-span-3">
                            <span className="text-xs font-medium text-gray-700 uppercase">
                              Heure
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs font-medium text-gray-700 uppercase">
                              Statut
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs font-medium text-gray-700 uppercase">
                              Articles
                            </span>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="text-xs font-medium text-gray-700 uppercase">
                              Total
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {sessionOrders.map((order: any) => (
                          <div
                            key={order.id}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowSessionOrdersModal(false);
                              setShowOrderDetailsModal(true);
                            }}
                          >
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-3">
                                <p className="text-sm font-medium text-gray-900">
                                  #{order.id}
                                </p>
                              </div>
                              <div className="col-span-3">
                                <p className="text-sm text-gray-600">
                                  {formatTime(order.created_at)}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(
                                    order.status || "pending"
                                  )}`}
                                >
                                  {getOrderStatusText(
                                    order.status || "pending"
                                  )}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <p className="text-sm text-gray-600">
                                  {
                                    (
                                      order.OrderItems ||
                                      order.order_items ||
                                      []
                                    ).length
                                  }{" "}
                                  articles
                                </p>
                              </div>
                              <div className="col-span-2 text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {parseFloat(order.total).toFixed(3)} DT
                                </p>
                                <div className="flex items-center mt-1 text-xs text-blue-600 justify-end">
                                  <Eye className="w-3 h-3 mr-1" />
                                  <span>Voir</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200">
                      <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">
                        Aucune commande trouvée dans cette session
                      </p>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 border border-gray-200 p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Nombre de commandes</span>
                      <span className="font-medium text-gray-900">
                        {sessionOrders.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Sous-total</span>
                      <span className="font-medium text-gray-900">
                        {calculateSessionTotal().toFixed(3)} DT
                      </span>
                    </div>
                    {table.currentSession?.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">
                          Notes de session
                        </p>
                        <p className="text-sm text-gray-900 italic">
                          {table.currentSession.notes}
                        </p>
                      </div>
                    )}
                    <div className="border-t border-gray-300 pt-3 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-900">
                          Total de la session
                        </span>
                        <span className="text-2xl font-bold text-green-900">
                          {calculateSessionTotal().toFixed(3)} DT
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ClockIcon className="w-4 h-4" />
                <span>
                  Session débutée :{" "}
                  {formatDate(table.currentSession?.started_at)} à{" "}
                  {formatTime(table.currentSession?.started_at)}
                </span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSessionOrdersModal(false);
                    setSessionOrders([]);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button
                  onClick={printSessionSummary}
                  disabled={printing}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white flex items-center space-x-2 disabled:opacity-50"
                >
                  {printing ? (
                    <>
                      <div className="h-4 w-4 border-b-2 border-white"></div>
                      <span>Impression en cours...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Imprimer le résumé</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
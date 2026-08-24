"use client";
import { Trash2, Clock, Calendar, Barcode, CheckCircle, AlertCircle } from 'lucide-react';

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../lib/contexts/AuthContext";
import { useAlert } from '../AlertContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
  original_product_price?: number;
  is_sub_unit?: boolean;
  pieces_per_box?: number;
  sell_by_weight?: boolean;
  remise_percentage?: number;
}

interface OrderPanelProps {
  cartItems: CartItem[];
  onCartUpdate: (items: CartItem[]) => void;
  onCheckoutSuccess: (order: any) => void;
  currentSessionName?: string;
  selectedClient?: Client | null;
}

interface Client {
  id: number;
  name: string;
  phone?: string;
  loyalty_points: number;
}

export default function OrderPanel({ cartItems, onCartUpdate, onCheckoutSuccess, currentSessionName, selectedClient }: OrderPanelProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdown, setCountdown] = useState(0);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const { showAlert } = useAlert();
  const { user } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CartItem | null>(null);
  const [deleteInputValue, setDeleteInputValue] = useState("");
  const [templateConfig, setTemplateConfig] = useState<any>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [usePoints, setUsePoints] = useState(false);
  const [loyaltyConfig, setLoyaltyConfig] = useState({ minPoints: 100, pointsValue: 30 });

  // Reset payment amount when cart changes
  useEffect(() => {
    if (cartItems.length === 0) {
      setPaymentAmount("");
      setUsePoints(false);
      cancelCountdown();
    }
  }, [cartItems]);

  // Fetch loyalty config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('http://localhost:4000/api/templates/current', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setLoyaltyConfig({
          minPoints: data.loyalty_min_points || 100,
          pointsValue: data.loyalty_points_value || 30
        });
        setTemplateConfig(data);
      } catch (err) {
        console.error("Failed to fetch loyalty config", err);
      }
    };
    fetchConfig();
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);



  // Focus barcode input when shown
  useEffect(() => {
    if (showBarcodeInput && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [showBarcodeInput]);

  // Handle barcode scanner input (pistol scanner acts as keyboard)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in barcode input manually
      if (document.activeElement === barcodeInputRef.current) {
        return;
      }

      // Scanner typically sends characters quickly, we can detect by timing or Enter key
      if (event.key === 'Enter' && scannedBarcode) {
        // Scanner finished
        if (isDeleteModalOpen) {
          handleConfirmDelete(scannedBarcode);
        } else {
          handleBarcodeScanned(scannedBarcode);
        }
        setScannedBarcode("");
      } else if (event.key.length === 1 && /[0-9a-zA-Z]/.test(event.key)) {
        // Accumulate barcode characters
        setScannedBarcode(prev => prev + event.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scannedBarcode, isDeleteModalOpen]);

  // Auto-clear scanned barcode after a delay (if no Enter received)
  useEffect(() => {
    if (scannedBarcode) {
      const timer = setTimeout(() => {
        setScannedBarcode("");
      }, 500); // Clear after 500ms of inactivity
      return () => clearTimeout(timer);
    }
  }, [scannedBarcode]);

  // Countdown effect
  useEffect(() => {
    if (isCountdownActive && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCountdownActive && countdown === 0) {
      // Countdown finished, trigger checkout
      handleFinalCheckout();
    }
  }, [isCountdownActive, countdown]);

  const cancelCountdown = () => {
    setIsCountdownActive(false);
    setCountdown(0);
    setIsProcessing(false);
  };

  const startCountdown = () => {
    if (parseFloat(paymentAmount) < total) {
      showAlert("Montant insuffisant !", "warning");
      return;
    }
    setIsCountdownActive(true);
    setCountdown(10);
  };

  const handleImmediateCheckout = async () => {
    if (parseFloat(paymentAmount) < total) {
      showAlert("Montant insuffisant !", "warning");
      return;
    }

    // Cancel countdown and immediately process checkout
    setIsCountdownActive(false);
    setCountdown(0);
    await handleFinalCheckout();
  };

  const handleBarcodeScanned = async (barcode: string) => {
    if (scanLoading) return;

    try {
      setScanLoading(true);
      const token = localStorage.getItem('authToken');

      // Use the dedicated barcode search endpoint that handles scales
      const response = await fetch(`http://localhost:4000/api/products/search/barcode/${encodeURIComponent(barcode)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Fallback to name search if exact barcode fails
        const fallbackResponse = await fetch(`http://localhost:4000/api/products?q=${encodeURIComponent(barcode)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!fallbackResponse.ok) throw new Error('Product not found');
        const fallbackData = await fallbackResponse.json();
        handleProductResponse(fallbackData, barcode);
      } else {
        const data = await response.json();
        // The backend returns { product, weight } for scale barcodes
        if (data.product) {
          addProductToCart(data.product, data.weight || 1);
        } else {
          handleProductResponse(data, barcode);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      showAlert('Produit non trouvé.', 'error');
    } finally {
      setScanLoading(false);
      setScannedBarcode("");
      setBarcodeInput("");
      setShowBarcodeInput(false);
    }
  };

  const handleManualBarcodeSearch = () => {
    if (barcodeInput.trim()) {
      handleBarcodeScanned(barcodeInput.trim());
    }
  };

  const handleProductResponse = (data: any, barcode: string) => {
    let product = null;

    if (data.products && data.products.length > 0) {
      // If multiple products found, use the first one
      product = data.products[0];
    } else if (Array.isArray(data) && data.length > 0) {
      product = data[0];
    } else if (data.product) {
      product = data.product;
    } else if (data.id) {
      product = data;
    }

    if (product) {
      addProductToCart(product);
    } else {
      showAlert('Produit non trouvé', 'error');
    }
  };

  const addProductToCart = (product: any, overrideQuantity: number = 1) => {
    const existingItem = cartItems.find(item => item.id === product.id);

    if (existingItem) {
      onCartUpdate(
        cartItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + overrideQuantity }
            : item
        )
      );
    } else {
      onCartUpdate([
        ...cartItems,
        {
          id: product.id,
          name: product.name,
          quantity: overrideQuantity,
          stock: product.stock,
          barcode: product.barcode,
          category: product.category,
          original_product_price: product.price,
          is_sub_unit: product.is_sub_unit,
          pieces_per_box: product.pieces_per_box,
          sell_by_weight: product.sell_by_weight,
          remise_percentage: product.remise_percentage || 0,
          price: product.price * (1 - (product.remise_percentage || 0) / 100)
        }
      ]);
    }
  };

  const updateQuantity = (id: string | number, newQuantity: number) => {
    if (newQuantity < 1) return;

    onCartUpdate(
      cartItems.map(item =>
        item.id === id
          ? { ...item, quantity: Math.min(newQuantity, item.stock) }
          : item
      )
    );
  };

  const removeItem = (id: string | number) => {
    const item = cartItems.find(i => i.id === id);
    if (item) {
      setItemToDelete(item);
      setIsDeleteModalOpen(true);
      setDeleteInputValue("");
    }
  };

  const handleConfirmDelete = async (codeValue: string) => {
    if (!itemToDelete || !templateConfig) return;

    if (codeValue === templateConfig.deletion_secret_code || codeValue === templateConfig.deletion_barcode) {
      // Log the deletion
      try {
        const token = localStorage.getItem('authToken');
        await fetch('http://localhost:4000/api/audit/log-deletion', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actor_id: user?.id,
            actor_role: user?.role,
            action: 'product_deletion',
            details: `Le caissier ${user?.name || (typeof window !== 'undefined' ? localStorage.getItem("userName") : null) || "Inconnu"} a supprimé le produit "${itemToDelete.name}" (ID: ${itemToDelete.id}) du panier.`
          }),
        });
      } catch (logErr) {
        console.error('Failed to log deletion:', logErr);
      }

      // Remove the item
      onCartUpdate(cartItems.filter(item => item.id !== itemToDelete.id));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setDeleteInputValue("");
      showToast('Produit supprimé avec succès.', 'success');
    } else {
      showToast('Code ou Code-barres incorrect !', 'error');
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalRemise = cartItems.reduce(
    (sum, item) => {
      const originalPrice = item.original_product_price || item.price;
      return sum + (originalPrice - item.price) * item.quantity;
    },
    0
  );

  const total = subtotal;
  const pointsDiscount = usePoints ? Math.min(total, loyaltyConfig.pointsValue) : 0;
  const amountToPay = Math.max(0, total - pointsDiscount);
  const change = parseFloat(paymentAmount) - amountToPay || 0;

  const handleFinalCheckout = async () => {
    if (cartItems.length === 0 || isProcessing) return;

    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const orderItems = cartItems.map(item => {
        const isSubUnit = item.is_sub_unit;
        // if sub_unit => actual product ID is integer, and quantity = quantity / pieces
        return {
          product_id: isSubUnit ? parseInt(item.id.toString().split('_')[0]) : item.id,
          quantity: isSubUnit ? (item.quantity / (item.pieces_per_box || 1)) : item.quantity,
          unit_price: isSubUnit ? item.original_product_price : item.price
        };
      });

      const response = await fetch('http://localhost:4000/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: orderItems,
          paid_amount: parseFloat(paymentAmount) || amountToPay,
          payment_method: 'cash',
          client_id: selectedClient?.id,
          use_points: usePoints
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || `Failed to create order: ${response.status}`);
      }

      // Call success handler with order data
      onCheckoutSuccess(responseData.order);

    } catch (error) {
      console.error('Error creating order:', error);
      showAlert(`Erreur lors de la création de la commande: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
      setIsCountdownActive(false);
      setCountdown(0);
    }
  };

  const formattedDate = currentTime.toLocaleDateString('fr-FR');
  const formattedTime = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

    return (
    <div className="w-full bg-white p-4 h-full lg:sticky lg:top-4 lg:h-[calc(100vh-11rem)] lg:overflow-hidden flex flex-col relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`fixed top-24 right-6 z-9999 px-6 py-4 shadow-2xl border-l-8 flex items-center gap-3 font-bold uppercase tracking-widest text-xs min-w-[300px] ${
              toast.type === 'success' 
                ? 'bg-white border-green-600 text-green-600' 
                : 'bg-white border-red-600 text-red-600'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center p-6 border-2 border-red-600 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmation Requise</h3>
            <p className="text-sm text-gray-600 mb-6">
              Veuillez saisir le code secret ou scanner le code-barres administrateur pour supprimer <span className="font-bold text-red-600 inline">"{itemToDelete?.name}"</span>.
            </p>
            
            <div className="space-y-4">
              <input
                autoFocus
                type="password"
                value={deleteInputValue}
                onChange={(e) => setDeleteInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmDelete(deleteInputValue);
                  if (e.key === 'Escape') setIsDeleteModalOpen(false);
                }}
                className="w-full border-2 border-red-600 px-4 py-4 text-center text-xl font-bold tracking-widest focus:outline-none bg-red-50"
                placeholder="****"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 bg-gray-200 text-gray-800 font-bold hover:bg-gray-300"
                >
                  ANNULER
                </button>
                <button
                  onClick={() => handleConfirmDelete(deleteInputValue)}
                  className="flex-1 py-4 bg-red-600 text-white font-bold hover:bg-red-700"
                >
                  VALIDER
                </button>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 font-bold uppercase">
              <Barcode size={16} /> En attente de scan...
            </div>
          </div>
        </div>
      )}
      {/* Barcode Scanner Section */}
      {/*  <div className="border border-gray-300 px-2 text-center mb-4 shrink-0 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Barcode className="w-4 h-4" />
            Scanner Code-Barres
          </h3>
          <button
            onClick={() => setShowBarcodeInput(!showBarcodeInput)}
            className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 "
          >
            {showBarcodeInput ? 'Masquer' : 'Saisie Manuelle'}
          </button>
        </div>

        {showBarcodeInput && (
          <div className="flex gap-2 mb-2">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualBarcodeSearch()}
              placeholder="Entrez le code-barres..."
              className="pr-10 bg-white py-4 border-2 border-gray-400 w-full outline-none border-gray-800"
            />
            <button
              onClick={handleManualBarcodeSearch}
              disabled={!barcodeInput.trim() || scanLoading}
              className="flex-1 bg-gray-800 text-white py-4 hover:bg-gray-900 disabled:bg-gray-400 font-bold uppercase border-2 border-gray-900"
            >
              Rechercher
            </button>
          </div>
        )}

        <div className="text-xs">
          {scanLoading ? (
            <div className="text-blue-600">Recherche du produit...</div>
          ) : scannedBarcode ? (
            <div className="text-green-600">
              Code détecté: <span>{scannedBarcode}</span>
            </div>
          ) : (
            <div className="text-gray-500 text-xs">
           </div>
          )}
        </div>
      </div> */}

      {/*  <h2 className="font-semibold text-lg mb-4 shrink-0">
        {cartItems.length === 0 ? 'Nouvelle Commande' : 'Panier'}
      </h2> */}

      {/* Products Orders Section */}
      <div className="flex-1 overflow-hidden mb-4">
        {cartItems.length === 0 ? (
          <div className="border border-gray-300 h-full flex flex-col">
            {/* Current Date & Time Display */}
            <div className="bg-gray-50 p-4 border-b border-gray-300">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formattedDate}</span>

                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{formattedTime}</span>
                </div>
              </div>
            </div>

            {/* Empty State */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm mb-2">En attente de produits...</p>
              <p className="text-gray-400 text-xs text-center">
                Scannez ou sélectionnez des produits pour commencer la vente
              </p>

              {/* Skeleton Items */}
              <div className="w-full max-w-sm space-y-3 mt-6">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 w-3/4"></div>
                      <div className="h-2 bg-gray-200 w-1/2"></div>
                    </div>
                    <div className="w-12 h-6 bg-gray-200"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-300 h-full overflow-hidden flex flex-col">
            <div className="overflow-y-auto scrollbar-hide flex-1 p-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 last:border-b-0 last:mb-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1"><p className="font-semibold text-sm text-gray-800 truncate">{item.name}</p>{item.remise_percentage && item.remise_percentage > 0 ? (<span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold uppercase rounded-none border border-red-200 shrink-0">-{item.remise_percentage}%</span>) : null}</div>
                    {item.category && (
                      <p className="flex items-center gap-2 text-xs uppercase text-gray-500 mb-2">
                        {item.category} | <span className="flex items-center"> <Barcode size={14} className="mr-1" /> {item.barcode}</span>
                      </p>
                    )}

                    <div className="flex items-center space-x-2 text-gray-600 my-2">
                      <label className="text-xs">{item.sell_by_weight ? 'Poids:' : 'Qté:'}</label>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - (item.sell_by_weight ? 0.1 : 1))}
                          className="w-12 h-10 border border-gray-300 flex items-center justify-center text-xl"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          step={item.sell_by_weight ? "0.001" : "1"}
                          onChange={(e) =>
                            updateQuantity(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 border border-gray-300 text-center text-xs py-2.5"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + (item.sell_by_weight ? 0.1 : 1))}
                          className="w-12 h-10 border border-gray-300 flex items-center justify-center text-base"
                        >
                          +
                        </button>
                      </div>
                     <div className='flex items-center'>
                       <span className="text-xs">
                        x {item.price.toFixed(3)} {/* {item.sell_by_weight ? '/kg' : ''} */}
                      </span>
                     </div>
                    </div>
                    {item.quantity >= item.stock && !item.sell_by_weight && (
                      <p className="text-xs text-red-600">Stock limité</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <p className="font-bold text-sm text-gray-800 whitespace-nowrap">
                      {(item.price * item.quantity).toFixed(3)} DT
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="px-4 py-4 text-gray-400 bg-gray-100 hover:text-red-500"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Totals and Payment Section - ALWAYS VISIBLE */}
      <div className="shrink-0 space-y-4 border-t border-gray-200 pt-4">
        {/* Totals - Only show if there are items */}
        {cartItems.length > 0 && (
          <>
            {/*  <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Sous-total:</span>
                <span>{subtotal.toFixed(3)} DT</span>
              </div>
            </div> */}

            <div className="text-sm text-gray-600 space-y-1">
              {totalRemise > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>Total Remise:</span>
                  <span>- {totalRemise.toFixed(3)} DT</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-gray-200 pt-2">
              <span className="font-bold text-lg">Total à payer:</span>
              <div className="text-right">
                {pointsDiscount > 0 && (
                   <div className="text-sm text-blue-600 line-through font-medium">
                     {total.toFixed(3)} DT
                   </div>
                )}
                <span className="font-bold text-lg">{amountToPay.toFixed(3)} DT</span>
              </div>
            </div>

            {/* Payment & Loyalty Grid */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Paiement</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                   <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border px-3 py-4 text-sm border-gray-300"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase pointer-events-none">Espèces</div>
                </div>
                
                <button
                  type="button"
                  disabled={!selectedClient || selectedClient.loyalty_points < loyaltyConfig.minPoints}
                  onClick={() => setUsePoints(!usePoints)}
                  className={`border px-3 py-2 flex flex-col items-center justify-center ${
                    usePoints 
                      ? "bg-gray-600 border-gray-600 text-white" 
                      : "bg-white border-gray-300 text-gray-700"
                  } ${(!selectedClient || selectedClient.loyalty_points < loyaltyConfig.minPoints) ? "opacity-30 grayscale cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Points Fidélité</span>
                  <span className="text-sm font-black">{usePoints ? `-${pointsDiscount.toFixed(2)} DT` : `${selectedClient?.loyalty_points || 0} pts`}</span>
                  {!usePoints && selectedClient?.loyalty_points >= loyaltyConfig.minPoints && (
                    <span className="text-[9px] text-green-600 font-bold">DISPONIBLE !</span>
                  )}
                </button>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Monnaie à rendre:</span>
                <span className={`font-semibold text-base ${change >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {change.toFixed(3)} DT
                </span>
              </div>
            </div>

            {/* Countdown Confirmation Section */}
            {isCountdownActive ? (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Impression dans <span className="font-bold text-blue-600">{countdown}s</span>
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={cancelCountdown}
                      className="flex-1 py-4 bg-red-600 text-white text-sm font-medium"
                    >
                      Annuler ({countdown}s)
                    </button>
                    <button
                      onClick={handleImmediateCheckout}
                      disabled={isProcessing}
                      className={`flex-1 py-4 text-sm font-medium ${isProcessing
                        ? "bg-gray-400 cursor-not-allowed text-gray-200"
                        : "bg-green-600 text-white"
                        }`}
                    >
                      {isProcessing ? "Traitement..." : "Imprimer maintenant"}
                    </button>
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              /* Processing State */
              <button
                disabled
                className="w-full py-4 bg-gray-400 text-gray-200 text-sm font-medium cursor-not-allowed"
              >
                Traitement en cours...
              </button>
            ) : (
              /* Normal Checkout Button */
              <button
                onClick={startCountdown}
                disabled={cartItems.length === 0}
                className={`w-full py-4 text-sm font-medium  ${cartItems.length === 0
                  ? "bg-gray-400 cursor-not-allowed text-gray-200"
                  : "bg-gray-800 hover:bg-gray-900 text-white"
                  }`}
              >
                Valider et imprimer
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}



"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import Products, { ProductsRefHandle } from '../components/Products/Products';
import OrderPanel from '../components/Products/OrderPanel';
import dynamic from 'next/dynamic';

const SuccessReceipt = dynamic(() => import('../components/Products/SuccessReceipt'), { ssr: false });
import { useAlert } from '../components/AlertContext';
import Select from 'react-select';
import { User as UserIcon } from 'lucide-react';

interface CartItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
  original_product_price?: number;
  remise_percentage?: number;
  is_sub_unit?: boolean;
  pieces_per_box?: number;
  sell_by_weight?: boolean;
}

interface TabSession {
  id: string;
  cartItems: CartItem[];
  createdAt: number;
  name: string;
  isActive: boolean;
  originalNumber: number;
  selectedClient?: any | null;
}

interface Client {
  id: number;
  name: string;
  phone?: string;
  loyalty_points: number;
}

const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    minHeight: '44px',
    borderRadius: '0px',
    border: '1px solid #d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #374151' : 'none',
    '&:hover': {
      borderColor: '#9ca3af',
    },
    fontSize: '13px',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#374151' : state.isFocused ? '#f3f4f6' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    padding: '10px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#4b5563',
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    borderRadius: '0px',
    border: '1px solid #d1d5db',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 9999,
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: '#374151',
    fontWeight: '500',
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: '#9ca3af',
  })
};

export default function ProductsPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [tabSessions, setTabSessions] = useState<TabSession[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const productsRef = useRef<ProductsRefHandle>(null);
  const { showAlert } = useAlert();

  // Generate unique tab ID
  const generateTabId = () => {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Generate tab name with sequential numbering
  const generateTabName = (tabs: TabSession[]) => {
    const nextNumber = tabs.length + 1;
    return `Caisse ${nextNumber}`;
  };

  // Reorganize tab numbers to be sequential
  const reorganizeTabNumbers = (tabs: TabSession[]): TabSession[] => {
    return tabs.map((tab, index) => ({
      ...tab,
      name: `Caisse ${index + 1}`,
      originalNumber: index + 1
    }));
  };

  // Initialize first tab
  useEffect(() => {
    const firstTabId = generateTabId();
    const firstTab: TabSession = {
      id: firstTabId,
      cartItems: [],
      createdAt: Date.now(),
      name: 'Caisse 1',
      isActive: true,
      originalNumber: 1
    };

    setTabSessions([firstTab]);
    setActiveTabId(firstTabId);

    // Load cart from localStorage for first tab
    const savedCart = localStorage.getItem(`cart_${firstTabId}`);
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  // Update current tab when cart changes
  useEffect(() => {
    if (activeTabId && !showSuccess) { // Only update if not in success state
      const updatedTabs = tabSessions.map(tab =>
        tab.id === activeTabId
          ? { ...tab, cartItems, isActive: true }
          : { ...tab, isActive: false }
      );

      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
      localStorage.setItem(`cart_${activeTabId}`, JSON.stringify(cartItems));
    }
  }, [cartItems, activeTabId, showSuccess]);

  // Fetch clients for loyalty
  const fetchClients = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch('http://localhost:4000/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Load tabs from localStorage on component mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('tabSessions');
    if (savedTabs) {
      const tabs: TabSession[] = JSON.parse(savedTabs);
      const reorganizedTabs = reorganizeTabNumbers(tabs);
      setTabSessions(reorganizedTabs);

      const activeTab = reorganizedTabs.find(tab => tab.isActive) || reorganizedTabs[0];
      if (activeTab) {
        setActiveTabId(activeTab.id);
        setCartItems(activeTab.cartItems);
      }
    }
  }, []);

  // Function to add product to cart
  const addToCart = (product: any) => {
    if (showSuccess) return; // Don't add to cart if in success state

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);

      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      } else {
        const remise_percentage = product.remise_percentage || 0;
        const netPrice = product.price * (1 - remise_percentage / 100);

        return [...prevItems, {
          id: product.id,
          name: product.name,
          quantity: 1,
          price: netPrice,
          stock: product.stock,
          barcode: product.barcode,
          category: product.category,
          original_product_price: product.price,
          remise_percentage: remise_percentage,
          is_sub_unit: product.is_sub_unit,
          pieces_per_box: product.pieces_per_box
        }];
      }
    });
  };

  // Update cart items
  const updateCartItems = (items: CartItem[]) => {
    if (showSuccess) return; // Don't update if in success state
    setCartItems(items);
  };

  // Add new tab
  const addNewTab = () => {
    const newTabId = generateTabId();
    const newTabName = generateTabName(tabSessions);

    const newTab: TabSession = {
      id: newTabId,
      cartItems: [],
      createdAt: Date.now(),
      name: newTabName,
      isActive: true,
      originalNumber: tabSessions.length + 1
    };

    const updatedTabs = tabSessions.map(tab => ({ ...tab, isActive: false }));
    updatedTabs.push(newTab);

    // Reorganize numbers to ensure they are sequential
    const reorganizedTabs = reorganizeTabNumbers(updatedTabs);

    setTabSessions(reorganizedTabs);
    setActiveTabId(newTabId);
    setCartItems([]);
    setShowSuccess(false);
    setOrderData(null);

    localStorage.setItem('tabSessions', JSON.stringify(reorganizedTabs));
  };

  // Switch between tabs
  const switchToTab = (tabId: string) => {
    const tab = tabSessions.find(t => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      setCartItems(tab.cartItems);
      setShowSuccess(false);
      setOrderData(null);

      // Update tab active states
      const updatedTabs = tabSessions.map(t =>
        t.id === tabId
          ? { ...t, isActive: true }
          : { ...t, isActive: false }
      );
      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
    }
  };

  // Close tab
  const closeTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (tabSessions.length <= 1) {
      showAlert("Vous ne pouvez pas fermer la dernière caisse !", "error");
      return;
    }

    const tabToClose = tabSessions.find(t => t.id === tabId);
    const updatedTabs = tabSessions.filter(t => t.id !== tabId);

    // Reorganize numbers to ensure they are sequential after removal
    const reorganizedTabs = reorganizeTabNumbers(updatedTabs);

    setTabSessions(reorganizedTabs);
    localStorage.setItem('tabSessions', JSON.stringify(reorganizedTabs));
    localStorage.removeItem(`cart_${tabId}`);

    // If closing active tab, switch to another tab
    if (tabId === activeTabId) {
      let newActiveTabId: string;

      // Try to find the tab that was next to the closed one
      const closedTabIndex = tabSessions.findIndex(t => t.id === tabId);
      if (closedTabIndex > 0) {
        // Switch to previous tab
        newActiveTabId = reorganizedTabs[closedTabIndex - 1]?.id || reorganizedTabs[0].id;
      } else {
        // Switch to first tab
        newActiveTabId = reorganizedTabs[0].id;
      }

      switchToTab(newActiveTabId);
    }
  };

  // Rename tab (custom name, not numbered)
  const renameTab = (tabId: string, newName: string) => {
    // Only allow custom names that don't start with "Caisse"
    if (newName.trim().toLowerCase().startsWith('caisse')) {
      showAlert("Les noms personnalisés ne peuvent pas commencer par 'Caisse'. Utilisez un nom différent.", "error");
      return;
    }

    const updatedTabs = tabSessions.map(tab =>
      tab.id === tabId ? { ...tab, name: newName.trim() } : tab
    );

    setTabSessions(updatedTabs);
    localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
  };

  // Reset tab to numbered name
  const resetTabName = (tabId: string) => {
    const tab = tabSessions.find(t => t.id === tabId);
    if (tab) {
      const tabIndex = tabSessions.findIndex(t => t.id === tabId);
      const newName = `Caisse ${tabIndex + 1}`;

      const updatedTabs = tabSessions.map(t =>
        t.id === tabId ? { ...t, name: newName } : t
      );

      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
    }
  };

  // Handle successful checkout
  const handleCheckoutSuccess = (order: any) => {
    setOrderData(order);
    setShowSuccess(true);
    // Silently refresh products to update stock counts
    productsRef.current?.refresh();

    // Update selected client in current tab session with the latest points from order.Client
    if (order.Client) {
      const updatedTabs = tabSessions.map(t =>
        t.id === activeTabId ? { ...t, selectedClient: order.Client } : t
      );
      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
    }

    fetchClients(); // Refresh global list for dropdown
  };

  // Handle print ticket (confirmed payment) - RESET EVERYTHING
  const handlePrintTicket = () => {
    // Clear cart for current tab after successful order
    const currentTab = tabSessions.find(t => t.id === activeTabId);
    if (currentTab) {
      // Reset the current tab to empty state
      const updatedTabs = tabSessions.map(tab =>
        tab.id === activeTabId ? { ...tab, cartItems: [], selectedClient: null } : tab
      );

      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
      localStorage.removeItem(`cart_${activeTabId}`);
    }

    // Silently refresh products to update stock
    productsRef.current?.refresh();

    // Reset all states
    setCartItems([]);
    setShowSuccess(false);
    setOrderData(null);
  };

  // Handle cancel operation (keep items for editing)
  const handleCancelOperation = () => {
    setShowSuccess(false);
    setOrderData(null);
    // Cart items remain unchanged for editing
  };

  // Get current tab name for display
  const getCurrentTabName = () => {
    const tab = tabSessions.find(t => t.id === activeTabId);
    return tab?.name || 'Caisse';
  };

  // Get total items count for a tab
  const getTabItemsCount = (tab: TabSession) => {
    return tab.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Check if tab has custom name
  const hasCustomName = (tab: TabSession) => {
    return !tab.name.startsWith('Caisse ');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Manager */}
      <div className="bg-gray-200 text-white px-4 pt-0  flex justify-between items-center border-b border-gray-300">
        <div className="flex items-center space-x-2 flex-1 overflow-x-auto">
          {tabSessions.map((tab) => (
            <div
              key={tab.id}
              onClick={() => switchToTab(tab.id)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-t-lg cursor-pointer min-w-0 max-w-xs relative group
                ${tab.id === activeTabId
                  ? 'bg-white text-gray-800 font-semibold'
                  : 'bg-gray-600 hover:bg-gray-700'
                }
                ${showSuccess && tab.id === activeTabId ? 'border-2 border-green-500' : ''}
              `}
            >
              {/* Tab Name with Context Menu */}
              <div className="flex items-center space-x-2 flex-1" >
                <span
                  className="truncate"
                  title={tab.name}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('Renommer la caisse:', tab.name);
                    if (newName && newName.trim() && !newName.trim().toLowerCase().startsWith('caisse')) {
                      renameTab(tab.id, newName.trim());
                    } else if (newName && newName.trim().toLowerCase().startsWith('caisse')) {
                      showAlert("Les noms personnalisés ne peuvent pas commencer par 'Caisse'", "error");
                    }
                  }}
                >
                  {tab.name}
                </span>

                {/* Reset button for custom names */}
                {hasCustomName(tab) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetTabName(tab.id);
                    }}
                    className="text-xs opacity-70 hover:opacity-100"
                    title="Rétablir le nom par défaut"
                  >
                    ↶
                  </button>
                )}
              </div>

              {/* Items Count Badge */}
              {getTabItemsCount(tab) > 0 && (
                <span className={`
                  rounded-full w-5 h-5 text-xs inline-flex items-center justify-center shrink-0
                  ${tab.id === activeTabId
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-500 text-white'
                  }
                `}>
                  {getTabItemsCount(tab)}
                </span>
              )}

              {/* Success Indicator */}
              {showSuccess && tab.id === activeTabId && (
                <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" title="Paiement réussi"></span>
              )}

              {/* Close Button - Only show for non-active tabs or on hover */}
              {tabSessions.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className={`
                    w-8 h-8 rounded-full flex px-4 py-2 items-center justify-center text-base shrink-0
                    ${tab.id === activeTabId
                      ? 'opacity-0 group-hover:opacity-100 hover:bg-gray-200'
                      : 'opacity-70 hover:opacity-100 hover:bg-gray-600'
                    }
                  `}
                  title="Fermer cette caisse"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2 mr-4 min-w-[300px]">
          <UserIcon className="text-gray-600 text-xl" />
          <div className="flex-1">
            <Select
              placeholder="Sélectionner Client / Fidélité..."
              options={[
                { value: null, label: 'Client de Passage (Anonyme)' },
                ...clients.map(c => ({ value: c, label: `${c.name} (${c.loyalty_points} pts)` }))
              ]}
              value={
                tabSessions.find(t => t.id === activeTabId)?.selectedClient 
                  ? { 
                      value: tabSessions.find(t => t.id === activeTabId)?.selectedClient, 
                      label: `${tabSessions.find(t => t.id === activeTabId)?.selectedClient.name} (${tabSessions.find(t => t.id === activeTabId)?.selectedClient.loyalty_points} pts)` 
                    }
                  : { value: null, label: 'Client de Passage (Anonyme)' }
              }
              onChange={(option: any) => {
                const updatedTabs = tabSessions.map(t => 
                  t.id === activeTabId ? { ...t, selectedClient: option.value } : t
                );
                setTabSessions(updatedTabs);
                localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
              }}
              styles={customSelectStyles}
            />
          </div>
        </div>

        <div className="flex space-x-2 ml-4 shrink-0">
          <button
            onClick={addNewTab}
            className="px-3 py-2 bg-gray-600 hover:bg-green-700 rounded-t-lg text-sm flex items-center space-x-1"
            title="Ouvrir une nouvelle caisse"
          >
            <span className="text-lg">+</span>
            <span className="hidden sm:inline">Nouvelle Caisse</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row w-full p-2 sm:p-2 flex-1 gap-4 bg-gray-50">
        <div className="flex-1 overflow-hidden">
          <Products ref={productsRef} onAddToCart={addToCart} />
        </div>
        <div className="w-full lg:w-96 xl:w-96 2xl:w-md shrink-0">
          {showSuccess ? (
            <SuccessReceipt
              order={orderData}
              cartItems={cartItems}
              onPrintTicket={handlePrintTicket}
              onCancelOperation={handleCancelOperation}
              client={tabSessions.find(t => t.id === activeTabId)?.selectedClient || null}
            />
          ) : (
            <OrderPanel
              cartItems={cartItems}
              onCartUpdate={updateCartItems}
              onCheckoutSuccess={handleCheckoutSuccess}
              currentSessionName={getCurrentTabName()}
              selectedClient={tabSessions.find(t => t.id === activeTabId)?.selectedClient || null}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}

      {/* Status Bar */}
      <div className="bg-gray-800 text-white px-4 sm:fixed bottom-0 w-full  text-xs flex justify-between items-center shrink-0 border-t border-gray-700">
        <span className="flex items-center space-x-2">
          <span className="font-medium">{getCurrentTabName()}</span>
          <span className="text-gray-300">•</span>
          {showSuccess ? (
            <span className="text-green-300 flex items-center">
              <span className="w-2 h-2 bg-green-300 rounded-full mr-2"></span>
              Paiement réussi - Prêt pour nouvelle commande
            </span>
          ) : (
            <span className="text-gray-300">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} article(s) •
              {cartItems.length} produit(s) •
              {cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(3)} DT
            </span>
          )}
        </span>
        <span className="text-gray-300 bg-gray-700 px-2 py-1 rounded text-xs">
          {tabSessions.length} caisse(s) ouverte(s)
        </span>
      </div>
    </div>
  );
}
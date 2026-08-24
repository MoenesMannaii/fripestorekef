"use client";
import {
  Plus, Trash2, Search, X, Banknote, User as UserIcon, Phone,
  CheckCircle, Hourglass, History, RefreshCw, Calendar, FileText, ChevronDown, ChevronRight
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
interface CreditSaleItem {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface CreditSale {
  id: number;
  client_name: string;
  client_phone: string;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid';
  items: CreditSaleItem[];
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  has_sub_units?: boolean;
  pieces_per_box?: number;
}

interface CartItem extends Product {
  quantity: number;
  unit_price: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('authToken');

const statusLabel = (s: string) => {
  if (s === 'paid') return { text: 'Soldé', cls: 'bg-green-100 text-green-700 border-green-200' };
  if (s === 'partial') return { text: 'Partiel', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { text: 'En attente', cls: 'bg-red-100 text-red-700 border-red-200' };
};

const fmt = (n: number) => n.toFixed(3) + ' DT';

// ── Main Component ────────────────────────────────────────────────────────────
export default function CreditPage() {
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New sale modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Payment modal
  const [payModal, setPayModal] = useState<{ open: boolean; sale: CreditSale | null }>({ open: false, sale: null });
  const [payAmount, setPayAmount] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Pay All Modal
  const [payAllModal, setPayAllModal] = useState<{ open: boolean; clientName: string; totalRemaining: number }>({ open: false, clientName: '', totalRemaining: 0 });
  const [payAllSubmitting, setPayAllSubmitting] = useState(false);

  // Detail modal
  const [detailSale, setDetailSale] = useState<CreditSale | null>(null);

  // Expanded client rows
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const toggleClient = (clientName: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientName)) next.delete(clientName);
      else next.add(clientName);
      return next;
    });
  };

  const fetchCreditSales = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await fetch(`http://localhost:4000/api/credit?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setCreditSales(data.creditSales || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:4000/api/products', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchCreditSales(); }, [fetchCreditSales]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.stock > 0
  ).slice(0, 8);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1, unit_price: product.price }];
    });
  };

  const removeFromCart = (id: number) => setCartItems(prev => prev.filter(i => i.id !== id));
  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) return removeFromCart(id);
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const cartTotal = cartItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);

  const openNewModal = () => {
    setClientName(''); setClientPhone(''); setDueDate(''); setNotes('');
    setCartItems([]); setProductSearch(''); setAmountPaid(''); setFormError('');
    fetchProducts();
    setShowNewModal(true);
  };

  const submitCreditSale = async () => {
    if (!clientName || !clientName.trim()) { setFormError('Le nom du client est requis.'); return; }
    if (cartItems.length === 0) { setFormError('Ajoutez au moins un produit.'); return; }
    setSubmitting(true); setFormError('');
    try {
      const res = await fetch('http://localhost:4000/api/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          client_name: clientName,
          client_phone: clientPhone,
          items: cartItems.map(i => ({ product_id: i.id, name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
          amount_paid: parseFloat(amountPaid) || 0,
          due_date: dueDate || undefined,
          notes: notes || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || 'Erreur lors de la création.');
        return;
      }
      // Trigger a silent refresh for other POS components/tabs
      localStorage.setItem('pos-refresh', Date.now().toString());
      setShowNewModal(false);
      // Assuming a resetForm function exists or we reset manually
      setClientName(''); setClientPhone(''); setDueDate(''); setNotes('');
      setCartItems([]); setProductSearch(''); setAmountPaid('');
      fetchCreditSales();
    } catch (err) {
      setFormError('Erreur réseau. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (!payModal.sale || !payAmount || parseFloat(payAmount) <= 0) return;
    setPaySubmitting(true);
    try {
      await fetch(`http://localhost:4000/api/credit/${payModal.sale.id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount: parseFloat(payAmount) })
      });
      setPayModal({ open: false, sale: null });
      setPayAmount('');
      fetchCreditSales();
    } catch (err) {
      console.error(err);
    } finally {
      setPaySubmitting(false);
    }
  };

  const submitPayAll = async () => {
    if (!payAllModal.clientName || payAllModal.totalRemaining <= 0) return;
    setPayAllSubmitting(true);
    try {
      await fetch(`http://localhost:4000/api/credit/client/${encodeURIComponent(payAllModal.clientName)}/pay-all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      });
      setPayAllModal({ open: false, clientName: '', totalRemaining: 0 });
      fetchCreditSales();
    } catch (err) {
      console.error(err);
    } finally {
      setPayAllSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 pb-10">

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ventes à Crédit</h1>
            <p className="text-sm text-gray-500 mt-1">Achetez maintenant, payez plus tard (BNPL)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchCreditSales}
              className="flex items-center gap-2 px-4 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 "
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-4 bg-gray-800 text-white text-sm hover:bg-gray-700 "
            >
              <Plus className="w-4 h-4" />
              Nouvelle vente à crédit
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-1">Crédit en cours</p>
              <p className="text-2xl font-bold text-red-700">{fmt(summary.total_pending || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">Montant restant à recouvrer</p>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-1">Clients actifs</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_clients || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Clients avec crédit ouvert</p>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-1">Montant recouvré</p>
              <p className="text-2xl font-bold text-green-700">{fmt(summary.total_recovered || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">Paiements reçus au total</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 mb-0">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
          {/* Status Tabs */}
          <div className="flex gap-4">
            {[
              { val: 'all', label: 'Tous' },
              { val: 'pending', label: 'En attente' },
              { val: 'partial', label: 'Partiel' },
              { val: 'paid', label: 'Soldé' }
            ].map(tab => (
              <button
                key={tab.val}
                onClick={() => setStatusFilter(tab.val)}
                className={`px-6 py-4 text-sm font-medium border  ${
                  statusFilter === tab.val
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-6.5 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou téléphone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-4 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm ">Chargement...</div>
        ) : creditSales.length === 0 ? (
          <div className="p-10 text-center">
            <Banknote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Aucune vente à crédit</p>
            <p className="text-xs text-gray-400 mt-1">Créez votre première vente à crédit ci-dessus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payé</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Crédits/Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const groups: Record<string, CreditSale[]> = {};
                  creditSales.forEach(sale => {
                    const key = sale.client_name;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(sale);
                  });
                  const clientGroups = Object.entries(groups).map(([name, sales]) => {
                    const totalAmount = sales.reduce((acc, s) => acc + s.total_amount, 0);
                    const totalPaid = sales.reduce((acc, s) => acc + s.amount_paid, 0);
                    const remainingAmount = sales.reduce((acc, s) => acc + s.remaining_amount, 0);
                    const phone = sales.find(s => s.client_phone)?.client_phone || '';
                    return {
                      client_name: name,
                      client_phone: phone,
                      total_amount: totalAmount,
                      amount_paid: totalPaid,
                      remaining_amount: remainingAmount,
                      sales: sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    };
                  });

                  return clientGroups.map(group => {
                    const isExpanded = expandedClients.has(group.client_name);
                    const isAllPaid = group.remaining_amount <= 0;
                    return (
                      <React.Fragment key={group.client_name}>
                        <tr 
                          onClick={() => toggleClient(group.client_name)}
                          className={`hover:bg-gray-100  cursor-pointer ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}
                        >
                          <td className="px-4 py-4 text-gray-400">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-gray-900">{group.client_name}</p>
                            {group.client_phone && <p className="text-xs text-gray-500">{group.client_phone}</p>}
                          </td>
                          <td className="px-4 py-4 font-semibold text-gray-800">{fmt(group.total_amount)}</td>
                          <td className="px-4 py-4 text-green-700 font-medium">{fmt(group.amount_paid)}</td>
                          <td className="px-4 py-4 text-red-700 font-bold">{fmt(group.remaining_amount)}</td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 text-xs font-semibold border ${isAllPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                              {isAllPaid ? 'Soldé' : 'En attente'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-500 text-sm font-medium">
                            {group.sales.length} crédit{group.sales.length > 1 ? 's' : ''}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {!isAllPaid && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPayAllModal({ open: true, clientName: group.client_name, totalRemaining: group.remaining_amount });
                                  }}
                                  className="px-4 py-4 text-xs bg-green-700 text-white hover:bg-green-600  whitespace-nowrap"
                                >
                                  Tout solder
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setClientName(group.client_name);
                                  setClientPhone(group.client_phone);
                                  setDueDate(''); setNotes('');
                                  setCartItems([]); setProductSearch(''); setAmountPaid(''); setFormError('');
                                  fetchProducts();
                                  setShowNewModal(true);
                                }}
                                className="px-4 py-4 text-xs bg-gray-700 text-white hover:bg-gray-700  whitespace-nowrap"
                              >
                                + Nouveau crédit
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {isExpanded && group.sales.map((sale, idx) => {
                          const badge = statusLabel(sale.status);
                          return (
                            <tr key={sale.id} className="bg-gray-50/50 hover:bg-gray-100  text-sm border-l-4 border-gray-300">
                              <td className="px-4 py-3 text-gray-400 pl-4 border-r border-gray-100 bg-gray-100/50">
                                <span className="text-xs">#{sale.id}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 font-medium pl-6">
                                Crédit {group.sales.length - idx}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-700">{fmt(sale.total_amount)}</td>
                              <td className="px-4 py-3 text-green-600">{fmt(sale.amount_paid)}</td>
                              <td className="px-4 py-3 text-red-600 font-bold">{fmt(sale.remaining_amount)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs border ${badge.cls}`}>{badge.text}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">
                                {new Date(sale.created_at).toLocaleDateString('fr-FR')}
                                {sale.due_date && <span className="block text-orange-600 mt-0.5">Éch: {new Date(sale.due_date).toLocaleDateString('fr-FR')}</span>}
                              </td>
                              <td className="px-4 py-3 text-right pr-4">
                                <div className="flex justify-end gap-4">
                                  <button onClick={() => setDetailSale(sale)} className="p-4 border border-gray-300 text-gray-600 hover:bg-gray-200" title="Détails"><FileText className="w-5 h-5" /></button>
                                  {sale.status !== 'paid' && (
                                    <button onClick={() => { setPayModal({ open: true, sale }); setPayAmount(''); }} className="p-4 bg-gray-800 text-white hover:bg-gray-700" title="Paiement"><Banknote className="w-5 h-5" /></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── New Sale Modal ─────────────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Nouvelle vente à crédit</h2>
              <button onClick={() => setShowNewModal(false)} className="flex items-center text-gray-600 hover:text-gray-700 p-4 bg-gray-100">
                <X className="w-5 h-5" /> Fermer
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left — Client + Products */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 border-r border-gray-200">
                {/* Client Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider border-b pb-2 mb-3">Informations client</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client *</label>
                      <div className="relative">
                        <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          list="client-names"
                          value={clientName}
                          onChange={e => {
                            const val = e.target.value;
                            setClientName(val);
                            const existing = creditSales.find(s => s.client_name === val);
                            if (existing && existing.client_phone) {
                              setClientPhone(existing.client_phone);
                            }
                          }}
                          placeholder="Nom complet"
                          className="w-full pl-8 pr-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                          style={{ minHeight: '44px' }}
                        />
                        <datalist id="client-names">
                          {Array.from(new Set(creditSales.map(s => s.client_name))).map(name => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={clientPhone}
                          onChange={e => setClientPhone(e.target.value)}
                          placeholder="Ex: 22 345 678"
                          className="w-full pl-8 pr-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                          style={{ minHeight: '44px' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="date"
                          value={dueDate}
                          onChange={e => setDueDate(e.target.value)}
                          className="w-full pl-8 pr-3 py-4 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Acompte versé (DT)</label>
                      <div className="relative">
                        <Banknote className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          value={amountPaid}
                          onChange={e => setAmountPaid(e.target.value)}
                          placeholder="0.000"
                          min="0"
                          step="0.001"
                          className="w-full pl-8 pr-3 py-4 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Remarques, conditions..."
                      className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 resize-none"
                    />
                  </div>
                </div>

                {/* Product Search */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider border-b pb-2">Ajouter des produits</h3>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Rechercher un produit..."
                      className="w-full pl-8 pr-3 py-4 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                    />
                  </div>
                  {productSearch && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 divide-y divide-gray-100 bg-white">
                      {filteredProducts.length === 0 ? (
                        <p className="text-sm text-gray-400 p-3 italic">Aucun produit trouvé</p>
                      ) : filteredProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { addToCart(p); setProductSearch(''); }}
                          className="w-full flex justify-between items-center px-3 py-2 hover:bg-gray-50  text-left"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.name}</p>
                            {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-sm font-bold text-gray-800">{fmt(p.price)}</p>
                            <p className="text-xs text-gray-400">Stock: {p.stock}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right — Cart + Summary */}
              <div className="w-1/2 flex flex-col p-6">
                <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider border-b pb-2 mb-3">Panier</h3>
                {cartItems.length === 0 ? (
                  <p className="text-base text-gray-400 italic py-4 text-center">Aucun produit ajouté</p>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2 border border-gray-100 bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{fmt(item.unit_price)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <button onClick={() => updateQty(item.id, item.quantity - 1)} className="p-4 w-5 h-5 border border-gray-300 text-gray-600 hover:bg-gray-200 text-base flex items-center justify-center">−</button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, item.quantity + 1)} className="p-4 w-5 h-5 border border-gray-300 text-gray-600 hover:bg-gray-200 text-base flex items-center justify-center">+</button>
                          <button onClick={() => removeFromCart(item.id)} className="ml-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total</span>
                    <span className="font-bold text-gray-900">{fmt(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Acompte versé</span>
                    <span className="text-green-700 font-medium">{fmt(parseFloat(amountPaid) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="font-bold text-gray-700">Reste à payer</span>
                    <span className="font-bold text-red-600">{fmt(Math.max(0, cartTotal - (parseFloat(amountPaid) || 0)))}</span>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-red-600 mt-3 border border-red-200 bg-red-50 px-2 py-1.5">{formError}</p>
                )}

                <button
                  onClick={submitCreditSale}
                  disabled={submitting}
                  className="mt-4 w-full py-4 bg-gray-800 text-white text-sm font-medium hover:bg-gray-700  disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Création...' : 'Créer la vente à crédit'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      {payModal.open && payModal.sale && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Enregistrer un paiement</h2>
              <button onClick={() => setPayModal({ open: false, sale: null })} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 p-3">
                <p className="font-medium text-gray-900">{payModal.sale.client_name}</p>
                <p className="text-xs text-gray-500 mt-1">Restant dû: <span className="font-bold text-red-600">{fmt(payModal.sale.remaining_amount)}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant reçu (DT)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  max={payModal.sale.remaining_amount}
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  className="w-full px-3 py-4 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                  autoFocus
                />
                {parseFloat(payAmount) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Reste après paiement: <span className="font-bold">{fmt(Math.max(0, payModal.sale.remaining_amount - parseFloat(payAmount)))}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPayModal({ open: false, sale: null })}
                  className="flex-1 py-4 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 "
                >
                  Annuler
                </button>
                <button
                  onClick={submitPayment}
                  disabled={paySubmitting || !payAmount || parseFloat(payAmount) <= 0}
                  className="flex-1 py-4 bg-gray-800 text-white text-sm hover:bg-gray-700  disabled:bg-gray-400"
                >
                  {paySubmitting ? 'Enregistrement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {detailSale && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Vente #{detailSale.id}</h2>
              <button onClick={() => setDetailSale(null)} className="flex items-center gap-2 bg-gray-100 p-2 text-gray-600 hover:text-gray-700"><X className="w-5 h-5" /> Fermer</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Client</p>
                  <p className="font-medium text-gray-900">{detailSale.client_name}</p>
                  {detailSale.client_phone && <p className="text-gray-500 text-xs">{detailSale.client_phone}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Statut</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold border ${statusLabel(detailSale.status).cls}`}>
                    {statusLabel(detailSale.status).text}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Date</p>
                  <p className="text-gray-900">{new Date(detailSale.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                {detailSale.due_date && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Échéance</p>
                    <p className="text-orange-500">{new Date(detailSale.due_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>

              {detailSale.notes && (
                <div className="bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
                  <span className="font-medium">Notes: </span>{detailSale.notes}
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold uppercase text-gray-500 border-b pb-2 mb-2">Articles</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left pb-1">Produit</th>
                      <th className="text-center pb-1">Qté</th>
                      <th className="text-right pb-1">Prix</th>
                      <th className="text-right pb-1">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(Array.isArray(detailSale.items) ? detailSale.items : []).map((item: CreditSaleItem, idx: number) => (
                      <tr key={idx} className="text-gray-700">
                        <td className="py-1.5">{item.name}</td>
                        <td className="py-1.5 text-center">{item.quantity}</td>
                        <td className="py-1.5 text-right">{fmt(item.unit_price)}</td>
                        <td className="py-1.5 text-right font-medium">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold">{fmt(detailSale.total_amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payé</span><span className="text-green-700 font-medium">{fmt(detailSale.amount_paid)}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-1"><span className="font-bold text-gray-700">Reste</span><span className="font-bold text-red-600">{fmt(detailSale.remaining_amount)}</span></div>
              </div>

              {detailSale.status !== 'paid' && (
                <button
                  onClick={() => { setDetailSale(null); setPayModal({ open: true, sale: detailSale }); setPayAmount(''); }}
                  className="w-full py-4 bg-gray-800 text-white text-sm hover:bg-gray-700  mt-2"
                >
                  Enregistrer un paiement
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Pay All Modal ─────────────────────────────────────────────────── */}
      {payAllModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tout solder</h2>
              <button onClick={() => setPayAllModal({ open: false, clientName: '', totalRemaining: 0 })} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 p-3">
                <p className="text-lg font-medium text-gray-900">{payAllModal.clientName}</p>
                <p className="text-sm text-gray-500 mt-1">Total restant dû: <span className="font-bold text-red-600">{fmt(payAllModal.totalRemaining)}</span></p>
              </div>
              <p className="text-sm text-gray-700">Êtes-vous sûr de vouloir solder la totalité des crédits pour ce client en une seule fois ?</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setPayAllModal({ open: false, clientName: '', totalRemaining: 0 })}
                  className="flex-1 py-4 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 "
                >
                  Annuler
                </button>
                <button
                  onClick={submitPayAll}
                  disabled={payAllSubmitting}
                  className="flex-1 py-4 bg-green-700 text-white text-sm hover:bg-green-600  disabled:bg-gray-400"
                >
                  {payAllSubmitting ? 'Enregistrement...' : 'Confirmer le paiement total'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


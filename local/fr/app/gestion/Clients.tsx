"use client";
import { Plus, Pencil, Trash2, User, Phone, Mail, Search, X, CheckCircle, Award, Info, ChevronDown, ChevronUp, History, ShoppingBag, Star } from 'lucide-react';

import React, { useState, useEffect, useCallback, useMemo } from "react";

import { useAlert } from "../../components/AlertContext";

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  loyalty_points: number;
  total_spent: string | number;
  created_at: string;
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [clientDetails, setClientDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { showConfirm, showAlert } = useAlert();

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:4000/api/clients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const top15Ids = useMemo(() => {
    return [...clients]
      .sort((a, b) => b.loyalty_points - a.loyalty_points)
      .slice(0, 15)
      .map(c => c.id);
  }, [clients]);

  const toggleExpand = async (client: Client) => {
    if (expandedClientId === client.id) {
      setExpandedClientId(null);
      setClientDetails(null);
      return;
    }

    setExpandedClientId(client.id);
    setLoadingDetails(true);
    setClientDetails(null);

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`http://localhost:4000/api/clients/${client.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClientDetails(data.client);
      }
    } catch (err) {
      console.error("Error fetching client details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.phone && c.phone.includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem("authToken");
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      const url = editData 
        ? `http://localhost:4000/api/clients/${editData.id}` 
        : "http://localhost:4000/api/clients";
      const method = editData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setModalOpen(false);
        setEditData(null);
        fetchClients();
        showAlert(editData ? "Client modifié" : "Client ajouté", "success");
      } else {
        showAlert("Erreur lors de l'enregistrement", "error");
      }
    } catch (err) {
      showAlert("Erreur réseau", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await showConfirm("Voulez-vous supprimer ce client ? Cette action est irréversible.")) return;
    
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`http://localhost:4000/api/clients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchClients();
        showAlert("Client supprimé", "success");
      } else {
        showAlert("Erreur de suppression", "error");
      }
    } catch (err) {
      showAlert("Erreur réseau", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className=" rounded-full h-10 w-10 border-2 border-gray-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white px-5 pb-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Base de Données Clients</h1>
            <p className="text-sm text-gray-600">Gérez vos clients et suivez leur programme de fidélité</p>
          </div>
          <button
            onClick={() => { setEditData(null); setModalOpen(true); }}
            className="flex items-center gap-1 px-4 py-4 bg-gray-600 text-white hover:bg-gray-700  mt-4 lg:mt-0 border border-gray-300 focus:ring-1 focus:ring-gray-400 font-medium"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">Nouveau Client</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un client ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 overflow-hidden text-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Client</th>
                <th className="px-6 py-4 font-semibold text-gray-700 uppercase text-xs tracking-wider text-center">Fidélité</th>
                <th className="px-6 py-4 font-semibold text-gray-700 uppercase text-xs tracking-wider text-right">Total Achats</th>
                <th className="px-6 py-4 font-semibold text-gray-700 uppercase text-xs tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((c) => (
                <React.Fragment key={c.id}>
                <tr className={`hover:bg-gray-50  cursor-pointer ${expandedClientId === c.id ? 'bg-gray-50 border-l-4 border-l-gray-600' : ''}`}
                  onClick={() => toggleExpand(c)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {c.name}
                          {top15Ids.includes(c.id) && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold border border-yellow-200 rounded-sm uppercase">
                              <Star className="w-3 h-3 fill-yellow-500" /> Top 15
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          {c.phone && <><Phone className="w-3 h-3" /> {c.phone}</>}
                          {!c.phone && <span className="italic text-gray-400">Pas de téléphone</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 font-bold border border-gray-200 shadow-sm">
                      <Award className="w-4 h-4 text-gray-600" />
                      {c.loyalty_points} <span className="text-[10px] font-medium uppercase text-gray-500">Pts</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-semibold text-gray-900">
                      {new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3 }).format(Number(c.total_spent))} DT
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <div className="p-4 text-gray-400">
                        {expandedClientId === c.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditData(c); setModalOpen(true); }} 
                        className="px-6 py-4 border border-gray-300 text-gray-600 hover:bg-gray-100 "
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} 
                        className="px-6 py-4 border border-gray-300 text-red-600 hover:bg-red-50 "
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedClientId === c.id && (
                  <tr>
                    <td colSpan={4} className="px-10 py-6 bg-gray-50 border-b border-gray-200">
                      <div className="  ">
                        <div className="flex items-center gap-2 mb-4 text-gray-800 border-b border-gray-200 pb-2">
                          <History className="w-4 h-4" />
                          <h4 className="font-bold text-sm uppercase tracking-wider">Historique des Transactions</h4>
                        </div>
                        
                        {loadingDetails ? (
                          <div className="py-8 flex justify-center">
                            <div className=" rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent" />
                          </div>
                        ) : clientDetails?.Orders && clientDetails.Orders.length > 0 ? (
                          <div className="space-y-3">
                            {clientDetails.Orders.map((order: any) => (
                              <div key={order.id} className="bg-white border border-gray-200 p-4 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-gray-50 flex items-center justify-center border border-gray-100 rounded-full">
                                    <ShoppingBag className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900">Ticket #{order.ticket_number || order.id}</div>
                                    <div className="text-[11px] text-gray-500">{new Date(order.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-8">
                                  {order.points_spent > 0 && (
                                    <div className="text-right">
                                      <div className="text-xs font-medium text-red-600">Points Utilisés</div>
                                      <div className="font-bold text-red-700 truncate">-{order.points_spent} Pts (-{Number(order.points_discount).toFixed(3)} DT)</div>
                                    </div>
                                  )}
                                  <div className="text-right">
                                    <div className="text-xs font-medium text-gray-600">Montant Total</div>
                                    <div className="font-bold text-gray-900">{Number(order.total).toFixed(3)} DT</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-gray-500 italic bg-white border border-dashed border-gray-300">
                            Aucune transaction récente trouvée pour ce client.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 flex flex-col items-center">
                    <User className="w-12 h-12 mb-3 text-gray-200" />
                    <p className="text-lg font-medium">Aucun client trouvé</p>
                    <p className="text-sm">Gérez vos clients pour le programme de fidélité.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl border border-gray-200 shadow-2xl    ">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-semibold text-gray-900">
                {editData ? "Modifier le" : "Nouveau"} Client
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 "
              >
                <X className="w-6 h-6 inline" /> Fermer
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Nom Complet *</label>
                  <input 
                    name="name" 
                    defaultValue={editData?.name} 
                    required 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                    placeholder="Nom Complet du Client"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Téléphone</label>
                  <input 
                    name="phone" 
                    defaultValue={editData?.phone} 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                    placeholder="Numéro de Téléphone"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email</label>
                  <input 
                    name="email" 
                    type="email" 
                    defaultValue={editData?.email} 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                    placeholder="Adresse Email"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Notes / Observations</label>
                  <textarea 
                    name="notes" 
                    defaultValue={editData?.notes} 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm h-32 resize-none"
                    placeholder="Remarques particulières..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-10">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="px-8 py-4 text-gray-600 hover:bg-gray-100  text-sm font-medium"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-8 py-4 bg-gray-600 text-white hover:bg-gray-700  text-sm font-medium border border-gray-300 flex items-center gap-2"
                >
                  {isSaving ? (
                    <span className="w-4 h-4  rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {editData ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;



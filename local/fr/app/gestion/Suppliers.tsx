"use client";
import { Plus, Pencil, Trash2, User, Phone, Mail, MapPin, Search, X, CheckCircle, TriangleAlert, Info } from 'lucide-react';

import React, { useState, useEffect, useCallback, useMemo } from "react";

import { useAlert } from "../../components/AlertContext";

interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { showConfirm, showAlert } = useAlert();

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:4000/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(query) || 
      (s.contact_name && s.contact_name.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query))
    );
  }, [suppliers, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem("authToken");
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      const url = editData 
        ? `http://localhost:4000/api/suppliers/${editData.id}` 
        : "http://localhost:4000/api/suppliers";
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
        fetchSuppliers();
        showAlert(editData ? "Fournisseur modifié" : "Fournisseur ajouté", "success");
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
    if (!await showConfirm("Voulez-vous supprimer ce fournisseur ? Cette action est irréversible.")) return;
    
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`http://localhost:4000/api/suppliers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSuppliers();
        showAlert("Fournisseur supprimé", "success");
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
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Gestion des Fournisseurs</h1>
            <p className="text-sm text-gray-600">Gérez votre base de données de fournisseurs et contacts</p>
          </div>
          <button
            onClick={() => { setEditData(null); setModalOpen(true); }}
            className="flex items-center gap-1 px-4 py-4 bg-gray-600 text-white hover:bg-gray-700  mt-4 lg:mt-0 border border-gray-300 focus:ring-1 focus:ring-gray-400"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Nouveau Fournisseur</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur, contact ou téléphone..."
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
                <th className="px-6 py-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Fournisseur</th>
                <th className="px-6 py-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Contact</th>
                <th className="px-6 py-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Coordonnées</th>
                <th className="px-6 py-4 font-semibold text-gray-700 uppercase text-xs tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 ">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {s.address || "Pas d'adresse"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {s.contact_name || <span className="text-gray-400 italic">Non spécifié</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {s.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {s.phone}
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {s.email}
                        </div>
                      )}
                      {!s.phone && !s.email && <span className="text-gray-400 italic">Aucun contact</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => { setEditData(s); setModalOpen(true); }} 
                        className="px-6 py-4 border border-gray-300 text-gray-600 hover:bg-gray-100 "
                        title="Modifier"
                      >
                        <Pencil />
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)} 
                        className="px-6 py-4 border border-gray-300 text-red-600 hover:bg-red-50 "
                        title="Supprimer"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
           {filteredSuppliers.length === 0 && (
  <tr>
    <td colSpan={4} className="px-6 py-12 text-center">
      <div className="flex flex-col items-center justify-center">
        <User className="w-12 h-12 mb-3 text-gray-200" />
        <p className="text-lg font-medium text-gray-500">Aucun fournisseur trouvé</p>
        <p className="text-sm text-gray-400">Essayez d'ajuster votre recherche ou d'ajouter un nouveau fournisseur.</p>
      </div>
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
                {editData ? "Modifier le" : "Nouveau"} Fournisseur
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
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Nom de l'entreprise *</label>
                  <input 
                    name="name" 
                    defaultValue={editData?.name} 
                    required 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                    placeholder="Ex: Depot Central"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Nom du contact</label>
                  <input 
                    name="contact_name" 
                    defaultValue={editData?.contact_name} 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                    placeholder="Nom de la personne"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Téléphone</label>
                  <input 
                    name="phone" 
                    defaultValue={editData?.phone} 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                    placeholder="Exp: +216 21 111 222"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email</label>
                  <input 
                    name="email" 
                    type="email" 
                    defaultValue={editData?.email} 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                    placeholder="contact@exemple.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Adresse</label>
                  <textarea 
                    name="address" 
                    defaultValue={editData?.address} 
                    className="w-full border border-gray-300 px-6 py-4 focus:ring-1 focus:ring-gray-400 outline-none text-sm h-32 resize-none"
                    placeholder="Adresse complète du fournisseur"
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

export default Suppliers;



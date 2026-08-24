"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAlert } from "../../components/AlertContext";
import Select from "react-select";

import { Check, Gift, Pencil, Plus, Tag, Trash, Trash2, ToggleRight, ToggleLeft, X } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  remise_percentage?: number;
}

interface Promotion {
  id: number;
  name: string;
  type: "percentage" | "bundle";
  product_id: number | null;
  is_active: boolean;
  MainProduct?: Product;
  BundleItems?: Array<{ id: number; product_id?: number; free_product_id?: number; quantity: number; FreeProduct?: Product }>;
  PrincipalItems?: Array<{ id: number; product_id: number; quantity: number; Product?: Product }>;
}

interface SelectOption {
  value: number;
  label: string;
}

const getToken = () => localStorage.getItem("authToken") || "";

export default function Promotions() {
  const { showConfirm, showAlert } = useAlert();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"percentage" | "bundle">("bundle");
  const [formProductId, setFormProductId] = useState<SelectOption | null>(null);
  const [formRemisePercentage, setFormRemisePercentage] = useState<number | string>("");
  const [principalItems, setPrincipalItems] = useState<Array<{ product_id: SelectOption | null; quantity: number }>>([
    { product_id: null, quantity: 1 },
  ]);
  const [bundleItems, setBundleItems] = useState<Array<{ free_product_id: SelectOption | null; quantity: number }>>([
    { free_product_id: null, quantity: 1 },
  ]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [promoRes, prodRes] = await Promise.all([
        fetch("http://localhost:4000/api/promotions", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:4000/api/products", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const promoData = await promoRes.json();
      const prodData = await prodRes.json();
      setPromotions(promoData.promotions || []);
      setProducts(prodData.products || []);
    } catch {
      showAlert("Erreur de chargement", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const productOptions: SelectOption[] = products.map((p) => ({
    value: p.id,
    label: `${p.name} — ${p.price.toFixed(3)} DT`,
  }));

  const resetForm = () => {
    setFormName("");
    setFormType("bundle");
    setFormProductId(null);
    setFormRemisePercentage("");
    setPrincipalItems([{ product_id: null, quantity: 1 }]);
    setBundleItems([{ free_product_id: null, quantity: 1 }]);
    setEditingPromo(null);
    setShowForm(false);
  };

  const openEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormName(promo.name);
    setFormType(promo.type);
    setFormProductId(productOptions.find((o) => o.value === promo.product_id) || null);
    
    if (promo.type === "percentage" && promo.MainProduct) {
      setFormRemisePercentage(promo.MainProduct.remise_percentage || "");
    } else {
      setFormRemisePercentage("");
    }

    if (promo.type === "bundle") {
      if (promo.PrincipalItems && promo.PrincipalItems.length > 0) {
        setPrincipalItems(
          promo.PrincipalItems.map((pi) => ({
            product_id: productOptions.find((o) => o.value === pi.product_id) || null,
            quantity: pi.quantity,
          }))
        );
      } else {
        setPrincipalItems([{ product_id: null, quantity: 1 }]);
      }

      if (promo.BundleItems && promo.BundleItems.length > 0) {
        setBundleItems(
          promo.BundleItems.map((bi) => ({
            free_product_id: productOptions.find((o) => o.value === (bi.product_id || bi.free_product_id)) || null,
            quantity: bi.quantity,
          }))
        );
      } else {
        setBundleItems([{ free_product_id: null, quantity: 1 }]);
      }
    } else {
      setPrincipalItems([{ product_id: null, quantity: 1 }]);
      setBundleItems([{ free_product_id: null, quantity: 1 }]);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formType === "bundle") {
      const validPrincipal = principalItems.filter((pi) => pi.product_id);
      const validFree = bundleItems.filter((bi) => bi.free_product_id);
      if (validPrincipal.length === 0) {
        showAlert("Ajoutez au moins un produit principal.", "error");
        return;
      }
      if (validFree.length === 0) {
        showAlert("Ajoutez au moins un produit offert.", "error");
        return;
      }
    } else if (formType === "percentage") {
      if (!formProductId) {
        showAlert("Veuillez sélectionner un produit principal.", "error");
        return;
      }
      const numVal = Number(formRemisePercentage);
      if (isNaN(numVal) || numVal <= 0 || numVal > 100) {
        showAlert("Le pourcentage de remise doit être entre 1 et 100.", "error");
        return;
      }
    }

    const payload = {
      name: formName.trim(),
      type: formType,
      product_id: formType === "percentage" ? formProductId?.value : null,
      remise_percentage: formType === "percentage" ? Number(formRemisePercentage) : 0,
      principal_items:
        formType === "bundle"
          ? principalItems
              .filter((pi) => pi.product_id)
              .map((pi) => ({ product_id: pi.product_id!.value, quantity: pi.quantity }))
          : [],
      bundle_items:
        formType === "bundle"
          ? bundleItems
              .filter((bi) => bi.free_product_id)
              .map((bi) => ({ free_product_id: bi.free_product_id!.value, quantity: bi.quantity }))
          : [],
    };

    try {
      const token = getToken();
      const url = editingPromo
        ? `http://localhost:4000/api/promotions/${editingPromo.id}`
        : "http://localhost:4000/api/promotions";
      const method = editingPromo ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur serveur");
      showAlert(editingPromo ? "Promotion mise à jour." : "Promotion créée.", "success");
      resetForm();
      fetchAll();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  const handleToggle = async (promo: Promotion) => {
    try {
      const token = getToken();
      await fetch(`http://localhost:4000/api/promotions/${promo.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...promo, 
          is_active: !promo.is_active,
          remise_percentage: promo.type === "percentage" ? (promo.MainProduct?.remise_percentage || 0) : 0 
        }),
      });
      fetchAll();
    } catch {
      showAlert("Impossible de modifier le statut.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!await showConfirm("Supprimer cette promotion ?")) return;
    try {
      const token = getToken();
      await fetch(`http://localhost:4000/api/promotions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAll();
      showAlert("Promotion supprimée", "success");
    } catch {
      showAlert("Erreur lors de la suppression.", "error");
    }
  };

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      borderRadius: 0,
      borderColor: "#d1d5db",
      boxShadow: "none",
      "&:hover": { borderColor: "#6b7280" },
      minHeight: "52px",
    }),
    menu: (base: any) => ({ ...base, borderRadius: 0, zIndex: 9999 }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? "#4b5563" : state.isFocused ? "#f3f4f6" : "white",
      color: state.isSelected ? "white" : "#111827",
    }),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black uppercase text-gray-800">Promotions</h2>
          <p className="text-base text-gray-500 mt-0.5">Gérez les offres groupées et les remises</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-gray-800 text-white px-4 py-4 text-sm font-semibold hover:bg-gray-700 "
        >
          <Plus className="w-5 h-5" />
          Nouvelle Promotion
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 uppercase">
              {editingPromo ? "Modifier la promotion" : "Nouvelle promotion"}
            </h3>
            <button onClick={resetForm} className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 "><X className="w-5 h-5 inline" /> Fermer</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nom *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Offre Ramadan"
                className="w-full border border-gray-300 px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Type de promotion</label>
              <div className="flex gap-3">
                {[
                  { val: "bundle", label: "Offre groupée (Produit offert)", icon: <Gift /> },
                  { val: "percentage", label: "Remise % (via produit)", icon: <Tag /> },
                ].map(({ val, label, icon }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormType(val as any)}
                    className={`flex items-center gap-2 px-4 py-4 border text-sm font-medium  ${
                      formType === val
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Product selector - only for percentage */}
            {formType === "percentage" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Produit principal *</label>
                <Select
                  options={productOptions}
                  value={formProductId}
                  onChange={(opt) => setFormProductId(opt)}
                  placeholder="Rechercher un produit..."
                  styles={selectStyles}
                  isClearable
                />
              </div>
            )}

            {/* Principal Products - for bundle */}
            {formType === "bundle" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Produits principaux (À acheter) *</label>
                <div className="space-y-2">
                  {principalItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Select
                          options={productOptions}
                          value={item.product_id}
                          onChange={(opt) => {
                            const updated = [...principalItems];
                            updated[idx].product_id = opt;
                            setPrincipalItems(updated);
                          }}
                          placeholder="Produit principal..."
                          styles={selectStyles}
                          isClearable
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 font-bold">x</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...principalItems];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setPrincipalItems(updated);
                          }}
                          className="w-20 border border-gray-300 px-2 py-4 text-sm text-center focus:outline-none"
                          title="Quantité à acheter"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrincipalItems(principalItems.filter((_, i) => i !== idx))}
                        className="p-4 text-red-500 hover:text-red-700"
                        disabled={principalItems.length === 1}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPrincipalItems([...principalItems, { product_id: null, quantity: 1 }])}
                    className="flex items-center gap-1 text-sm text-gray-800 font-bold mt-1 bg-gray-100 px-3 py-2"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un produit principal
                  </button>
                </div>
              </div>
            )}

            {/* Percentage Remise */}
            {formType === "percentage" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Pourcentage de Remise (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formRemisePercentage}
                    onChange={(e) => setFormRemisePercentage(e.target.value)}
                    placeholder="Ex: 15"
                    className="w-full border border-gray-300 px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bundle items */}
            {formType === "bundle" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Produits offerts *</label>
                <div className="space-y-2">
                  {bundleItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Select
                          options={productOptions}
                          value={item.free_product_id}
                          onChange={(opt) => {
                            const updated = [...bundleItems];
                            updated[idx].free_product_id = opt;
                            setBundleItems(updated);
                          }}
                          placeholder="Produit offert..."
                          styles={selectStyles}
                          isClearable
                        />
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...bundleItems];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setBundleItems(updated);
                        }}
                        className="w-20 border border-gray-300 px-2 py-4 text-sm text-center focus:outline-none"
                        title="Quantité offerte"
                      />
                      <button
                        type="button"
                        onClick={() => setBundleItems(bundleItems.filter((_, i) => i !== idx))}
                        className="p-4 text-red-500 hover:text-red-700"
                        disabled={bundleItems.length === 1}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBundleItems([...bundleItems, { free_product_id: null, quantity: 1 }])}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 mt-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un produit offert
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex items-center gap-2 bg-gray-800 text-white px-6 py-4 text-sm font-semibold hover:bg-gray-700">
                <Check className="w-4 h-4" /> {editingPromo ? "Mettre à jour" : "Créer"}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-4 text-sm border border-gray-300 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promotions list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Chargement...</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200">
          <Gift className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-base">Aucune promotion créée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className={`bg-white border p-4 flex items-start gap-4  ${!promo.is_active ? "opacity-60" : ""}`}
            >
              {/* Icon */}
              <div className={`p-2 mt-0.5 ${promo.type === "bundle" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                {promo.type === "bundle" ? <Gift className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-800">{promo.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${promo.type === "bundle" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    {promo.type === "bundle" ? "Offre groupée" : "Remise %"}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${promo.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {promo.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {promo.type === "percentage" && (
                  <p className="text-base text-gray-600 mt-0.5">
                    Produit: <span className="font-medium">{promo.MainProduct?.name || `#${promo.product_id}`}</span>
                  </p>
                )}
                {promo.type === "bundle" && promo.PrincipalItems && promo.PrincipalItems.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase mr-1">À acheter:</span>
                    {promo.PrincipalItems.map((pi, i) => (
                      <span key={i} className="bg-gray-800 text-white text-[11px] px-2 py-0.5 font-bold">
                        {pi.Product?.name || `#${pi.product_id}`} ×{pi.quantity}
                      </span>
                    ))}
                  </div>
                )}
                {promo.type === "percentage" && promo.MainProduct && (
                  <div className="mt-1">
                    <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 border border-red-100">
                      - {promo.MainProduct.remise_percentage}% de réduction
                    </span>
                  </div>
                )}
                {promo.type === "bundle" && promo.BundleItems && promo.BundleItems.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 items-center">
                    <span className="text-xs text-gray-400 font-bold uppercase mr-1">Offerts:</span>
                    {promo.BundleItems.map((bi, i) => (
                      <span key={i} className="bg-yellow-500 text-white text-[11px] px-2 py-0.5 font-bold">
                        <Gift className="w-3 h-3 inline mr-1" /> {bi.FreeProduct?.name || `#${bi.product_id || bi.free_product_id}`} ×{bi.quantity}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 shrink-0">
                <button onClick={() => handleToggle(promo)} className="p-4 border text-gray-500 hover:text-gray-800 " title={promo.is_active ? "Désactiver" : "Activer"}>
                  {promo.is_active ? <ToggleRight className="w-7 h-7 text-green-600" /> : <ToggleLeft className="w-7 h-7" />}
                </button>
                <button onClick={() => openEdit(promo)} className="p-4 border text-gray-500 hover:text-blue-600 " title="Modifier">
                  <Pencil className="w-7 h-7" />
                </button>
                <button onClick={() => handleDelete(promo.id)} className="p-4 border text-gray-500 hover:text-red-600 " title="Supprimer">
                  <Trash2 className="w-7 h-7" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


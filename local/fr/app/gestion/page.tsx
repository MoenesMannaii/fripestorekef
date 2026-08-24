"use client";
import { Package, FileText, Truck, Users, Tag, History } from 'lucide-react';

import React, { useState } from "react";
import Produit from "./Produit"
import Facture from "./Facture"
import Suppliers from "./Suppliers"
import Clients from "./Clients"
import Promotions from "./Promotions"


const LocalPage: React.FC = () => {
  const [active, setActive] = useState<"produit" | "facture" | "fournisseurs" | "clients" | "promotions" | "logs">("produit");

  const tabs = [
    { id: "produit", label: "Produits", icon: <Package /> },
    { id: "facture", label: "Factures", icon: <FileText /> },
    { id: "fournisseurs", label: "Fournisseurs", icon: <Truck /> },
    { id: "clients", label: "Clients", icon: <Users /> },
    { id: "promotions", label: "Promotions", icon: <Tag /> },
    { id: "logs", label: "Logs", icon: <History /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <header className="sticky top-15 bg-white border-b border-gray-200 z-30 px-6 pt-4">
        <div className="flex items-center gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id as any)}
              className={`pb-4 px-2 flex items-center gap-2 text-sm font-medium border-b-2 ${
                active === tab.id 
                ? "border-gray-600 text-gray-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto mt-4">
        <div>
          {active === "produit" && <Produit />}
          {active === "facture" && <Facture />}
          {active === "fournisseurs" && <Suppliers />}
          {active === "clients" && <Clients />}
          {active === "promotions" && <Promotions />}
          {active === "logs" && (
           <div className="mx-auto flex flex-col items-center justify-center p-6 mt-20">
  <p className="text-lg text-gray-500 mb-4 text-center">
    Le journal d'audit complet est disponible sur une page dédiée.
  </p>
  <a 
    href="/gestion/logs" 
    className="inline-flex items-center gap-2 px-6 py-6 bg-gray-900 text-white font-bold text-sm uppercase tracking-widest hover:bg-black transition-all"
  >
    <History className="w-5 h-5" />
    Ouvrir le journal d'audit
  </a>
</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LocalPage;

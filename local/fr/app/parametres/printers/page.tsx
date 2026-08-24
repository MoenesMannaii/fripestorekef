"use client";
import { Printer, Plus, Trash2, Pencil, Play, Wifi, CheckCircle, XCircle, Search } from 'lucide-react';

import { useState, useEffect } from "react";

import { useRouter } from 'next/navigation';

interface Printer {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  printer_type: 'cashier' | 'kitchen' | 'bar' | 'other';
  is_active: boolean;
  is_default: boolean;
  status?: 'online' | 'offline' | 'checking';
  status_details?: any;
}

export default function PrinterSettingsPage() {
  const router = useRouter();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ip_address: '',
    port: 9100,
    printer_type: 'cashier' as 'cashier' | 'kitchen' | 'bar' | 'other',
    is_active: true,
    is_default: false
  });

  useEffect(() => {
    fetchPrinters();
  }, []);

  const fetchPrinters = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/printers');
      const data = await res.json();
      if (data.success) {
        setPrinters(data.printers || []);
      }
    } catch (error) {
      console.error('Failed to fetch printers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingPrinter 
      ? `http://localhost:4000/api/printers/${editingPrinter.id}`
      : 'http://localhost:4000/api/printers';
    const method = editingPrinter ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (data.success) {
        setShowForm(false);
        setEditingPrinter(null);
        setForm({ 
          name: '', 
          ip_address: '', 
          port: 9100, 
          printer_type: 'cashier', 
          is_active: true, 
          is_default: false 
        });
        fetchPrinters();
        alert(editingPrinter ? 'Imprimante mise à jour !' : 'Imprimante ajoutée !');
      } else {
        alert(data.message || 'Échec de l’opération');
      }
    } catch (error) {
      alert('Erreur réseau');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette imprimante ?')) return;
    
    try {
      const res = await fetch(`http://localhost:4000/api/printers/${id}`, { 
        method: 'DELETE' 
      });
      const data = await res.json();
      
      if (data.success) {
        fetchPrinters();
        alert('Imprimante supprimée !');
      } else {
        alert(data.message || 'Échec de la suppression');
      }
    } catch (error) {
      alert('Erreur réseau');
    }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/printers/test/${id}`);
      const data = await res.json();
      
      if (data.success) {
        alert(`Test imprimante : ${data.overall_status === 'online' ? 'SUCCÈS' : 'ÉCHEC'}`);
        fetchPrinters();
      } else {
        alert(data.message || 'Test échoué');
      }
    } catch (error) {
      alert('Erreur réseau');
    }
  };

  const handleScanNetwork = async () => {
    setIsScanning(true);
    setFoundDevices([]);
    
    try {
      const res = await fetch('http://localhost:4000/api/printers/scan');
      const data = await res.json();
      
      if (data.success) {
        setFoundDevices(data.found_devices || []);
        alert(`Imprimantes détectées : ${data.count}`);
      } else {
        alert(data.message || 'Échec du scan');
      }
    } catch (error) {
      alert('Erreur réseau');
    } finally {
      setIsScanning(false);
    }
  };

  const handleEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setForm({
      name: printer.name,
      ip_address: printer.ip_address,
      port: printer.port,
      printer_type: printer.printer_type,
      is_active: printer.is_active,
      is_default: printer.is_default
    });
    setShowForm(true);
  };

  const handleAddFromScan = (device: any) => {
    setForm({
      name: `Imprimante ${device.ip}`,
      ip_address: device.ip,
      port: device.port,
      printer_type: 'other',
      is_active: true,
      is_default: false
    });
    setShowForm(true);
  };

  const getPrinterTypeLabel = (type: string) => {
    switch(type) {
      case 'cashier': return 'Caisse';
      case 'kitchen': return 'Cuisine';
      case 'bar': return 'Bar';
      default: return 'Autre';
    }
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  const getPrinterTypeColor = (type: string) => {
    switch(type) {
      case 'cashier': return 'bg-blue-100 text-blue-800';
      case 'kitchen': return 'bg-red-100 text-red-800';
      case 'bar': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-full max-w-full mx-auto p-6 bg-gray-50">
      <div className="bg-white">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuration des Imprimantes</h1>

        {/* Scan Network Section */}
        <div className="border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Détection Réseau
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Scanner le réseau pour détecter les imprimantes disponibles
              </p>
            </div>
            <button
              onClick={handleScanNetwork}
              disabled={isScanning}
              className="px-6 py-4 bg-gray-700 text-white hover:bg-gray-800  disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                {isScanning ? 'Scan en cours...' : 'Scanner le réseau'}
              </div>
            </button>
          </div>

          {foundDevices.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">Appareils détectés ({foundDevices.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {foundDevices.map((device, index) => (
                  <div key={index} className="border border-gray-200 p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">IP : {device.ip}</p>
                        <p className="text-gray-600">Port : {device.port}</p>
                        {device.hostname && (
                          <p className="text-gray-600">Nom : {device.hostname}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Temps de réponse : {device.responseTime} ms
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddFromScan(device)}
                        className="text-gray-700 hover:bg-gray-100 p-2"
                        title="Ajouter cette imprimante"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Printer Button */}
        <button
          className="mb-6 px-6 py-4 bg-gray-700 text-white hover:bg-gray-800  flex items-center gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-5 h-5" />
          Ajouter une imprimante
        </button>

        {/* Printer List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Chargement des imprimantes...</p>
          </div>
        ) : printers.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded">
            <Printer className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">Aucune imprimante configurée</p>
            <p className="text-sm text-gray-500 mt-2">
              Ajoutez votre première imprimante pour commencer
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {printers.map((printer) => (
              <div key={printer.id} className="border border-gray-200 p-5 bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{printer.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-sm font-medium ${getStatusColor(printer.status)}`}>
                        {printer.status === 'online' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {printer.status === 'online' ? 'En ligne' : 'Hors ligne'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium ${getPrinterTypeColor(printer.printer_type)}`}>
                        {getPrinterTypeLabel(printer.printer_type)}
                      </span>
                      {printer.is_default && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800">
                          Défaut
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(printer)}
                      className="p-3 text-gray-700 hover:bg-gray-100"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTest(printer.id)}
                      className="p-3 text-gray-700 hover:bg-gray-100"
                      title="Tester"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(printer.id)}
                      className="p-3 text-gray-700 hover:bg-gray-100"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">IP :</span> {printer.ip_address}:{printer.port}
                  </p>
                  <p>
                    <span className="font-medium">Statut :</span>
                    <span className={`ml-2 font-medium ${printer.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {printer.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </p>
                  {printer.printer_type === 'cashier' && (
                    <p className="text-xs text-gray-600">Imprime les factures clients</p>
                  )}
                  {printer.printer_type === 'kitchen' && (
                    <p className="text-xs text-gray-600">Imprime les bons de cuisine</p>
                  )}
                  {printer.printer_type === 'bar' && (
                    <p className="text-xs text-gray-600">Imprime les bons de bar</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-300">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPrinter ? 'Modifier' : 'Ajouter'} une imprimante
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 text-sm"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Caisse Principale"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse IP *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 text-sm"
                    value={form.ip_address}
                    onChange={e => setForm({ ...form, ip_address: e.target.value })}
                    placeholder="Ex: 192.168.1.100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 text-sm"
                    value={form.port}
                    onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 9100 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Port par défaut : 9100</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'imprimante *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 text-sm"
                    value={form.printer_type}
                    onChange={e => setForm({ ...form, printer_type: e.target.value as any })}
                  >
                    <option value="cashier">Caisse (Factures clients)</option>
                    <option value="kitchen">Cuisine (Bons de commande)</option>
                    <option value="bar">Bar (Bons de commande)</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2 h-4 w-4 text-gray-700"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700">Imprimante active</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2 h-4 w-4 text-gray-700"
                      checked={form.is_default}
                      onChange={e => setForm({ ...form, is_default: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700">Défaut pour ce type</span>
                  </label>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    className="px-6 py-4 border border-gray-300 text-gray-700 hover:bg-gray-50  flex-1"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPrinter(null);
                      setForm({ 
                        name: '', 
                        ip_address: '', 
                        port: 9100, 
                        printer_type: 'cashier', 
                        is_active: true, 
                        is_default: false 
                      });
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-4 bg-gray-700 text-white hover:bg-gray-800  flex-1"
                  >
                    {editingPrinter ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { useAlert } from '../../../components/AlertContext';
import { useAuth } from '../../../lib/contexts/AuthContext';
import { 
  History, 
  Search, 
  Trash2, 
  ChevronLeft, 
  User, 
  Clock, 
  Calendar,
  AlertCircle,
  Printer
} from 'lucide-react';
import Link from 'next/link';
import Select from 'react-select';

interface AuditLog {
  id: number;
  actor_id: number;
  actor_role: 'admin' | 'worker';
  action: string;
  details: string;
  created_at: string;
}

const actionOptions = [
  { value: 'all', label: 'Toutes les actions' },
  { value: 'product_deletion', label: 'Suppression de Produit' },
  { value: 'save_template', label: 'Modif. Paramètres' },
  { value: 'login', label: 'Connexion' },
  { value: 'refund', label: 'Remboursements / Retours' },
];

const translateAction = (action: string) => {
  const mapping: Record<string, string> = {
    'product_deletion': 'Suppression Produit',
    'save_template': 'Réglages Système',
    'login': 'Connexion',
    'logout': 'Déconnexion',
    'order_creation': 'Vente Réalisée',
    'refund': 'Remboursement'
  };
  return mapping[action] || action.replace(/_/g, ' ');
};

const translateRole = (role: string) => {
  const mapping: Record<string, string> = {
    'admin': 'Administrateur',
    'worker': 'Caissier'
  };
  return mapping[role] || role;
};

export default function LogsPage() {
  const { showAlert } = useAlert();
  const { userRole } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [printLoading, setPrintLoading] = useState(false);
  const itemsPerPage = 50;

  const printLogs = async () => {
    // Build list: all logs that are refund OR product_deletion
    const printableLogs = logs.filter(l => l.action === 'refund' || l.action === 'product_deletion');
    if (printableLogs.length === 0) {
      showAlert('Aucun log de remboursement ou suppression à imprimer', 'error');
      return;
    }
    try {
      setPrintLoading(true);
      const token = localStorage.getItem('authToken');
      const title = startDate && endDate
        ? `REMBOURSEMENTS & SUPPRESSIONS — ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`
        : 'REMBOURSEMENTS & SUPPRESSIONS PRODUITS';
      const response = await fetch('http://localhost:4000/api/print-audit-logs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: printableLogs, title }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erreur impression');
      showAlert(`Rapport imprimé (${printableLogs.length} entrée(s))`, 'success');
    } catch (err: any) {
      showAlert(`Erreur: ${err.message}`, 'error');
    } finally {
      setPrintLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      let url = 'http://localhost:4000/api/audit?limit=1000';
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      showAlert('Erreur lors du chargement des logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAction]);

  const clearLogs = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir effacer tous les logs ? Cette action est irréversible.')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/audit', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to clear logs');
      setLogs([]);
      showAlert('Logs effacés avec succès', 'success');
    } catch (error) {
      console.error('Error clearing logs:', error);
      showAlert('Erreur lors de l\'effacement des logs', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      borderRadius: '0',
      border: '1px solid #d1d5db',
      padding: '4px',
      fontSize: '0.875rem',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#111827'
      }
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#111827' : state.isFocused ? '#f3f4f6' : 'white',
      color: state.isSelected ? 'white' : '#111827',
      padding: '16px 12px',
      fontSize: '0.875rem'
    })
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/gestion" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2 text-gray-900 font-bold text-xl uppercase tracking-tight">
                <History className="w-6 h-6" />
                Tableau des Logs
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={printLogs}
                disabled={printLoading}
                className="flex items-center gap-2 px-4 py-4 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs uppercase tracking-widest transition-all border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {printLoading ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Imprimer Logs
              </button>
              <button
                onClick={clearLogs}
                className="flex items-center gap-2 px-4 py-4 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs uppercase tracking-widest transition-all border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                Effacer Tout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Filters */}
        <div className="bg-white border border-gray-900 mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <input
                type="text"
                placeholder="Rechercher dans les logs (produit, caissier...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:border-gray-900 focus:ring-0 text-sm outline-none transition-all"
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 text-sm outline-none focus:border-gray-900"
                  title="Date de début"
                />
                <span className="text-gray-400 font-bold">à</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 text-sm outline-none focus:border-gray-900"
                  title="Date de fin"
                />
              </div>
              <div className="w-full md:w-64">
                <Select
                  options={actionOptions}
                  defaultValue={actionOptions[0]}
                  onChange={(option: any) => setFilterAction(option.value)}
                  styles={customSelectStyles}
                  placeholder="Action..."
                  isSearchable={false}
                />
              </div>
              <button 
                onClick={fetchLogs}
                className="w-full md:w-auto px-8 py-4 bg-gray-700 text-white font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-gray-900 overflow-hidden">
          {loading ? (
            <div className="p-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Chargement des données...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-700 text-white text-left">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">Temps</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">Acteur</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">Action</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-base font-bold text-gray-900">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            {formatDate(log.created_at)}
                          </span>
                          <span className="flex items-center gap-1.5 text-base text-gray-500 font-medium">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {formatTime(log.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            log.actor_role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'
                          }`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                           {/*  <div className="text-sm font-black text-gray-900 uppercase">{log.actor_id}</div> */}
                            <div className={`text-sm font-bold uppercase px-2 py-0.5 rounded border inline-block ${
                              log.actor_role === 'admin' ? 'border-purple-200 text-purple-600 bg-purple-50' : 'border-green-200 text-green-600 bg-green-50'
                            }`}>
                              {translateRole(log.actor_role)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold capitalize tracking-wide border ${
                          log.action === 'product_deletion' 
                            ? 'bg-red-50 border-red-600 text-red-600' 
                            : 'bg-blue-50 border-blue-600 text-blue-600'
                        }`}>
                          {log.action === 'product_deletion' && <AlertCircle className="w-3.5 h-3.5" />}
                          {translateAction(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 max-w-5xl">
                          <p className="text-base text-gray-700 font-medium leading-relaxed">
                            {log.details}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center">
              <History className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-900 font-black uppercase tracking-widest text-lg">Aucun log trouvé</p>
              <p className="text-gray-500 text-sm mt-2 font-medium">Modifiez vos filtres ou effectuez une nouvelle action.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="sticky bottom-0 bg-white border-t border-gray-900 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] flex justify-between items-center z-20">
            <div className="text-xs font-black uppercase tracking-widest text-gray-500">
              Page {currentPage} sur {totalPages} ({filteredLogs.length} logs)
            </div>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={`px-4 py-4 text-xs font-black uppercase tracking-widest border border-gray-900 transition-all ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-white text-gray-900 hover:bg-gray-900 hover:text-white'
                }`}
              >
                Précédent
              </button>
              
              <div className="flex gap-2">
                {(() => {
                  const pages = [];
                  const maxVisible = 3; // Around current page
                  
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    
                    if (currentPage > 4) {
                      pages.push('...');
                    }
                    
                    const start = Math.max(2, currentPage - 2);
                    const end = Math.min(totalPages - 1, currentPage + 2);
                    
                    for (let i = start; i <= end; i++) {
                      if (!pages.includes(i)) pages.push(i);
                    }
                    
                    if (currentPage < totalPages - 3) {
                      pages.push('...');
                    }
                    
                    if (!pages.includes(totalPages)) pages.push(totalPages);
                  }
                  
                  return pages.map((page, i) => (
                    typeof page === 'number' ? (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(page)}
                        className={`w-14 h-14 text-sm font-black border transition-all ${
                          currentPage === page 
                            ? 'bg-gray-900 text-white border-gray-900' 
                            : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ) : (
                      <div key={i} className="w-14 h-14 flex items-center justify-center text-gray-400 font-black">
                        {page}
                      </div>
                    )
                  ));
                })()}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest border border-gray-900 transition-all ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-white text-gray-900 hover:bg-gray-900 hover:text-white'
                }`}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

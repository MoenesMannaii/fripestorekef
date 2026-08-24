"use client";
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { 
  ArrowBigDownDash, CalendarDays, ChartNoAxesCombined, ClipboardCheck, Coins, Flame, Gem, TrendingUp, TriangleAlert,
  RefreshCw, ShoppingBag, Activity, Clock, Shield
} from 'lucide-react';

const StatCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode, label: string, value: string, sub?: string, color: string }) => (
  <div className="bg-white border border-gray-200 p-5 flex items-start gap-4">
    <div className={`p-3 ${color} shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 uppercase font-medium tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  </div>
);

export default function IADashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const [forecastData, setForecastData] = useState<any>(null);
  const [inventoryAlerts, setInventoryAlerts] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any>(null);

  const fetchAIData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [resForecast, resInventory, resAnomalies, resTop, resDailyStats] = await Promise.all([
        axios.get('http://localhost:4000/api/ai/forecast', { headers }),
        axios.get('http://localhost:4000/api/ai/inventory', { headers }),
        axios.get('http://localhost:4000/api/ai/anomalies', { headers }),
        axios.get('http://localhost:4000/api/ai/top-products', { headers }),
        axios.get('http://localhost:4000/api/ai/daily-stats', { headers }),
      ]);

      setForecastData(resForecast.data.data);
      setInventoryAlerts(resInventory.data.data);
      setAnomalies(resAnomalies.data.data);
      setTopProducts(resTop.data.data || []);
      setDailyStats(resDailyStats.data.data);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Failed to fetch AI data:', err);
      setError('Erreur lors du chargement des analyses. Vérifiez la connexion au serveur.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAIData();
  }, [fetchAIData]);

  const combinedChartData = [
    ...(forecastData?.history || []).map((d: any) => ({ ...d, type: 'Historique', predicted_revenue: null })),
    ...(forecastData?.forecast || []).map((d: any) => ({ ...d, type: 'Prévision', revenue: null }))
  ];

  const barColors = ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className=" rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
        <p className="text-gray-500 text-sm">Chargement des analyses en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 mt-10 text-center max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 p-6">
          <TriangleAlert className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={fetchAIData}
            className="mt-4 px-5 py-2 bg-gray-800 text-white text-sm hover:bg-gray-700 "
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto space-y-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insights & Analyses</h1>
          <p className="text-gray-500 text-base mt-1">
            Mis à jour le {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={fetchAIData}
          className="flex items-center gap-2 px-4 py-3 bg-gray-800 text-white text-sm hover:bg-gray-700 border border-gray-700 "
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Today's KPIs */}
      <div>
        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-3"><ChartNoAxesCombined className="inline w-5 h-5 mr-1" /> Aujourd'hui</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Coins className="w-5 h-5 text-gray-600" />}
            label="Chiffre d'affaires"
            value={`${dailyStats?.today?.revenue || '0.000'} DT`}
            sub="Ventes du jour"
            color="bg-gray-100"
          />
          <StatCard
            icon={<ShoppingBag className="w-5 h-5 text-gray-600" />}
            label="Commandes"
            value={String(dailyStats?.today?.orders || 0)}
            sub="Transactions validées"
            color="bg-gray-100"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-gray-600" />}
            label="Panier moyen"
            value={`${dailyStats?.today?.avg_basket || '0.000'} DT`}
            sub="Par transaction"
            color="bg-gray-100"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-gray-600" />}
            label="Meilleure heure"
            value={dailyStats?.best_hour || '—'}
            sub="Pic d'activité du jour"
            color="bg-gray-100"
          />
        </div>
      </div>

      {/* Period Summary */}
     {/*  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-3"><CalendarDays className="inline w-5 h-5 mr-1" /> Cette semaine</p>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-gray-900">{dailyStats?.week?.revenue || '0.000'} <span className="text-sm font-normal text-gray-500">DT</span></p>
              <p className="text-xs text-gray-500 mt-1">Chiffre d'affaires</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dailyStats?.week?.orders || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Commandes</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-3"><CalendarDays className="inline w-5 h-5 mr-1" /> Ce mois</p>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-gray-900">{dailyStats?.month?.revenue || '0.000'} <span className="text-sm font-normal text-gray-500">DT</span></p>
              <p className="text-xs text-gray-500 mt-1">Chiffre d'affaires</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dailyStats?.month?.orders || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Commandes</p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Top Products */}
      <div className="bg-white border border-gray-200 p-5">
        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-4"><Flame className="inline w-5 h-5 mr-1" /> Top 10 — Produits les plus vendus (30 derniers jours)</h2>
        {topProducts.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">Aucune vente enregistrée sur les 30 derniers jours.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#374151' }} width={120} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px' }}
                  formatter={(value: any, name: string) => [
                    name === 'total_sold' ? `${value} unités` : `${Number(value).toFixed(3)} DT`,
                    name === 'total_sold' ? 'Qté vendue' : 'CA'
                  ]}
                />
                <Bar dataKey="total_sold" radius={[0, 2, 2, 0]}>
                  {topProducts.map((_, idx) => (
                    <Cell key={idx} fill={barColors[idx % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sales Forecast */}
      <div className="bg-white border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider"><TrendingUp className="inline w-5 h-5 mr-1" /> Prévisions des ventes — 7 prochains jours</h2>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">Prédictif</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(val) => `${val} DT`}
                dx={-5}
              />
              <Tooltip
                contentStyle={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px' }}
                formatter={(value: any, name: string) => [`${Number(value).toFixed(3)} DT`, name === 'revenue' ? 'Revenu réel' : 'Prévision']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long' })}
              />
              <Line type="monotone" name="Revenu réel" dataKey="revenue" stroke="#1f2937" strokeWidth={2.5} dot={{ r: 3, fill: '#1f2937', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" name="Prévision" dataKey="predicted_revenue" stroke="#9ca3af" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3, fill: '#9ca3af', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-6 mt-3 justify-center">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-6 h-0.5 bg-gray-800"></div>
            <span>Revenu réel</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-6 border-t-2 border-dashed border-gray-400"></div>
            <span>Prévision (basée sur les 7 derniers jours)</span>
          </div>
        </div>
      </div>

      {/* Stock Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Reorder Alerts */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-4"><TriangleAlert className="inline w-5 h-5 mr-1 text-red-700 " /> Rupture de stock imminente</h2>
          {(!inventoryAlerts?.reorder || inventoryAlerts.reorder.length === 0) ? (
            <div className="py-6 text-center border border-dashed border-gray-200">
              <p className="text-sm text-gray-500"><ClipboardCheck className="inline w-5 h-5 mr-1 text-green-700" /> Aucun risque de rupture à court terme.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Produit</th>
                    <th className="pb-2 text-center text-xs font-semibold text-gray-500 uppercase">Stock</th>
                    <th className="pb-2 text-center text-xs font-semibold text-gray-500 uppercase">Jours restants</th>
                    <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase">À commander</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventoryAlerts.reorder.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 ">
                      <td className="py-2.5 font-medium text-gray-900 text-sm">{item.name}</td>
                      <td className="py-2.5 text-center text-gray-600 text-sm">{item.stock}</td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 text-xs font-bold ${item.daysUntilEmpty <= 3 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item.daysUntilEmpty}j
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-gray-800">+{item.suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dead Stock */}
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-4"><ArrowBigDownDash className="inline w-5 h-5 mr-1 text-red-700 " /> Stock dormant (non vendu &gt; 30j)</h2>
          {(!inventoryAlerts?.deadStock || inventoryAlerts.deadStock.length === 0) ? (
            <div className="py-6 text-center border border-dashed border-gray-200">
              <p className="text-sm text-gray-500"><ClipboardCheck className="inline w-5 h-5 mr-1 text-green-700" /> Aucun stock dormant détecté.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inventoryAlerts.deadStock.map((item: any) => (
                <span key={item.id} className="px-3 py-1.5 border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium">
                  {item.name} <span className="text-gray-400">({item.stock} unités)</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Anomaly Detection */}
      <div className="bg-white border border-gray-200 p-5">
        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-4">
          <Shield className="inline w-5 h-5 mr-1 text-gray-500" />
          Détection d'anomalies
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Value */}
          <div>
            <h3 className="text-xs font-bold uppercase text-gray-400 border-b pb-2 mb-3">Montants inhabituellement élevés</h3>
            {(!anomalies?.highValue || anomalies.highValue.length === 0) ? (
              <p className="text-sm text-gray-400 italic">Aucune commande hors-norme détectée.</p>
            ) : (
              <ul className="space-y-2">
                {anomalies.highValue.map((a: any) => (
                  <li key={a.id} className="flex justify-between items-center text-sm p-3 border border-red-100 bg-red-50">
                    <div>
                      <p className="font-bold text-red-700">{Number(a.total).toFixed(3)} DT</p>
                      <p className="text-xs text-gray-500 mt-0.5">Vendeur: {a.cashier_name || 'Inconnu'}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-gray-400">#{a.id}</span>
                      <span className="block text-xs text-gray-400">
                        {new Date(a.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rapid Orders */}
          <div>
            <h3 className="text-xs font-bold uppercase text-gray-400 border-b pb-2 mb-3">Validations express suspectes</h3>
            {(!anomalies?.rapidOrders || anomalies.rapidOrders.length === 0) ? (
              <p className="text-sm text-gray-400 italic">Aucune activité suspecte détectée.</p>
            ) : (
              <ul className="space-y-2">
                {anomalies.rapidOrders.map((a: any, idx: number) => (
                  <li key={idx} className="text-sm p-3 border border-orange-100 bg-orange-50">
                    <p className="font-bold text-orange-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500  inline-block"></span>
                      {a.time_diff_seconds}s d'intervalle
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {a.cashier_name || 'Inconnu'} — commandes{' '}
                      <span className="font-bold text-gray-800">#{a.order_id_1}</span> et{' '}
                      <span className="font-bold text-gray-800">#{a.order_id_2}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}


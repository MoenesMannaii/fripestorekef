"use client";

import React, { useState } from 'react';
import { LogOut, X, CreditCard, Banknote, AlertCircle } from 'lucide-react';

interface ClockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClockOut: (endingCash: number, notes: string) => void;
  activeShift: any;
}

export default function ClockOutModal({ isOpen, onClose, onClockOut, activeShift }: ClockOutModalProps) {
  const [endingCash, setEndingCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClockOut(parseFloat(endingCash) || 0, notes);
  };

  const startTime = activeShift ? new Date(activeShift.start_time).toLocaleTimeString() : '';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-100 p-4">
      <div className="bg-white w-full max-w-lg overflow-hidden     shadow-2xl">
        <div className="bg-red-700 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Clôturer la Session</h2>
              <p className="text-red-100 text-xs">Shift commencé à {startTime}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-white/30 hover:bg-white/50 p-2.5 "
          >
            <X className="w-6 h-6 inline" /> Fermer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Total Espèces Final
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">DT</span>
              <input
                type="number"
                step="0.001"
                required
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 py-4 pl-12 pr-4 text-2xl font-bold text-gray-900 focus:outline-none focus:border-red-600  placeholder:text-gray-300"
                placeholder="Calculer le tiroir..."
                autoFocus
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
              Notes / Remarques
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 p-4 text-gray-900 focus:outline-none focus:border-red-600  resize-none h-24"
              placeholder="Écarts de caisse, problèmes matériels..."
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 mb-8 flex gap-3 text-amber-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>Assurez-vous que toutes les transactions sont terminées avant de fermer.</p>
          </div>

          <button
            type="submit"
            className="w-full bg-red-700 hover:bg-red-700 text-white py-5 font-bold text-lg flex items-center justify-center gap-3  hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-100"
          >
            Fermer le Shift & Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}


"use client";

import React, { useState } from 'react';
import { Clock, LogIn, X } from 'lucide-react';

interface ClockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClockIn: (startingCash: number) => void;
}

export default function ClockInModal({ isOpen, onClose, onClockIn }: ClockInModalProps) {
  const [startingCash, setStartingCash] = useState<string>('0.00');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClockIn(parseFloat(startingCash) || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-100 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden     shadow-2xl">
        <div className="bg-gray-900 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Commencer la Session</h2>
              <p className="text-gray-400 text-xs">Ouvrir une nouvelle session de travail</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white "
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Fonds de Caisse (Initial)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">DT</span>
              <input
                type="number"
                step="0.001"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-4 pl-12 pr-4 text-2xl font-bold text-gray-900 focus:outline-none focus:border-gray-900  placeholder:text-gray-300"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <p className="mt-3 text-xs text-gray-500 italic">
              Entrez le montant en espèces présent dans le tiroir-caisse au début de votre service.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3  hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gray-200"
          >
            <LogIn className="w-5 h-5" />
            Démarrer le Shift
          </button>
        </form>
      </div>
    </div>
  );
}


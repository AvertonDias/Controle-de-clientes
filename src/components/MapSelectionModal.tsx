import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Check, Navigation, AlertCircle } from 'lucide-react';
import MapComponent from './MapComponent';

interface MapSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords: { lat: number; lng: number } | null;
  onConfirm: (selected: { lat: number; lng: number; address?: string }) => void;
  title?: string;
  isDark?: boolean;
}

export default function MapSelectionModal({
  isOpen,
  onClose,
  initialCoords,
  onConfirm,
  title = "Selecionar Localização",
  isDark = false
}: MapSelectionModalProps) {
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number; address?: string } | null>(
    initialCoords ? { lat: initialCoords.lat, lng: initialCoords.lng } : null
  );

  const handleSelectCoords = (selected: { lat: number; lng: number; address?: string }) => {
    setTempCoords(selected);
  };

  const handleConfirm = () => {
    if (tempCoords) {
      onConfirm(tempCoords);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`w-full max-w-4xl h-[85vh] md:h-[75vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden z-10 border relative ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-100' 
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-150 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg">{title}</h3>
                  <p className={`text-[11px] md:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Arraste o mapa e toque no local exato para definir o marcador
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'
                }`}
              >
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Map Area */}
            <div className="flex-grow relative bg-slate-100">
              <MapComponent
                clients={[]}
                isSelectingCoords={true}
                selectedCoords={tempCoords}
                onSelectCoordinates={handleSelectCoords}
                heightClass="h-full"
              />
            </div>

            {/* Selected Address Display & Actions */}
            <div className={`p-4 md:p-6 border-t flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-150 bg-slate-50'
            }`}>
              <div className="flex-grow min-w-0">
                {tempCoords ? (
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Navigation className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Local Selecionado
                      </p>
                      <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`} title={tempCoords.address}>
                        {tempCoords.address || "Coordenadas marcadas"}
                      </p>
                      <p className={`font-mono text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Lat: {tempCoords.lat.toFixed(6)}, Lng: {tempCoords.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Toque em qualquer ponto do mapa para marcar o local</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                    isDark
                      ? 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!tempCoords}
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center gap-1.5 ${
                    tempCoords
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Localização</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

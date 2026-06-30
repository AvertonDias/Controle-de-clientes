import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Phone, Mail, MapPin, Check, Search, Locate, Navigation, AlertCircle 
} from 'lucide-react';
import { Client } from '../types';
import MapSelectionModal from './MapSelectionModal';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (clientData: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
}

export default function ClientFormModal({
  isOpen,
  onClose,
  client,
  onSave
}: ClientFormModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [geocoding, setGeocoding] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setName(client.name);
        setPhone(client.phone || '');
        setEmail(client.email || '');
        setAddress(client.address);
        setCoords(client.coordinates);
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setCoords(null);
      }
      setErrorMessage('');
      setShowMapSelector(false);
      setIsSaving(false);
    }
  }, [isOpen, client]);

  // Auto-mask Brazilian phone number (XX) XXXXX-XXXX
  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 0) {
      formatted = `(${cleaned.substring(0, 2)}`;
    }
    if (cleaned.length > 2) {
      formatted += `) ${cleaned.substring(2, 7)}`;
    }
    if (cleaned.length > 7) {
      formatted += `-${cleaned.substring(7, 11)}`;
    }
    setPhone(formatted);
  };

  // Geocode address using Nominatim API
  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      setErrorMessage('Por favor, digite um endereço para buscar.');
      return;
    }
    setGeocoding(true);
    setErrorMessage('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          setCoords({
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          });
          setAddress(result.display_name); // update to parsed formatted address
        } else {
          setErrorMessage('Endereço não encontrado. Verifique e tente novamente, ou selecione no mapa.');
        }
      } else {
        setErrorMessage('Erro ao consultar serviço de mapas. Tente selecionar no mapa.');
      }
    } catch (e) {
      setErrorMessage('Erro de conexão ao buscar endereço. Tente selecionar no mapa.');
    } finally {
      setGeocoding(false);
    }
  };

  // Get current device location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocalização não é suportada por seu dispositivo.');
      return;
    }
    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          if (response.ok) {
            const data = await response.json();
            setAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          } else {
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch (e) {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
          setGeocoding(false);
        }
      },
      () => {
        setErrorMessage('Não foi possível obter sua localização atual.');
        setGeocoding(false);
      }
    );
  };

  const handleSelectCoordsFromMap = (selected: { lat: number; lng: number; address?: string }) => {
    setCoords({ lat: selected.lat, lng: selected.lng });
    if (selected.address) {
      setAddress(selected.address);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('O nome é obrigatório.');
      return;
    }
    if (!address.trim() || !coords) {
      setErrorMessage('Localização/Endereço válido é obrigatório. Busque ou marque no mapa.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave({
        name,
        phone,
        email,
        address,
        coordinates: coords
      });
      onClose();
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao salvar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    {client ? 'Editar Cliente' : 'Novo Cliente'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {client ? 'Atualize as informações cadastrais do cliente' : 'Cadastre um novo cliente na sua base de entregas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label htmlFor="modal-client-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome do Cliente <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="modal-client-name"
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-client-phone" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="modal-client-phone"
                    type="text"
                    inputMode="tel"
                    placeholder="Ex: (11) 99999-9999"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="modal-client-email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    id="modal-client-email"
                    type="email"
                    placeholder="Ex: cliente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-client-address" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Endereço de Entrega <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="modal-client-address"
                    type="text"
                    required
                    placeholder="Ex: Av. Paulista, 1000 - São Paulo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="flex-grow px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleGeocodeAddress}
                    disabled={geocoding}
                    className="px-4 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 text-indigo-700 font-semibold rounded-xl border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 text-xs"
                    title="Buscar coordenadas por endereço"
                  >
                    <Search className="w-4 h-4 flex-shrink-0" />
                    <span>{geocoding ? 'Buscando...' : 'Buscar'}</span>
                  </button>
                </div>
              </div>

              {/* Quick map helpers */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={geocoding}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
                >
                  <Locate className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>Minha Posição Atual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapSelector(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
                >
                  <Navigation className="w-4 h-4 text-violet-600 flex-shrink-0" />
                  <span>Marcar no Mapa</span>
                </button>
              </div>

              {/* Dedicated Map Selection Modal */}
              <MapSelectionModal
                isOpen={showMapSelector}
                onClose={() => setShowMapSelector(false)}
                initialCoords={coords}
                onConfirm={handleSelectCoordsFromMap}
                title="Definir Endereço do Cliente"
              />

              {coords && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs flex justify-between items-center transition-all">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Coordenadas Definidas</p>
                      <p className="font-mono text-[10px] text-emerald-600">
                        Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <Check className="w-4.5 h-4.5 text-emerald-600" />
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{client ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

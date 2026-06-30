import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  User as UserIcon, Phone, FileText, Briefcase, Building, 
  MapPin, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Compass, Locate, Check, AlertCircle
} from 'lucide-react';
import MapSelectionModal from './MapSelectionModal';
import { validateCPF, validateCNPJ } from '../utils/validation';

interface OnboardingScreenProps {
  user: User;
  onComplete: (profile: UserProfile) => void;
}

export default function OnboardingScreen({ user, onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(user.displayName || '');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [role, setRole] = useState('Administrador');
  
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [segment, setSegment] = useState('Alimentos & Bebidas');

  // Live CPF and CNPJ validation checks
  const isCpfValid = cpf.length === 14 ? validateCPF(cpf) : null;
  const isCnpjValid = cnpj.length === 18 ? validateCNPJ(cnpj) : null;

  // Map & Geolocation states
  const [companyCoords, setCompanyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Get current device location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada por seu dispositivo.');
      return;
    }
    setGeocoding(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCompanyCoords({ lat, lng });
        
        // Reverse geocode to get a readable address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          if (response.ok) {
            const data = await response.json();
            setCompanyAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          } else {
            setCompanyAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch (e) {
          setCompanyAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
          setGeocoding(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError('Não foi possível obter sua localização atual. Verifique as permissões.');
        setGeocoding(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectCoordsFromMap = (selected: { lat: number; lng: number; address?: string }) => {
    setCompanyCoords({ lat: selected.lat, lng: selected.lng });
    if (selected.address) {
      setCompanyAddress(selected.address);
    }
  };

  // Input Formatting Helpers
  const formatCPF = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    return raw
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatCNPJ = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    return raw
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      return raw
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return raw
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  const handleNext = () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Por favor, digite seu nome completo.');
      return;
    }
    if (phone.length < 14) {
      setError('Por favor, informe um telefone válido com DDD.');
      return;
    }
    if (cpf.length < 14) {
      setError('Por favor, informe um CPF completo.');
      return;
    }
    if (!validateCPF(cpf)) {
      setError('O CPF informado é inválido. Verifique os números digitados.');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setError(null);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError('Por favor, informe o nome fantasia da empresa.');
      return;
    }
    if (cnpj.length < 18) {
      setError('Por favor, informe um CNPJ completo.');
      return;
    }
    if (!validateCNPJ(cnpj)) {
      setError('O CNPJ informado é inválido. Verifique os números digitados.');
      return;
    }
    if (!companyAddress.trim()) {
      setError('Por favor, informe o endereço corporativo.');
      return;
    }

    setLoading(true);

    const newProfile: UserProfile = {
      uid: user.uid,
      fullName,
      phone,
      cpf,
      role,
      companyName,
      cnpj,
      companyAddress,
      ...(companyCoords ? { companyCoordinates: companyCoords } : {}),
      segment,
      completedOnboarding: true,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'profiles', user.uid), newProfile);
      onComplete(newProfile);
    } catch (err: any) {
      console.error("Error saving onboarding details:", err);
      setError(err.message || 'Erro ao salvar os dados. Verifique a conexão ou regras de segurança.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start md:justify-center py-8 md:py-12 px-4 relative overflow-y-auto overflow-x-hidden font-sans antialiased">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10">
        
        {/* Branding & Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-600/20">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none">LogEstoque</h1>
          <p className="text-[11px] text-indigo-400 font-bold tracking-widest uppercase mt-1">
            Configuração Inicial da Conta
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
              step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}>
              1
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-indigo-400' : 'text-slate-500'}`}>
              Dados Pessoais
            </span>
          </div>
          
          <div className="w-8 h-0.5 bg-slate-800"></div>

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
              step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}>
              2
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${step === 2 ? 'text-indigo-400' : 'text-slate-500'}`}>
              Empresa/Negócio
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-start gap-3 text-sm animate-pulse">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      required
                      inputMode="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">CPF</label>
                    {isCpfValid !== null && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${isCpfValid ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                        {isCpfValid ? (
                          <>
                            <Check className="w-3 h-3" /> CPF Válido
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> CPF Inválido
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <FileText className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isCpfValid === true ? 'text-emerald-500' : isCpfValid === false ? 'text-rose-500' : 'text-slate-500'}`} />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className={`w-full pl-12 pr-4 py-3.5 bg-slate-950 border rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
                        isCpfValid === true 
                          ? 'border-emerald-500/50 focus:border-emerald-500' 
                          : isCpfValid === false 
                          ? 'border-rose-500/50 focus:border-rose-500' 
                          : 'border-slate-800 focus:border-indigo-500/50'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cargo / Função</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white text-sm focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Administrador" className="bg-slate-900">Administrador / Diretor</option>
                    <option value="Gerente de Estoque" className="bg-slate-900">Gerente de Estoque</option>
                    <option value="Operador Logístico" className="bg-slate-900">Operador Logístico</option>
                    <option value="Supervisor de Rotas" className="bg-slate-900">Supervisor de Rotas</option>
                    <option value="Motorista / Entregador" className="bg-slate-900">Motorista / Entregador</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full mt-6 py-4 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer select-none"
              >
                <span>Avançar para Dados da Empresa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="step2"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nome Fantasia da Empresa</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Distribuidora Sol e Mar"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">CNPJ</label>
                    {isCnpjValid !== null && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${isCnpjValid ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                        {isCnpjValid ? (
                          <>
                            <Check className="w-3 h-3" /> CNPJ Válido
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> CNPJ Inválido
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <FileText className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isCnpjValid === true ? 'text-emerald-500' : isCnpjValid === false ? 'text-rose-500' : 'text-slate-500'}`} />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                      className={`w-full pl-12 pr-4 py-3.5 bg-slate-950 border rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
                        isCnpjValid === true 
                          ? 'border-emerald-500/50 focus:border-emerald-500' 
                          : isCnpjValid === false 
                          ? 'border-rose-500/50 focus:border-rose-500' 
                          : 'border-slate-800 focus:border-indigo-500/50'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Segmento de Atuação</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <select
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white text-sm focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="Alimentos & Bebidas" className="bg-slate-900">Alimentos & Bebidas</option>
                      <option value="Eletrônicos & Tecnologia" className="bg-slate-900">Eletrônicos & Tecnologia</option>
                      <option value="Varejo / E-commerce" className="bg-slate-900">Varejo / E-commerce</option>
                      <option value="Cosméticos & Higiene" className="bg-slate-900">Cosméticos & Higiene</option>
                      <option value="Construção / Ferramentas" className="bg-slate-900">Construção / Ferramentas</option>
                      <option value="Distribuidora Geral" className="bg-slate-900">Distribuidora Geral</option>
                      <option value="Outros" className="bg-slate-900">Outros</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Endereço Corporativo (Sede/Depósito)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                  />
                </div>

                {/* Quick location options */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={geocoding}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Locate className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{geocoding ? 'Obtendo posição...' : 'Usar Localização Atual'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMapSelector(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-violet-400" />
                    <span>Selecionar no Mapa</span>
                  </button>
                </div>

                {/* Dedicated Map Selection Modal */}
                <MapSelectionModal
                  isOpen={showMapSelector}
                  onClose={() => setShowMapSelector(false)}
                  initialCoords={companyCoords}
                  onConfirm={handleSelectCoordsFromMap}
                  title="Definir Sede da Empresa"
                  isDark={true}
                />

                {companyCoords && (
                  <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-900/50 text-indigo-200 text-xs flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Coordenadas Gravadas</p>
                        <p className="font-mono text-[10px] text-indigo-400/80">Lat: {companyCoords.lat.toFixed(6)}, Lng: {companyCoords.lng.toFixed(6)}</p>
                      </div>
                    </div>
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                      ✓
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="px-6 py-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-grow py-4 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Concluir Cadastro</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-[11px] text-slate-500 text-center mt-6 leading-relaxed">
          Os dados informados acima são armazenados com segurança e vinculados exclusivamente à sua empresa no banco de dados.
        </p>

      </div>
    </div>
  );
}

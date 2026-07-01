import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  X, User, Phone, FileText, Briefcase, Building, 
  MapPin, Check, Loader2, Compass, Locate, AlertCircle
} from 'lucide-react';
import MapSelectionModal from './MapSelectionModal';
import { validateCPF, validateCNPJ } from '../utils/validation';
import { CustomSelect } from './CustomSelect';

interface ProfileModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: UserProfile) => void;
}

export default function ProfileModal({ profile, isOpen, onClose, onUpdate }: ProfileModalProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [cpf, setCpf] = useState(profile.cpf);
  const [role, setRole] = useState(profile.role);

  const [companyName, setCompanyName] = useState(profile.companyName);
  const [cnpj, setCnpj] = useState(profile.cnpj);
  const [companyAddress, setCompanyAddress] = useState(profile.companyAddress);
  const [segment, setSegment] = useState(profile.segment);

  // PIX & Bank data states
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>(profile.pixKeyType || 'cpf');
  const [pixKey, setPixKey] = useState(profile.pixKey || '');
  const [pixHolderName, setPixHolderName] = useState(profile.pixHolderName || '');
  const [pixBankName, setPixBankName] = useState(profile.pixBankName || '');
  const [pixBankCity, setPixBankCity] = useState(profile.pixBankCity || '');

  // Map & Geolocation states
  const [companyCoords, setCompanyCoords] = useState<{ lat: number; lng: number } | null>(profile.companyCoordinates || null);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Live CPF and CNPJ validation checks
  const isCpfValid = cpf.length === 14 ? validateCPF(cpf) : null;
  const isCnpjValid = cnpj.length === 18 ? validateCNPJ(cnpj) : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone);
      setCpf(profile.cpf);
      setRole(profile.role);
      setCompanyName(profile.companyName);
      setCnpj(profile.cnpj);
      setCompanyAddress(profile.companyAddress);
      setSegment(profile.segment);
      setCompanyCoords(profile.companyCoordinates || null);
      setPixKeyType(profile.pixKeyType || 'cpf');
      setPixKey(profile.pixKey || '');
      setPixHolderName(profile.pixHolderName || '');
      setPixBankName(profile.pixBankName || '');
      setPixBankCity(profile.pixBankCity || '');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fullName.trim()) {
      setError('O nome completo é obrigatório.');
      return;
    }
    if (phone.length < 14) {
      setError('Informe um telefone válido.');
      return;
    }
    if (cpf.length < 14) {
      setError('Informe um CPF completo.');
      return;
    }
    if (!validateCPF(cpf)) {
      setError('O CPF informado é inválido. Verifique os números digitados.');
      return;
    }
    if (!companyName.trim()) {
      setError('O nome da empresa é obrigatório.');
      return;
    }
    if (cnpj && cnpj.length < 18) {
      setError('Informe um CNPJ completo.');
      return;
    }
    if (cnpj && !validateCNPJ(cnpj)) {
      setError('O CNPJ informado é inválido. Verifique os números digitados.');
      return;
    }
    if (!companyAddress.trim()) {
      setError('O endereço da empresa é obrigatório.');
      return;
    }

    // Bank / PIX details are optional now
    const hasAnyPix = pixKey.trim() || pixHolderName.trim() || pixBankName.trim() || pixBankCity.trim();
    if (hasAnyPix) {
      if (!pixKey.trim()) {
        setError('A chave PIX é obrigatória se você for preencher os dados bancários.');
        return;
      }
      if (!pixHolderName.trim()) {
        setError('O titular da conta PIX é obrigatório se você for preencher os dados bancários.');
        return;
      }
      if (!pixBankName.trim()) {
        setError('O nome do banco é obrigatório se você for preencher os dados bancários.');
        return;
      }
      if (!pixBankCity.trim()) {
        setError('A cidade do banco é obrigatória se você for preencher os dados bancários.');
        return;
      }
    }

    setLoading(true);

    const updatedProfile: UserProfile = {
      ...profile,
      fullName,
      phone,
      cpf,
      role,
      companyName,
      cnpj,
      companyAddress,
      companyCoordinates: companyCoords || undefined,
      segment,
      pixKeyType,
      pixKey,
      pixHolderName,
      pixBankName,
      pixBankCity,
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'profiles', profile.uid);
      await updateDoc(docRef, {
        fullName,
        phone,
        cpf,
        role,
        companyName,
        cnpj,
        companyAddress,
        companyCoordinates: companyCoords || null,
        segment,
        pixKeyType,
        pixKey,
        pixHolderName,
        pixBankName,
        pixBankCity,
        updatedAt: new Date().toISOString()
      });
      onUpdate(updatedProfile);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || 'Erro ao salvar os dados no Firestore.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/10 rounded-xl text-indigo-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-slate-900 font-bold text-lg">Meu Perfil de Usuário</h2>
              <p className="text-xs text-slate-500">Configure seus dados pessoais e de negócio</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Perfil atualizado com sucesso no banco de dados!</span>
            </div>
          )}

          {/* Section 1: Personal Data */}
          <div>
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full"></span>
              Dados Pessoais
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">CPF</label>
                    {isCpfValid !== null && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${isCpfValid ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`}>
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
                    <FileText className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${isCpfValid === true ? 'text-emerald-500' : isCpfValid === false ? 'text-rose-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all ${
                        isCpfValid === true 
                          ? 'border-emerald-300 focus:border-emerald-500 bg-emerald-50/10' 
                          : isCpfValid === false 
                          ? 'border-rose-300 focus:border-rose-500 bg-rose-50/10' 
                          : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cargo / Função</label>
                <CustomSelect
                  value={role}
                  onChange={(val) => setRole(val)}
                  options={[
                    { value: 'Administrador', label: 'Administrador / Diretor' },
                    { value: 'Gerente de Estoque', label: 'Gerente de Estoque' },
                    { value: 'Operador Logístico', label: 'Operador Logístico' },
                    { value: 'Supervisor de Rotas', label: 'Supervisor de Rotas' },
                    { value: 'Motorista / Entregador', label: 'Motorista / Entregador' }
                  ]}
                  placeholder="Selecione o cargo..."
                  className="w-full text-sm"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Company Data */}
          <div>
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full"></span>
              Dados da Empresa / Negócio
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nome Fantasia da Empresa</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">CNPJ</label>
                    {isCnpjValid !== null && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${isCnpjValid ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`}>
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
                    <FileText className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${isCnpjValid === true ? 'text-emerald-500' : isCnpjValid === false ? 'text-rose-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                      className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all ${
                        isCnpjValid === true 
                          ? 'border-emerald-300 focus:border-emerald-500 bg-emerald-50/10' 
                          : isCnpjValid === false 
                          ? 'border-rose-300 focus:border-rose-500 bg-rose-50/10' 
                          : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Segmento de Atuação</label>
                  <CustomSelect
                    value={segment}
                    onChange={(val) => setSegment(val)}
                    options={[
                      { value: 'Alimentos & Bebidas', label: 'Alimentos & Bebidas' },
                      { value: 'Eletrônicos & Tecnologia', label: 'Eletrônicos & Tecnologia' },
                      { value: 'Varejo / E-commerce', label: 'Varejo / E-commerce' },
                      { value: 'Cosméticos & Higiene', label: 'Cosméticos & Higiene' },
                      { value: 'Construção / Ferramentas', label: 'Construção / Ferramentas' },
                      { value: 'Distribuidora Geral', label: 'Distribuidora Geral' },
                      { value: 'Outros', label: 'Outros' }
                    ]}
                    placeholder="Selecione o segmento..."
                    className="w-full text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Endereço Corporativo</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all"
                  />
                </div>

                {/* Quick location options */}
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={geocoding}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Locate className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{geocoding ? 'Obtendo posição...' : 'Usar Localização Atual'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMapSelector(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-violet-600" />
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
                />

                {companyCoords && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Coordenadas Gravadas</p>
                        <p className="font-mono text-[10px] text-emerald-600/80">Lat: {companyCoords.lat.toFixed(6)}, Lng: {companyCoords.lng.toFixed(6)}</p>
                      </div>
                    </div>
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs">
                      ✓
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Bank / PIX Data */}
          <div>
            <h3 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full"></span>
              Dados Bancários para PIX
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tipo de Chave PIX</label>
                  <CustomSelect
                    value={pixKeyType}
                    onChange={(val) => {
                      setPixKeyType(val as any);
                      setPixKey('');
                    }}
                    options={[
                      { value: 'cpf', label: 'CPF' },
                      { value: 'cnpj', label: 'CNPJ' },
                      { value: 'email', label: 'E-mail' },
                      { value: 'phone', label: 'Telefone' },
                      { value: 'random', label: 'Chave Aleatória' }
                    ]}
                    placeholder="Selecione o tipo..."
                    className="w-full text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Chave PIX (Opcional)</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={
                        pixKeyType === 'cpf' ? '000.000.000-00' :
                        pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                        pixKeyType === 'phone' ? '(11) 99999-9999' :
                        pixKeyType === 'email' ? 'email@exemplo.com' : 'Sua chave PIX'
                      }
                      value={pixKey}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (pixKeyType === 'cpf') val = formatCPF(val);
                        else if (pixKeyType === 'cnpj') val = formatCNPJ(val);
                        else if (pixKeyType === 'phone') val = formatPhone(val);
                        setPixKey(val);
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nome do Titular da Conta (Opcional)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nome do titular"
                    value={pixHolderName}
                    onChange={(e) => setPixHolderName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cidade da Agência / Banco (Opcional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={pixBankCity}
                      onChange={(e) => setPixBankCity(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

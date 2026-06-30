import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Package, Check, AlertCircle, DollarSign, Weight, Inbox, ShieldAlert
} from 'lucide-react';
import { Product } from '../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (productData: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  product,
  onSave
}: ProductFormModalProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name);
        setSku(product.sku || '');
        setDescription(product.description || '');
        setPrice(product.price);
        setStock(product.stock);
        setMinStock(product.minStock);
        setWeight(product.weight);
      } else {
        setName('');
        setSku('');
        setDescription('');
        setPrice(0);
        setStock(0);
        setMinStock(0);
        setWeight(0);
      }
      setErrorMessage('');
      setIsSaving(false);
    }
  }, [isOpen, product]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('O nome do produto é obrigatório.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave({
        name,
        sku,
        description,
        price: Number(price),
        stock: Number(stock),
        minStock: Number(minStock),
        weight: Number(weight)
      });
      onClose();
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao salvar produto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    {product ? 'Editar Produto' : 'Novo Produto'}
                  </h3>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Produto <span className="text-rose-500">*</span></label>
                <input type="text" required placeholder="Ex: Coca-Cola 2L" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">SKU (Opcional)</label>
                  <input type="text" placeholder="Ex: BEB-COC-2L" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preço (R$)</label>
                  <input type="number" step="0.01" value={price || ''} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estoque Inicial</label>
                  <input type="number" disabled={!!product} value={stock} onChange={(e) => setStock(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 bg-slate-50 disabled:bg-slate-100 text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estoque Mín.</label>
                  <input type="number" value={minStock} onChange={(e) => setMinStock(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Peso (Kg)</label>
                  <input type="number" step="0.01" value={weight || ''} onChange={(e) => setWeight(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm" />
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-colors">Cancelar</button>
              <button type="button" onClick={handleSubmit} disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-1.5">
                {isSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Check className="w-4 h-4" />}
                <span>{product ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Pencil, Trash2, Plus, ChevronDown } from 'lucide-react';
import { DeliveryRoute, Client, Product, RouteItem } from '../types';
import { useToast } from './Toast';
import { CustomSelect } from './CustomSelect';

const CustomProductDropdown = ({ value, onChange, options, placeholder }: { value: string, onChange: (id: string) => void, options: Product[], placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <div className="relative flex-grow">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm cursor-pointer flex justify-between items-center"
      >
        <span className={selected ? 'text-slate-700' : 'text-slate-400'}>{selected ? selected.name : placeholder}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto"
          >
            {options.map(o => (
              <div
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setIsOpen(false);
                }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
              >
                {o.name}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface RouteEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: DeliveryRoute | null;
  clients: Client[];
  products: Product[];
  onSave: (routeId: string, routeData: Partial<DeliveryRoute>) => Promise<void>;
}

export default function RouteEditModal({
  isOpen,
  onClose,
  route,
  clients,
  products,
  onSave
}: RouteEditModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [items, setItems] = useState<RouteItem[]>([]);
  const [newClientId, setNewClientId] = useState('');
  const [newClientProducts, setNewClientProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [newProductId, setNewProductId] = useState('');
  const [newProductQty, setNewProductQty] = useState<string>('');
  const [productAdditionState, setProductAdditionState] = useState<Record<number, { productId: string, quantity: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && route) {
      setName(route.name);
      setItems(JSON.parse(JSON.stringify(route.items))); // Deep clone
      setNewClientId('');
      setNewClientProducts([]);
      setProductAdditionState({});
      setNewProductQty('');
    }
  }, [isOpen, route]);

  const addProductToStop = (stopIdx: number) => {
    const addition = productAdditionState[stopIdx];
    if (!addition || !addition.productId) {
      showToast('Selecione um produto.', 'error');
      return;
    }
    const qty = parseInt(addition.quantity) || 0;
    if (qty <= 0) {
      showToast('Quantidade inválida.', 'error');
      return;
    }

    const product = products.find(p => p.id === addition.productId);
    if (product && qty > product.stock) {
      showToast(`Quantidade excede o estoque disponível (${product.stock}).`, 'error');
    }
    
    const newItems = [...items];
    newItems[stopIdx].items.push({
      productId: addition.productId,
      productName: product?.name || 'Produto',
      quantity: qty
    });
    setItems(newItems);
    setProductAdditionState(prev => ({ ...prev, [stopIdx]: { productId: '', quantity: '' } }));
  };

  const handleSave = async () => {
    if (!route) return;
    if (!name.trim()) {
      showToast('O nome da rota é obrigatório.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(route.id, { name, items });
      showToast('Rota atualizada com sucesso!', 'success');
      onClose();
    } catch (e) {
      showToast('Erro ao atualizar rota.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProductToNewStop = () => {
    if (!newProductId) return;
    const product = products.find(p => p.id === newProductId);
    if (!product) return;
    
    const qty = parseInt(newProductQty) || 0;
    if (qty <= 0) {
      showToast('Quantidade inválida.', 'error');
      return;
    }

    const existingIdx = newClientProducts.findIndex(p => p.productId === newProductId);
    if (existingIdx !== -1) {
      const newProds = [...newClientProducts];
      newProds[existingIdx].quantity += qty;
      setNewClientProducts(newProds);
    } else {
      setNewClientProducts([...newClientProducts, { productId: newProductId, quantity: qty }]);
    }
    setNewProductId('');
    setNewProductQty('');
  };

  const handleAddNewStop = () => {
    if (!newClientId) {
      showToast('Selecione um cliente.', 'error');
      return;
    }
    if (newClientProducts.length === 0) {
      showToast('Adicione produtos para este cliente.', 'error');
      return;
    }
    if (items.some(i => i.clientId === newClientId)) {
      showToast('Cliente já está na rota.', 'error');
      return;
    }

    const client = clients.find(c => c.id === newClientId);
    if (!client) return;

    const newStop: RouteItem = {
      clientId: newClientId,
      status: 'pending',
      items: newClientProducts.map(p => {
        const prod = products.find(pr => pr.id === p.productId);
        if (prod && p.quantity > prod.stock) {
            showToast(`Produto ${prod.name} excede o estoque disponível (${prod.stock}).`, 'error');
        }
        return {
          productId: p.productId,
          productName: prod ? prod.name : 'Produto',
          quantity: p.quantity
        };
      })
    };
    setItems([...items, newStop]);
    setNewClientId('');
    setNewClientProducts([]);
  };

  return (
    <AnimatePresence>
      {isOpen && route && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Editar Rota</h3>
                  <p className="text-xs text-slate-500">Altere nome, clientes ou produtos</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400">
                <X className="w-5.5 h-5.5" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome da Rota</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Paradas (Clientes)</label>
                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const client = clients.find(c => c.id === item.clientId);
                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold">{client?.name || 'Cliente'}</span>
                          <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-rose-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {item.items.map((prod, pIdx) => (
                          <div key={pIdx} className="flex justify-between items-center bg-white p-2 rounded-lg mt-1 gap-2">
                            <span className="text-xs truncate flex-grow">{prod.productName}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={prod.quantity}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  const newQty = parseInt(val) || 0;
                                  const newItems = [...items];
                                  newItems[idx].items[pIdx].quantity = newQty;
                                  setItems(newItems);
                                  const prod = products.find(p => p.id === prod.productId);
                                  if (prod && newQty > prod.stock) {
                                    showToast(`Quantidade excede o estoque disponível (${prod.stock}).`, 'error');
                                  }
                                }}
                                className={`w-12 px-1 py-0.5 border rounded-lg text-right text-xs ${
                                  (products.find(p => p.id === prod.productId)?.stock || 0) < prod.quantity
                                    ? 'border-rose-500 text-rose-600 bg-rose-50'
                                    : 'border-slate-200'
                                }`}
                              />
                              <button
                                onClick={() => {
                                  const newItems = [...items];
                                  newItems[idx].items.splice(pIdx, 1);
                                  setItems(newItems);
                                }}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200">
                          <CustomProductDropdown
                            value={productAdditionState[idx]?.productId || ''}
                            onChange={(id) => setProductAdditionState(prev => ({ ...prev, [idx]: { ...prev[idx], productId: id } }))}
                            options={products}
                            placeholder="Produto..."
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={productAdditionState[idx]?.quantity || ''}
                            onChange={(e) => setProductAdditionState(prev => ({ ...prev, [idx]: { ...prev[idx], quantity: e.target.value.replace(/\D/g, '') } }))}
                            className="w-12 px-1 py-1 border border-slate-200 rounded-lg text-xs"
                          />
                          <button onClick={() => addProductToStop(idx)} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-900">Adicionar Nova Parada</h4>
                    <CustomSelect
                      value={newClientId}
                      onChange={(val) => setNewClientId(val)}
                      options={clients.map(c => ({ value: c.id, label: c.name }))}
                      placeholder="Selecione um cliente..."
                      className="w-full"
                    />
                    {newClientId && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <CustomProductDropdown
                            value={newProductId}
                            onChange={(id) => setNewProductId(id)}
                            options={products}
                            placeholder="Selecione produto..."
                          />
                          <input
                            id="stop-qty"
                            type="text"
                            inputMode="numeric"
                            value={newProductQty}
                            onChange={(e) => setNewProductQty(e.target.value.replace(/\D/g, ''))}
                            className="w-16 px-2 py-2 border border-slate-200 rounded-lg text-sm"
                          />
                          <button onClick={handleAddProductToNewStop} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus className="w-4 h-4" /></button>
                        </div>
                        {newClientProducts.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs p-1 bg-white rounded">
                            {products.find(prod => prod.id === p.productId)?.name} ({p.quantity})
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={handleAddNewStop} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Adicionar Parada</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

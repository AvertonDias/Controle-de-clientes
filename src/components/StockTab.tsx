import { useState, FormEvent } from 'react';
import { Product, StockMovement, MovementType } from '../types';
import { 
  History, Plus, ArrowUpRight, ArrowDownRight, Search, Calendar, Filter, FileText, Check
} from 'lucide-react';

interface StockTabProps {
  products: Product[];
  movements: StockMovement[];
  onAddMovement: (productId: string, type: MovementType, quantity: number, observation: string) => Promise<void>;
}

export default function StockTab({
  products,
  movements,
  onAddMovement
}: StockTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');

  // Form states for manual movement creation
  const [isAdding, setIsAdding] = useState(false);
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<MovementType>('entry');
  const [quantity, setQuantity] = useState<number>(0);
  const [observation, setObservation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filtering movements history
  const filteredMovements = movements.filter((mov) => {
    const product = products.find(p => p.id === mov.productId);
    const productName = product ? product.name : mov.productName || '';
    
    const matchesSearch = 
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.observation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || mov.type === selectedType;
    const matchesProduct = selectedProductFilter === 'all' || mov.productId === selectedProductFilter;

    return matchesSearch && matchesType && matchesProduct;
  });

  const handleSubmitMovement = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!productId) {
      setErrorMessage('Selecione um produto.');
      return;
    }
    if (quantity <= 0) {
      setErrorMessage('A quantidade deve ser maior do que zero.');
      return;
    }
    if (!observation.trim()) {
      setErrorMessage('Escreva uma justificativa/observação para a movimentação.');
      return;
    }

    const selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) {
      setErrorMessage('Produto não encontrado.');
      return;
    }

    // Check if it's subtraction and if there's enough stock
    const isReduction = ['exit', 'delivery', 'adjustment'].includes(type) && type !== 'adjustment'; // adjust can go both ways, but manual input is positive subtract
    const isActuallySubtracting = type === 'exit' || (type === 'adjustment' && selectedProduct.stock - quantity < 0);
    
    if (isReduction && selectedProduct.stock < quantity) {
      setErrorMessage(`Estoque insuficiente. Estoque atual: ${selectedProduct.stock} un`);
      return;
    }

    try {
      await onAddMovement(productId, type, quantity, observation);
      setSuccessMessage('Movimentação registrada com sucesso!');
      
      // Reset form fields
      setProductId('');
      setQuantity(0);
      setObservation('');
      setTimeout(() => {
        setIsAdding(false);
        setSuccessMessage('');
      }, 1500);
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao registrar movimentação.');
    }
  };

  const getMovementTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'entry':
        return <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><ArrowUpRight className="w-3 h-3" /> Entrada</span>;
      case 'exit':
        return <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><ArrowDownRight className="w-3 h-3" /> Saída</span>;
      case 'return':
        return <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">Devolução</span>;
      case 'delivery':
        return <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">Entrega</span>;
      case 'adjustment':
        return <span className="px-2 py-1 rounded bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">Ajuste</span>;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      {/* Left panel: Logs of stock changes */}
      <div className={`flex flex-col ${isAdding ? 'lg:w-7/12' : 'w-full'} bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 overflow-hidden h-full transition-all duration-300`}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 id="stock-heading" className="text-xl font-bold text-slate-800">Movimentações de Estoque</h2>
            <p className="text-sm text-slate-500">Histórico completo de entradas, saídas e ajustes</p>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 transition-colors duration-200 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Movimentação</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-xs transition-all"
            />
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filtrar por tipo de movimentação"
              className="w-full px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-xs"
            >
              <option value="all">Todos os tipos</option>
              <option value="entry">Entradas</option>
              <option value="exit">Saídas</option>
              <option value="return">Devoluções</option>
              <option value="delivery">Entregas</option>
              <option value="adjustment">Ajustes</option>
            </select>
          </div>

          <div>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              aria-label="Filtrar por produto"
              className="w-full px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-xs"
            >
              <option value="all">Todos os produtos</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table / List */}
        <div className="flex-grow overflow-y-auto pr-1">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-medium">Nenhuma movimentação registrada.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredMovements.map((mov) => {
                const product = products.find(p => p.id === mov.productId);
                const isAddition = ['entry', 'return'].includes(mov.type);
                const displaySign = isAddition ? '+' : '-';
                const quantityColor = isAddition ? 'text-emerald-600' : 'text-rose-600';

                return (
                  <div 
                    key={mov.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-3.5 bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-all duration-150 gap-3"
                  >
                    <div className="flex-grow space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm truncate">
                          {product ? product.name : mov.productName || 'Produto Removido'}
                        </span>
                        {getMovementTypeBadge(mov.type)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(mov.date).toLocaleString('pt-BR')}</span>
                        {mov.observation && (
                          <>
                            <span className="text-slate-200">|</span>
                            <FileText className="w-3.5 h-3.5" />
                            <span className="text-slate-500 italic truncate" title={mov.observation}>
                              "{mov.observation}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={`text-right text-base font-black ${quantityColor}`}>
                      {displaySign} {mov.quantity} <span className="text-xs font-normal text-slate-500">un</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Add manual transaction */}
      {isAdding && (
        <div className="w-full lg:w-5/12 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 h-full flex flex-col justify-start overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg text-slate-800">Lançar Movimentação</h3>
            <button 
              onClick={() => setIsAdding(false)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 bg-rose-50 text-rose-700 text-xs font-medium rounded-xl border border-rose-100">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 mb-4 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-xl border border-emerald-100 flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitMovement} className="space-y-4">
            <div>
              <label htmlFor="mov-product" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Produto <span className="text-rose-500">*</span>
              </label>
              <select
                id="mov-product"
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none text-sm transition-all"
              >
                <option value="">Selecione um produto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Disponível: {p.stock} un)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mov-type" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Tipo de Lançamento <span className="text-rose-500">*</span>
                </label>
                <select
                  id="mov-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as MovementType)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none text-sm transition-all"
                >
                  <option value="entry">Entrada (Compra/Produção)</option>
                  <option value="exit">Saída (Consumo/Avaria)</option>
                  <option value="return">Devolução (Cliente)</option>
                  <option value="adjustment">Ajuste (Inventário)</option>
                </select>
              </div>

              <div>
                <label htmlFor="mov-qty" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Quantidade (un) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="mov-qty"
                  type="number"
                  inputMode="numeric"
                  required
                  min="1"
                  placeholder="Ex: 10"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="mov-obs" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Motivo / Justificativa <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="mov-obs"
                required
                placeholder="Ex: Compra de mercadoria com nota fiscal, Ajuste após auditoria física..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none text-sm resize-none"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-100 transition-colors"
              >
                Salvar Lançamento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

import { useState, FormEvent } from 'react';
import { useToast } from './Toast';
import { Product } from '../types';
import { 
  Package, Search, Plus, Trash2, Edit2, AlertTriangle, ArrowUpDown, ArrowUpRight, ArrowDownRight, ShieldAlert, Check, X
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ProductFormModal from './ProductFormModal';

interface ProductsTabProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onQuickStockAdjust: (id: string, currentStock: number, change: number, reason: string) => Promise<void>;
}

export default function ProductsTab({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onQuickStockAdjust
}: ProductsTabProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  // Quick adjustment states
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Ajuste rápido');

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterType === 'low') {
      return p.stock <= p.minStock && p.stock > 0;
    }
    if (filterType === 'out') {
      return p.stock === 0;
    }
    return true;
  });

  const handleStartEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    if (selectedProduct) {
      await onUpdateProduct(selectedProduct.id, productData);
    } else {
      await onAddProduct(productData);
    }
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      try {
        await onDeleteProduct(productToDelete.id);
      } catch (e: any) {
        showToast(e.message || 'Erro ao excluir produto.', 'error');
      }
    }
  };

  const handleQuickAdjustSubmit = async (productId: string, currentStock: number) => {
    if (adjustQuantity === 0) {
      showToast('Selecione uma quantidade maior ou menor que zero.', 'error');
      return;
    }
    if (currentStock + adjustQuantity < 0) {
      showToast('O estoque resultante não pode ser negativo.', 'error');
      return;
    }

    try {
      await onQuickStockAdjust(productId, currentStock, adjustQuantity, adjustReason);
      setAdjustingId(null);
      setAdjustQuantity(0);
      setAdjustReason('Ajuste rápido');
    } catch (e: any) {
      showToast(e.message || 'Erro ao realizar ajuste rápido de estoque.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      {/* List Panel */}
      <div className="flex flex-col w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 overflow-hidden h-full">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 id="products-heading" className="text-xl font-bold text-slate-800">Produtos</h2>
            <p className="text-sm text-slate-500">Controle o catálogo de mercadorias e quantidades</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 transition-colors duration-200 text-sm animate-fade-in"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, SKU ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm"
            />
          </div>
          
          {/* Quick Filters */}
          <div className="flex rounded-xl bg-slate-100 p-1 self-start md:self-stretch">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                filterType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('low')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1 ${
                filterType === 'low' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Baixo Estoque
            </button>
            <button
              onClick={() => setFilterType('out')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1 ${
                filterType === 'out' ? 'bg-rose-100 text-rose-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              Esgotado
            </button>
          </div>
        </div>

        {/* Product List Scrollable */}
        <div className="flex-grow overflow-y-auto pr-1 space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-medium">Nenhum produto cadastrado ou encontrado.</p>
              {searchTerm && <p className="text-slate-400 text-xs mt-1">Experimente redefinir os filtros.</p>}
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isLowStock = product.stock <= product.minStock && product.stock > 0;
              const isOutOfStock = product.stock === 0;

              return (
                <div 
                  key={product.id}
                  className={`flex flex-col p-4 bg-white hover:bg-slate-50/50 border rounded-xl transition-all duration-200 ${
                    isOutOfStock ? 'border-rose-200 bg-rose-50/10' :
                    isLowStock ? 'border-amber-200 bg-amber-50/10' : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-grow space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          SKU: {product.sku}
                        </span>
                        {isOutOfStock && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded">
                            Esgotado
                          </span>
                        )}
                        {isLowStock && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Baixo Estoque
                          </span>
                        )}
                      </div>
                      
                      {product.description && (
                        <p className="text-xs text-slate-500 truncate" title={product.description}>
                          {product.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                        <p>
                          Preço: <span className="font-bold text-slate-700">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p>
                          Peso: <span className="font-bold text-slate-700">{product.weight} kg</span>
                        </p>
                        <p>
                          Mín. Recomendado: <span className="font-semibold text-slate-600">{product.minStock} un</span>
                        </p>
                      </div>
                    </div>

                    {/* Stock Display Counter */}
                    <div className="flex items-center gap-6 self-stretch justify-between md:self-center md:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estoque Atual</p>
                        <p className={`text-2xl font-black ${
                          isOutOfStock ? 'text-rose-600' :
                          isLowStock ? 'text-amber-600' : 'text-indigo-600'
                        }`}>
                          {product.stock} <span className="text-xs font-normal text-slate-500">un</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (adjustingId === product.id) {
                              setAdjustingId(null);
                            } else {
                              setAdjustingId(product.id);
                              setAdjustQuantity(0);
                            }
                          }}
                          className={`p-2 rounded-lg transition-all border flex items-center gap-1 text-xs font-semibold ${
                            adjustingId === product.id 
                              ? 'bg-amber-100 text-amber-800 border-amber-200' 
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                          title="Ajuste rápido de estoque"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                          <span className="hidden md:inline">Ajustar</span>
                        </button>
                        <button
                          onClick={() => handleStartEdit(product)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200 border border-transparent"
                          title="Editar Produto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors duration-200 border border-transparent"
                          title="Excluir Produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Quick Stock Adjustment Panel */}
                  {adjustingId === product.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg flex flex-col md:flex-row items-stretch md:items-center gap-3 animate-slide-up">
                      <div className="flex-grow">
                        <label htmlFor="adjust-obs" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Observação do Ajuste
                        </label>
                        <input
                          id="adjust-obs"
                          type="text"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="Ex: Correção de inventário, Descarte, etc."
                          className="w-full px-3 py-1.5 bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Ajustar Quantidade
                          </label>
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setAdjustQuantity(prev => prev - 1)}
                              className="px-2.5 py-1.5 hover:bg-slate-100 text-rose-600 font-bold text-sm transition-colors border-r border-slate-200"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={adjustQuantity === 0 ? '' : adjustQuantity}
                              onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                              placeholder="0"
                              className="w-14 text-center text-xs font-bold text-slate-700 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setAdjustQuantity(prev => prev + 1)}
                              className="px-2.5 py-1.5 hover:bg-slate-100 text-emerald-600 font-bold text-sm transition-colors border-l border-slate-200"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="self-end flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustSubmit(product.id, product.stock)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
                            title="Confirmar Ajuste"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingId(null);
                              setAdjustQuantity(0);
                            }}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dedicated Product Form Modal (Add & Edit) */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onSave={handleSaveProduct}
      />

      {/* Confirmar Exclusão de Produto */}
      <ConfirmModal
        isOpen={productToDelete !== null}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Produto"
        message={`Tem certeza que deseja excluir o produto "${productToDelete?.name}"? Esta ação removerá o produto permanentemente do estoque e do catálogo.`}
        confirmText="Excluir Produto"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </div>
  );
}

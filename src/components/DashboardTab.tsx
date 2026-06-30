import { Product, Client, DeliveryRoute, StockMovement } from '../types';
import { 
  DollarSign, Package, Users, Compass, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';

interface DashboardTabProps {
  products: Product[];
  clients: Client[];
  routes: DeliveryRoute[];
  movements: StockMovement[];
  onNavigateToTab: (tab: 'dashboard' | 'clients' | 'products' | 'stock' | 'deliveries') => void;
}

export default function DashboardTab({
  products,
  clients,
  routes,
  movements,
  onNavigateToTab
}: DashboardTabProps) {
  
  // 1. Calculate General Statistics
  const totalStockItems = products.reduce((sum, p) => sum + p.stock, 0);
  
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  
  const lowStockCount = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  
  const pendingDeliveriesCount = routes.filter(r => r.status === 'pending').length;
  const activeRoutesCount = routes.filter(r => r.status === 'in_progress').length;

  // 2. Prepare Data for Recharts BarChart (Stock level vs Min Stock level)
  const stockChartData = products.slice(0, 7).map(p => ({
    name: p.name.substring(0, 12),
    Estoque: p.stock,
    Mínimo: p.minStock
  }));

  // 3. Prepare Data for Recharts AreaChart (Entries vs Exits over the last movements)
  // Let's summarize the last 10 movements or group movements by date
  const movementsSummary = movements.slice(0, 15).reverse();
  const movementChartData: { name: string; Entradas: number; Saídas: number }[] = [];
  
  // Create a dictionary of recent dates and sum entries vs exits
  const dateMap: { [date: string]: { entries: number; exits: number } } = {};
  
  movementsSummary.forEach(m => {
    // format date as DD/MM
    const dateObj = new Date(m.date);
    const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = { entries: 0, exits: 0 };
    }
    
    if (['entry', 'return'].includes(m.type)) {
      dateMap[dateStr].entries += m.quantity;
    } else {
      dateMap[dateStr].exits += m.quantity;
    }
  });

  Object.keys(dateMap).forEach(date => {
    movementChartData.push({
      name: date,
      Entradas: dateMap[date].entries,
      Saídas: dateMap[date].exits
    });
  });

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  return (
    <div className="space-y-6 overflow-y-auto h-full pr-1 pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-wrap no-select">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>Visão Geral do Negócio</span>
            <Sparkles className="w-5 h-5 text-indigo-600 fill-indigo-200 animate-pulse" />
          </h2>
          <p className="text-sm text-slate-500 font-medium">Controle de clientes, estoque integrado e rotas de entrega inteligentes</p>
        </div>
        
        {/* Offline cache helper badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs font-semibold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sincronizado com Nuvem (Suporte Offline Ativo)</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* Total Inventory Value */}
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor do Estoque</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              R$ {totalInventoryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-semibold">{totalStockItems} unidades em depósito</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avisos de Estoque</span>
            <div className={`p-2 rounded-xl ${(lowStockCount + outOfStockCount) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {lowStockCount + outOfStockCount} <span className="text-xs font-normal text-slate-400">produtos</span>
            </p>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              {outOfStockCount} esgotados, {lowStockCount} abaixo do mínimo
            </p>
          </div>
        </div>

        {/* Client Base */}
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Cadastrados</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{clients.length}</p>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Endereços geolocalizados na base</p>
          </div>
        </div>

        {/* Delivery Logistics */}
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logística e Rotas</span>
            <div className={`p-2 rounded-xl ${activeRoutesCount > 0 ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {activeRoutesCount + pendingDeliveriesCount} <span className="text-xs font-normal text-slate-400">rotas</span>
            </p>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              {activeRoutesCount} em trânsito, {pendingDeliveriesCount} agendadas
            </p>
          </div>
        </div>

      </div>

      {/* Visual Analytics / Charts Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Recharts BarChart for product stock levels */}
        <div className="p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Níveis de Estoque dos Principais Produtos</h3>
            <p className="text-xs text-slate-400">Comparação visual com o estoque mínimo recomendado</p>
          </div>
          <div className="h-[240px] w-full flex-grow text-xs">
            {stockChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-semibold bg-slate-50 rounded-xl border border-dashed">
                Adicione produtos para gerar o gráfico
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="Estoque" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Mínimo" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recharts AreaChart for recent stock activities */}
        <div className="p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Movimentação Recente (Unidades)</h3>
            <p className="text-xs text-slate-400">Fluxo de Entradas vs Saídas acumulado por dia</p>
          </div>
          <div className="h-[240px] w-full flex-grow text-xs">
            {movementChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-semibold bg-slate-50 rounded-xl border border-dashed">
                Registre movimentações de estoque para ver o histórico
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={movementChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Saídas" stroke="#ef4444" fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Low stock alerts and Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Alerts table */}
        <div className="p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-7 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              <span>Alertas de Reposição</span>
            </h3>
            <button 
              onClick={() => onNavigateToTab('products')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Ver Todos
            </button>
          </div>

          <div className="flex-grow overflow-y-auto max-h-[220px] pr-1">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed">
                Estoque 100% regulado! Nenhum alerta ativo.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.map(p => {
                  const isEsgotado = p.stock === 0;
                  return (
                    <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className={`text-xs font-black ${isEsgotado ? 'text-rose-600' : 'text-amber-600'}`}>
                            {isEsgotado ? 'ESGOTADO' : `${p.stock} un`}
                          </p>
                          <p className="text-[9px] text-slate-400 font-semibold">Min: {p.minStock} un</p>
                        </div>
                        <button
                          onClick={() => onNavigateToTab('stock')}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] transition-colors border border-indigo-200"
                        >
                          Abastecer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Shortcut Panel */}
        <div className="p-4 md:p-6 bg-slate-900 text-white rounded-2xl shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-indigo-300 uppercase tracking-widest mb-1">Menu Rápido</h3>
            <h4 className="font-black text-lg text-white mb-2 leading-tight">Agilize seus processos de ponta a ponta</h4>
            <p className="text-xs text-slate-400 mb-4 font-medium">Toque nos atalhos para lançar novos registros no sistema instantaneamente.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              onClick={() => onNavigateToTab('clients')}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-left rounded-xl transition-all flex flex-col justify-between gap-3 h-20 group"
            >
              <Users className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Novo Cliente</span>
            </button>
            
            <button
              onClick={() => onNavigateToTab('products')}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-left rounded-xl transition-all flex flex-col justify-between gap-3 h-20 group"
            >
              <Package className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Novo Produto</span>
            </button>

            <button
              onClick={() => onNavigateToTab('deliveries')}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-left rounded-xl transition-all flex flex-col justify-between gap-3 h-20 col-span-2 group"
            >
              <Compass className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Otimizar Nova Rota de Entrega</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

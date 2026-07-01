import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { Client, Product, DeliveryRoute, RouteItem, MovementType, UserProfile } from '../types';
import { 
  Navigation, Calendar, MapPin, CheckCircle2, XCircle, ArrowRight, Play, AlertTriangle, Check, X, Plus, Trash2, Map, Truck, ChevronRight, HelpCircle
} from 'lucide-react';
import MapComponent from './MapComponent';
import ConfirmModal from './ConfirmModal';

interface DeliveriesTabProps {
  clients: Client[];
  products: Product[];
  routes: DeliveryRoute[];
  onAddRoute: (route: Omit<DeliveryRoute, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateRoute: (id: string, route: Partial<DeliveryRoute>) => Promise<void>;
  onDeleteRoute: (id: string) => Promise<void>;
  onDeliverStop: (routeId: string, clientIdx: number, items: { productId: string, quantity: number }[]) => Promise<void>;
  onFailStop: (routeId: string, clientIdx: number, reason: string) => Promise<void>;
  profile?: UserProfile | null;
}

export default function DeliveriesTab({
  clients,
  products,
  routes,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
  onDeliverStop,
  onFailStop,
  profile
}: DeliveriesTabProps) {
  const { showToast } = useToast();
  const [activeRoute, setActiveRoute] = useState<DeliveryRoute | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [routeToCancel, setRouteToCancel] = useState<DeliveryRoute | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<{ id: string; name: string } | null>(null);

  // Creation Form states
  const [routeName, setRouteName] = useState('');
  const [startAddress, setStartAddress] = useState('Depósito Central - Av. Paulista, 1000 - São Paulo, SP');
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number }>({ lat: -23.5615, lng: -46.6560 });

  // Update starting point to match company profile if available
  useEffect(() => {
    if (profile && !isCreating) {
      if (profile.companyAddress) {
        setStartAddress(profile.companyAddress);
      }
      if (profile.companyCoordinates) {
        setStartCoords(profile.companyCoordinates);
      }
    }
  }, [profile, isCreating]);
  const [selectedItems, setSelectedItems] = useState<RouteItem[]>([]);

  // Helpers for adding stops during creation
  const [currentClientStopId, setCurrentClientStopId] = useState('');
  const [currentStopProducts, setCurrentStopProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [currentStopProductId, setCurrentStopProductId] = useState('');
  const [currentStopProductQty, setCurrentStopProductQty] = useState<number>(1);

  // Failure modal state
  const [failingStopIdx, setFailingStopIdx] = useState<number | null>(null);
  const [failReason, setFailReason] = useState('');

  // Helper TSP solver
  const calculateOptimizedOrder = (start: { lat: number; lng: number }, itemsList: RouteItem[]) => {
    let current = start;
    const unvisited = itemsList.map((item, idx) => {
      const client = clients.find(c => c.id === item.clientId);
      return {
        idx,
        lat: client?.coordinates.lat || start.lat,
        lng: client?.coordinates.lng || start.lng
      };
    });

    const order: number[] = [];

    while (unvisited.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        // Flat Euclidean approx is perfectly fine for localized routing (degrees)
        const dist = Math.hypot(unvisited[i].lat - current.lat, unvisited[i].lng - current.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }

      const next = unvisited[closestIdx];
      order.push(next.idx);
      current = { lat: next.lat, lng: next.lng };
      unvisited.splice(closestIdx, 1);
    }

    return order;
  };

  // Add a product item to the current client stop being designed
  const handleAddProductToStop = () => {
    if (!currentStopProductId) return;
    const product = products.find(p => p.id === currentStopProductId);
    if (!product) return;

    if (currentStopProductQty <= 0) {
      showToast('Selecione uma quantidade maior que zero.', 'error');
      return;
    }

    // Check stock
    if (product.stock < currentStopProductQty) {
      showToast(`Alerta: Estoque insuficiente! Estoque disponível: ${product.stock} un.`, 'error');
      return;
    }

    // Check if product is already in the list
    const existingIdx = currentStopProducts.findIndex(p => p.productId === currentStopProductId);
    if (existingIdx !== -1) {
      const newItems = [...currentStopProducts];
      newItems[existingIdx].quantity += currentStopProductQty;
      setCurrentStopProducts(newItems);
    } else {
      setCurrentStopProducts([...currentStopProducts, {
        productId: currentStopProductId,
        quantity: currentStopProductQty
      }]);
    }

    setCurrentStopProductId('');
    setCurrentStopProductQty(1);
  };

  // Add the stop with chosen products to the route being created
  const handleAddStopToRoute = () => {
    if (!currentClientStopId) {
      showToast('Selecione um cliente.', 'error');
      return;
    }
    if (currentStopProducts.length === 0) {
      showToast('Por favor, adicione ao menos um produto para entregar a este cliente.', 'error');
      return;
    }

    // Check if client is already in stops
    if (selectedItems.some(item => item.clientId === currentClientStopId)) {
      showToast('Este cliente já foi adicionado a esta rota.', 'error');
      return;
    }

    const client = clients.find(c => c.id === currentClientStopId);
    if (!client) return;

    const routeItem: RouteItem = {
      clientId: currentClientStopId,
      status: 'pending',
      items: currentStopProducts.map(p => {
        const prod = products.find(pr => pr.id === p.productId);
        return {
          productId: p.productId,
          productName: prod ? prod.name : 'Produto',
          quantity: p.quantity
        };
      })
    };

    setSelectedItems([...selectedItems, routeItem]);

    // Reset current stop form
    setCurrentClientStopId('');
    setCurrentStopProducts([]);
  };

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      setErrorMessage('O nome da rota é obrigatório.');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMessage('Adicione ao menos uma parada de cliente na rota.');
      return;
    }

    try {
      // Auto-optimize sequence upon creation
      const optOrder = calculateOptimizedOrder(startCoords, selectedItems);

      const routeData = {
        name: routeName,
        status: 'pending' as const,
        date: new Date().toISOString().split('T')[0],
        startAddress,
        startCoordinates: startCoords,
        items: selectedItems,
        optimizedOrder: optOrder
      };

      await onAddRoute(routeData);

      // Reset
      setRouteName('');
      setSelectedItems([]);
      setIsCreating(false);
      setErrorMessage('');
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao criar rota.');
    }
  };

  const handleStartRouteExecution = async (route: DeliveryRoute) => {
    try {
      await onUpdateRoute(route.id, { status: 'in_progress' });
      setActiveRoute({ ...route, status: 'in_progress' });
    } catch (e) {
      showToast('Erro ao iniciar entrega.', 'error');
    }
  };

  const handleCompleteRoute = async (route: DeliveryRoute) => {
    try {
      await onUpdateRoute(route.id, { 
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      setActiveRoute(null);
      showToast('Parabéns! Rota finalizada com sucesso.', 'success');
    } catch (e) {
      showToast('Erro ao finalizar rota.', 'error');
    }
  };

  const handleCancelRouteConfirm = async () => {
    if (routeToCancel) {
      try {
        await onUpdateRoute(routeToCancel.id, { status: 'cancelled' });
        setActiveRoute(null);
      } catch (e) {
        showToast('Erro ao cancelar rota.', 'error');
      }
    }
  };

  const handleStopSuccess = async (clientIdx: number, items: { productId: string, quantity: number }[]) => {
    if (!activeRoute) return;
    try {
      // Calls parents which updates Firebase, deducts stock, and saves a stock movement.
      await onDeliverStop(activeRoute.id, clientIdx, items);
      
      // Update local state to reflect instantly
      const updatedItems = [...activeRoute.items];
      updatedItems[clientIdx].status = 'delivered';
      updatedItems[clientIdx].deliveredAt = new Date().toISOString();
      
      setActiveRoute({
        ...activeRoute,
        items: updatedItems
      });
    } catch (e: any) {
      showToast(e.message || 'Erro ao registrar entrega.', 'error');
    }
  };

  const handleStopFailed = async () => {
    if (!activeRoute || failingStopIdx === null || !failReason.trim()) return;
    try {
      await onFailStop(activeRoute.id, failingStopIdx, failReason);

      const updatedItems = [...activeRoute.items];
      updatedItems[failingStopIdx].status = 'failed';
      updatedItems[failingStopIdx].failedReason = failReason;

      setActiveRoute({
        ...activeRoute,
        items: updatedItems
      });

      setFailingStopIdx(null);
      setFailReason('');
    } catch (e: any) {
      showToast(e.message || 'Erro ao registrar falha.', 'error');
    }
  };

  const handleDeleteRouteConfirm = async () => {
    if (routeToDelete) {
      try {
        await onDeleteRoute(routeToDelete.id);
        if (activeRoute?.id === routeToDelete.id) setActiveRoute(null);
      } catch (e) {
        showToast('Erro ao excluir rota.', 'error');
      }
    }
  };

  // Quick statistics helpers
  const getRouteProgress = (route: DeliveryRoute) => {
    const total = route.items.length;
    if (total === 0) return 0;
    const completed = route.items.filter(i => i.status !== 'pending').length;
    return Math.round((completed / total) * 100);
  };

  const getGoogleMapsUrl = (route: DeliveryRoute, originOverride?: { lat: number, lng: number }) => {
    if (!route) return '';
    const originCoords = originOverride || route.startCoordinates;
    if (!originCoords) return '';
    const origin = `${originCoords.lat},${originCoords.lng}`;
    
    const order = route.optimizedOrder && route.optimizedOrder.length > 0
      ? route.optimizedOrder
      : route.items.map((_, i) => i);

    const stopsCoords = order.map(itemIdx => {
      const item = route.items[itemIdx];
      if (!item || item.status !== 'pending') return null;
      const client = clients.find(c => c.id === item.clientId);
      if (client && client.coordinates) {
        return `${client.coordinates.lat},${client.coordinates.lng}`;
      }
      return null;
    }).filter(Boolean) as string[];

    if (stopsCoords.length === 0) return '';

    let destination = '';
    let waypoints = '';

    if (stopsCoords.length === 1) {
      destination = stopsCoords[0];
    } else {
      destination = stopsCoords[stopsCoords.length - 1];
      waypoints = stopsCoords.slice(0, -1).join('|');
    }

    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    return url;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      {/* LEFT PANEL: Routes Selector, Builder, or Active Route */}
      <div className="flex flex-col w-full lg:w-7/12 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 overflow-hidden h-full flex-shrink-0">
        
        {/* State 1: Active Route Driver View */}
        {activeRoute ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                  Em Trânsito
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-1">{activeRoute.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Partindo de: {activeRoute.startAddress.substring(0, 45)}...</p>
              </div>
              <div className="flex gap-2">
                {getGoogleMapsUrl(activeRoute) && (
                  <button
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const url = getGoogleMapsUrl(activeRoute, {
                              lat: position.coords.latitude,
                              lng: position.coords.longitude
                            });
                            if (url) window.open(url, '_blank');
                          },
                          (error) => {
                            console.error(error);
                            showToast('Para usar sua localização, por favor ative o GPS.', 'error');
                            // Fallback to route's original start if geolocation fails
                            const url = getGoogleMapsUrl(activeRoute);
                            if (url) window.open(url, '_blank');
                          }
                        );
                      } else {
                        showToast('Geolocalização não suportada.', 'error');
                        // Fallback to route's original start if geolocation not supported
                        const url = getGoogleMapsUrl(activeRoute);
                        if (url) window.open(url, '_blank');
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                    title="Abrir rota completa otimizada no Google Maps a partir da sua localização"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Abrir no GPS</span>
                  </button>
                )}
                <button
                  onClick={() => handleCompleteRoute(activeRoute)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Concluir Rota</span>
                </button>
                <button
                  onClick={() => setRouteToCancel(activeRoute)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setActiveRoute(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center text-xs text-slate-500 font-bold mb-1.5">
                <span>Progresso das Entregas</span>
                <span>{getRouteProgress(activeRoute)}% concluído</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${getRouteProgress(activeRoute)}%` }}
                />
              </div>
            </div>

            {/* List of ordered client stops */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sequência Otimizada de Paradas (Vias Rápidas)</h3>
              
              {(() => {
                const order = activeRoute.optimizedOrder && activeRoute.optimizedOrder.length > 0
                  ? activeRoute.optimizedOrder
                  : activeRoute.items.map((_, i) => i);

                return order.map((itemIdx, sequenceNumber) => {
                  const item = activeRoute.items[itemIdx];
                  const client = clients.find(c => c.id === item.clientId);
                  if (!client) return null;

                  return (
                    <div 
                      key={itemIdx}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        item.status === 'delivered' ? 'border-emerald-200 bg-emerald-50/20' :
                        item.status === 'failed' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-150 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Circle sequence identifier */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border-2 ${
                            item.status === 'delivered' ? 'bg-emerald-600 border-white text-white' :
                            item.status === 'failed' ? 'bg-rose-600 border-white text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}>
                            {sequenceNumber + 1}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{client.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                <span>{client.address}</span>
                              </p>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 rounded font-bold text-[9px] flex items-center gap-0.5 shrink-0 border border-indigo-100 transition-colors"
                                title="Abrir este endereço específico no Google Maps"
                              >
                                <span>Navegar</span>
                              </a>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 font-semibold">
                              Telefone: <span className="text-slate-600">{client.phone}</span>
                            </p>

                            {/* Products to deliver */}
                            <div className="mt-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Mercadorias a entregar:</p>
                              <div className="space-y-1">
                                {item.items.map((prod, pIdx) => (
                                  <div key={pIdx} className="flex justify-between text-xs text-slate-600">
                                    <span>• {prod.productName}</span>
                                    <span className="font-bold text-slate-800">{prod.quantity} un</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {item.status === 'failed' && item.failedReason && (
                              <p className="text-xs text-rose-700 font-bold mt-2 italic bg-rose-50 px-2 py-1 rounded border border-rose-100">
                                Motivo do fracasso: "{item.failedReason}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stop Action Buttons */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0 self-center">
                          {item.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleStopSuccess(itemIdx, item.items)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Entregue</span>
                              </button>
                              <button
                                onClick={() => {
                                  setFailingStopIdx(itemIdx);
                                  setFailReason('');
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition-colors flex items-center justify-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Falhou</span>
                              </button>
                            </>
                          ) : item.status === 'delivered' ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded">
                              <CheckCircle2 className="w-4 h-4" /> Entregue
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-100 px-2 py-1 rounded">
                              <XCircle className="w-4 h-4" /> Falhou
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : isCreating ? (
          
          /* State 2: Create a Route Builder Form */
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                <Truck className="w-5 h-5 text-indigo-600" />
                <span>Nova Rota de Entrega</span>
              </h2>
              <button 
                onClick={() => {
                  setIsCreating(false);
                  setErrorMessage('');
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold"
              >
                Voltar
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 bg-rose-50 text-rose-700 text-xs font-medium rounded-xl border border-rose-100">
                {errorMessage}
              </div>
            )}

            <div className="flex-grow overflow-y-auto pr-1 space-y-4">
              {/* Route Name */}
              <div>
                <label htmlFor="route-name-input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome Identificador da Rota <span className="text-rose-500">*</span>
                </label>
                <input
                  id="route-name-input"
                  type="text"
                  placeholder="Ex: Rota Sul - Lote de Alimentos"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-xs"
                />
              </div>

              {/* Start point Depot Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Localização de Partida <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setStartCoords({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                          });
                          setStartAddress('Minha localização atual');
                        },
                        (error) => {
                          console.error(error);
                          showToast('Não foi possível obter sua localização. Por favor, ative o GPS.', 'error');
                        }
                      );
                    } else {
                      showToast('Geolocalização não suportada.', 'error');
                    }
                  }}
                  className="w-full px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200"
                >
                  Usar minha localização atual
                </button>
                {startAddress === 'Minha localização atual' && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">Localização capturada com sucesso!</p>
                )}
              </div>

              {/* STOP BUILDER BOX (Choose client -> choose products -> add stop) */}
              <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100/70 space-y-3.5">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider border-b border-indigo-100 pb-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Adicionar Parada de Entrega</span>
                </h4>

                {/* Select Client */}
                <div>
                  <label htmlFor="stop-client" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecione o Cliente</label>
                  <select
                    id="stop-client"
                    value={currentClientStopId}
                    onChange={(e) => {
                      setCurrentClientStopId(e.target.value);
                      setCurrentStopProducts([]); // clear products
                    }}
                    className="w-full px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg outline-none text-xs"
                  >
                    <option value="">Escolha um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} disabled={selectedItems.some(i => i.clientId === c.id)}>
                        {c.name} ({c.address.substring(0, 30)}...)
                      </option>
                    ))}
                  </select>
                </div>

                {currentClientStopId && (
                  <div className="bg-white rounded-lg p-3 border border-indigo-100 space-y-3">
                    {/* Add products to this client stop */}
                    <p className="text-[10px] font-extrabold text-indigo-900 uppercase">Lista de Produtos para {clients.find(c => c.id === currentClientStopId)?.name}:</p>
                    
                    <div className="flex gap-2 flex-wrap items-end">
                      <div className="flex-grow min-w-[140px]">
                        <label htmlFor="stop-product" className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Produto</label>
                        <select
                          id="stop-product"
                          value={currentStopProductId}
                          onChange={(e) => setCurrentStopProductId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg outline-none text-xs"
                        >
                          <option value="">Selecione...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Estoque: {p.stock} un)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-18">
                        <label htmlFor="stop-qty" className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Qtd</label>
                        <input
                          id="stop-qty"
                          type="number"
                          min="1"
                          value={currentStopProductQty}
                          onChange={(e) => setCurrentStopProductQty(parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg outline-none text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddProductToStop}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    {/* Show added products for this client */}
                    {currentStopProducts.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100 font-semibold text-[10px] uppercase">
                              <th className="py-1">Produto</th>
                              <th className="py-1 text-right">Qtd</th>
                              <th className="py-1 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentStopProducts.map((p, pIdx) => {
                              const prod = products.find(pr => pr.id === p.productId);
                              return (
                                <tr key={pIdx} className="border-b border-slate-50">
                                  <td className="py-1.5 font-medium text-slate-700">{prod?.name || 'Produto'}</td>
                                  <td className="py-1.5 text-right font-bold text-slate-800">{p.quantity} un</td>
                                  <td className="py-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setCurrentStopProducts(currentStopProducts.filter((_, idx) => idx !== pIdx))}
                                      className="text-rose-600 hover:text-rose-800 font-bold"
                                    >
                                      Remover
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddStopToRoute}
                  className="w-full py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-xs font-bold rounded-lg transition-colors border border-indigo-200 flex items-center justify-center gap-1.5 shadow-inner"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Parada de Cliente</span>
                </button>
              </div>

              {/* Added Client Stops List */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paradas Cadastradas na Rota ({selectedItems.length})</h4>
                  <div className="space-y-2">
                    {selectedItems.map((item, idx) => {
                      const client = clients.find(c => c.id === item.clientId);
                      return (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800">{client?.name || 'Cliente'}</p>
                            <p className="text-[10px] text-slate-500 truncate">{client?.address}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.items.map((prod, pIdx) => (
                                <span key={pIdx} className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                  {prod.productName} ({prod.quantity})
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"
                            title="Remover Parada"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRoute}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-100"
              >
                Gerar Rota Otimizada
              </button>
            </div>
          </div>
        ) : (
          
          /* State 3: List of all saved routes */
          <div className="flex flex-col h-full overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Rotas de Entrega</h2>
                <p className="text-sm text-slate-500 font-medium">Calcule e acompanhe o fluxo logístico</p>
              </div>
              <button
                onClick={() => {
                  if (clients.length === 0) {
                    showToast('Cadastre clientes primeiro para criar uma rota.', 'error');
                    return;
                  }
                  if (products.length === 0) {
                    showToast('Cadastre produtos primeiro para criar entregas.', 'error');
                    return;
                  }
                  setIsCreating(true);
                  setRouteName('');
                  setSelectedItems([]);
                  setErrorMessage('');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 transition-colors duration-200 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Rota</span>
              </button>
            </div>

            {/* List of Routes */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-3">
              {routes.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Navigation className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-slate-500 text-sm font-medium">Nenhuma rota de entrega agendada.</p>
                  <p className="text-slate-400 text-xs mt-1">Crie uma nova rota para despachar produtos aos clientes!</p>
                </div>
              ) : (
                routes.map((route) => {
                  const progress = getRouteProgress(route);
                  const isPending = route.status === 'pending';
                  const isInProgress = route.status === 'in_progress';
                  const isCompleted = route.status === 'completed';

                  return (
                    <div 
                      key={route.id}
                      className={`p-4 bg-white hover:bg-slate-50/40 border rounded-xl transition-all duration-200 ${
                        isInProgress ? 'border-indigo-400 bg-indigo-50/10' :
                        isCompleted ? 'border-emerald-200' : 'border-slate-150'
                      }`}
                    >
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800 text-sm truncate">{route.name}</h3>
                            <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                              isInProgress ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isInProgress ? 'Em trânsito' : isCompleted ? 'Concluída' : 'Pendente'}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                              <Calendar className="w-3 h-3" /> {route.date}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500">
                            Ponto de Partida: <span className="font-semibold">{route.startAddress.substring(0, 40)}...</span>
                          </p>

                          <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2 flex-wrap">
                            <p>
                              Paradas de Clientes: <span className="font-bold text-slate-700">{route.items.length}</span>
                            </p>
                            <p>
                              Progresso: <span className="font-bold text-indigo-600">{progress}%</span>
                            </p>
                          </div>
                        </div>

                        {/* Route Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 self-center">
                          {isPending ? (
                            <button
                              onClick={() => handleStartRouteExecution(route)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-100"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Iniciar</span>
                            </button>
                          ) : isInProgress ? (
                            <button
                              onClick={() => setActiveRoute(route)}
                              className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Map className="w-3.5 h-3.5" />
                              <span>Executar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setActiveRoute(route)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span>Visualizar</span>
                            </button>
                          )}

                          {getGoogleMapsUrl(route) && (
                            <button
                              onClick={() => {
                                if (navigator.geolocation) {
                                  navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                      const url = getGoogleMapsUrl(route, {
                                        lat: position.coords.latitude,
                                        lng: position.coords.longitude
                                      });
                                      if (url) window.open(url, '_blank');
                                    },
                                    (error) => {
                                      console.error(error);
                                      showToast('Para usar sua localização, por favor ative o GPS.', 'error');
                                      const url = getGoogleMapsUrl(route);
                                      if (url) window.open(url, '_blank');
                                    }
                                  );
                                } else {
                                  showToast('Geolocalização não suportada.', 'error');
                                  const url = getGoogleMapsUrl(route);
                                  if (url) window.open(url, '_blank');
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Abrir Rota Completa no Google Maps a partir da sua localização"
                            >
                              <Navigation className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setRouteToDelete({ id: route.id, name: route.name })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Deletar Rota"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Micro Progress Line */}
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-3 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`} 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Map View Visualizing Selected / Active Route / Clients */}
      <div className="w-full lg:w-5/12 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-[300px] lg:h-full flex flex-col">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center no-select">
          <div className="flex items-center gap-1.5">
            <Map className="w-4.5 h-4.5 text-indigo-600" />
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Painel Logístico Interativo</span>
          </div>
          {activeRoute && (
            <span className="text-[10px] bg-indigo-600 text-white font-bold rounded px-1.5 py-0.5 animate-pulse">
              Ativo
            </span>
          )}
        </div>
        <div className="flex-grow relative h-full">
          <MapComponent
            clients={clients}
            activeRoute={
              activeRoute 
                ? { ...activeRoute, items: activeRoute.items.filter(item => item && item.status === 'pending') }
                : (isCreating ? {
                    id: 'temp',
                    name: routeName || 'Nova Rota Temp',
                    status: 'pending',
                    date: '',
                    startAddress,
                    startCoordinates: startCoords,
                    items: selectedItems,
                    optimizedOrder: calculateOptimizedOrder(startCoords, selectedItems),
                    createdAt: ''
                  } : null)
            }
            heightClass="h-full"
          />
        </div>
      </div>

      {/* Failure Reason Dialog (Modal Overlay) */}
      {failingStopIdx !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-6 animate-zoom-in">
            <h4 className="font-bold text-slate-800 text-base mb-2">Registrar Falha na Entrega</h4>
            <p className="text-xs text-slate-500 mb-4">Selecione ou escreva o motivo pelo qual a entrega falhou (isso não removerá os produtos do estoque):</p>
            
            <textarea
              required
              rows={3}
              placeholder="Ex: Estabelecimento fechado, Cliente ausente, Recusa do destinatário..."
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-xs resize-none mb-4"
            />

            <div className="flex gap-3 justify-end text-xs font-bold">
              <button
                onClick={() => {
                  setFailingStopIdx(null);
                  setFailReason('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStopFailed}
                disabled={!failReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg transition-colors shadow-md shadow-rose-100"
              >
                Salvar Falha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Cancelamento da Rota */}
      <ConfirmModal
        isOpen={routeToCancel !== null}
        onClose={() => setRouteToCancel(null)}
        onConfirm={handleCancelRouteConfirm}
        title="Cancelar Rota de Entrega"
        message="Tem certeza que deseja cancelar esta rota? O estoque entregue não será desfeito automaticamente nas transações já efetuadas."
        confirmText="Sim, Cancelar"
        cancelText="Voltar"
        isDestructive={true}
      />

      {/* Modal para Confirmar Exclusão de Rota */}
      <ConfirmModal
        isOpen={routeToDelete !== null}
        onClose={() => setRouteToDelete(null)}
        onConfirm={handleDeleteRouteConfirm}
        title="Excluir Rota"
        message={`Deseja excluir a rota "${routeToDelete?.name}" permanentemente? Esta ação removerá a rota do sistema.`}
        confirmText="Excluir Rota"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </div>
  );
}

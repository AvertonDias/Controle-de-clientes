import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Client, Product, DeliveryRoute, StockMovement, MovementType, UserProfile } from './types';

// Auth Screen Component
import AuthScreen from './components/AuthScreen';
import OnboardingScreen from './components/OnboardingScreen';
import ProfileModal from './components/ProfileModal';
import InstallPwaModal from './components/InstallPwaModal';

// Tab components
import DashboardTab from './components/DashboardTab';
import ClientsTab from './components/ClientsTab';
import ProductsTab from './components/ProductsTab';
import StockTab from './components/StockTab';
import DeliveriesTab from './components/DeliveriesTab';

// Lucide icons
import { 
  Compass, LayoutDashboard, Users, Package, History, Truck, Menu, Sparkles, LogOut,
  AlertCircle, Settings, ShieldAlert, Copy, Check
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'products' | 'stock' | 'deliveries'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Core collections state
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Database and rules error states (helpful for custom user projects)
  const [dbError, setDbError] = useState<string | null>(null);
  const [showDbHelp, setShowDbHelp] = useState(true);
  const [copiedRules, setCopiedRules] = useState(false);

  // Listen to Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubAuth;
  }, []);

  // Firestore listeners - ONLY run if user is logged in
  useEffect(() => {
    if (!user) {
      setClients([]);
      setProducts([]);
      setRoutes([]);
      setMovements([]);
      setProfile(null);
      setProfileLoading(true);
      setLoading(false);
      setDbError(null);
      return;
    }

    setLoading(true);
    setDbError(null);

    // 1. Listen to Clients
    const unsubClients = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const list: Client[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Client);
        });
        // Sort by name
        list.sort((a, b) => a.name.localeCompare(b.name));
        setClients(list);
        setDbError(null);
      },
      (error) => {
        console.error("Firestore error on clients collection:", error);
        setDbError(error.message || String(error));
        setLoading(false);
      }
    );

    // 2. Listen to Products
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Product);
        });
        // Sort by name
        list.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(list);
        setDbError(null);
      },
      (error) => {
        console.error("Firestore error on products collection:", error);
        setDbError(error.message || String(error));
        setLoading(false);
      }
    );

    // 3. Listen to Delivery Routes
    const unsubRoutes = onSnapshot(
      collection(db, 'routes'),
      (snapshot) => {
        const list: DeliveryRoute[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as DeliveryRoute);
        });
        // Sort by creation date descending
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRoutes(list);
        setDbError(null);
      },
      (error) => {
        console.error("Firestore error on routes collection:", error);
        setDbError(error.message || String(error));
        setLoading(false);
      }
    );

    // 4. Listen to Stock Movements
    const unsubMovements = onSnapshot(
      query(collection(db, 'movements'), orderBy('date', 'desc')),
      (snapshot) => {
        const list: StockMovement[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as StockMovement);
        });
        setMovements(list);
        setLoading(false);
        setDbError(null);
      },
      (error) => {
        console.error("Firestore error on movements collection:", error);
        setDbError(error.message || String(error));
        setLoading(false);
      }
    );

    // 5. Listen to User Profile
    const unsubProfile = onSnapshot(
      doc(db, 'profiles', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      },
      (error) => {
        console.error("Firestore error on user profile:", error);
        setProfileLoading(false);
      }
    );

    return () => {
      unsubClients();
      unsubProducts();
      unsubRoutes();
      unsubMovements();
      unsubProfile();
    };
  }, [user]);


  // CLIENT ACTIONS
  const handleAddClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    await addDoc(collection(db, 'clients'), {
      ...clientData,
      createdAt: new Date().toISOString()
    });
  };

  const handleUpdateClient = async (id: string, clientData: Partial<Client>) => {
    await updateDoc(doc(db, 'clients', id), clientData);
  };

  const handleDeleteClient = async (id: string) => {
    await deleteDoc(doc(db, 'clients', id));
  };

  // PRODUCT ACTIONS
  const handleAddProduct = async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    let sku = productData.sku;
    if (!sku || sku.trim() === '') {
      // Auto generate SKU based on product name and timestamp to avoid collisions
      sku = productData.name.substring(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-4);
    }

    const batch = writeBatch(db);
    const prodRef = doc(collection(db, 'products'));
    
    // 1. Add Product
    batch.set(prodRef, {
      ...productData,
      sku,
      createdAt: new Date().toISOString()
    });

    // 2. If initial stock > 0, log movement
    if (productData.stock > 0) {
      const movRef = doc(collection(db, 'movements'));
      batch.set(movRef, {
        productId: prodRef.id,
        productName: productData.name,
        type: 'entry' as const,
        quantity: productData.stock,
        date: new Date().toISOString(),
        observation: 'Estoque inicial cadastrado'
      });
    }

    await batch.commit();
  };

  const handleUpdateProduct = async (id: string, productData: Partial<Product>) => {
    await updateDoc(doc(db, 'products', id), productData);
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteDoc(doc(db, 'products', id));
  };

  // QUICK STOCK ADJUST (Directly creates a movement and changes product stock level)
  const handleQuickStockAdjust = async (id: string, currentStock: number, change: number, reason: string) => {
    const batch = writeBatch(db);
    const productRef = doc(db, 'products', id);
    const movRef = doc(collection(db, 'movements'));

    const productObj = products.find(p => p.id === id);
    if (!productObj) return;

    const newStock = currentStock + change;

    // Save product stock update
    batch.update(productRef, { stock: newStock });

    // Save history log movement
    batch.set(movRef, {
      productId: id,
      productName: productObj.name,
      type: change > 0 ? 'entry' as const : 'exit' as const,
      quantity: Math.abs(change),
      date: new Date().toISOString(),
      observation: reason
    });

    await batch.commit();
  };

  // GENERAL MANUAL STOCK MOVEMENTS
  const handleAddMovement = async (productId: string, type: MovementType, quantity: number, observation: string) => {
    const batch = writeBatch(db);
    const productRef = doc(db, 'products', productId);
    const movRef = doc(collection(db, 'movements'));

    const productObj = products.find(p => p.id === productId);
    if (!productObj) throw new Error('Produto não encontrado');

    const isAddition = ['entry', 'return'].includes(type);
    const multiplier = isAddition ? 1 : -1;
    const newStock = productObj.stock + (quantity * multiplier);

    if (newStock < 0) {
      throw new Error('O estoque resultante não pode ser negativo');
    }

    // 1. Update stock count
    batch.update(productRef, { stock: newStock });

    // 2. Add history transaction log
    batch.set(movRef, {
      productId,
      productName: productObj.name,
      type,
      quantity,
      date: new Date().toISOString(),
      observation
    });

    await batch.commit();
  };

  // ROUTE ACTIONS
  const handleAddRoute = async (routeData: Omit<DeliveryRoute, 'id' | 'createdAt'>) => {
    await addDoc(collection(db, 'routes'), {
      ...routeData,
      createdAt: new Date().toISOString()
    });
  };

  const handleUpdateRoute = async (id: string, routeData: Partial<DeliveryRoute>) => {
    await updateDoc(doc(db, 'routes', id), routeData);
  };

  const handleDeleteRoute = async (id: string) => {
    await deleteDoc(doc(db, 'routes', id));
  };

  // COMPLETE INDIVIDUAL STOP ON DELIVERY ROUTE
  // DEDUCTS STOCK UPON DELIVERED ACTION! Full integration achieved here.
  const handleDeliverStop = async (routeId: string, clientIdx: number, stopItems: { productId: string, quantity: number }[]) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) throw new Error('Rota não encontrada');

    // Load active product stocks to double check availability
    const batch = writeBatch(db);

    for (const item of stopItems) {
      const liveProd = products.find(p => p.id === item.productId);
      if (!liveProd) {
        throw new Error(`Produto id ${item.productId} não foi localizado no catálogo para dedução.`);
      }

      if (liveProd.stock < item.quantity) {
        throw new Error(`Inconsistência: estoque insuficiente para deduzir ${item.quantity} un de ${liveProd.name}. Estoque atual: ${liveProd.stock} un`);
      }

      // 1. Subtract stock
      const productRef = doc(db, 'products', item.productId);
      batch.update(productRef, { stock: liveProd.stock - item.quantity });

      // 2. Create audit stock log for this delivery
      const movRef = doc(collection(db, 'movements'));
      batch.set(movRef, {
        productId: item.productId,
        productName: liveProd.name,
        type: 'delivery' as const,
        quantity: item.quantity,
        date: new Date().toISOString(),
        observation: `Entrega na rota: ${route.name}`,
        routeId
      });
    }

    // 3. Mark stop as delivered in the route document
    const updatedStops = [...route.items];
    updatedStops[clientIdx] = {
      ...updatedStops[clientIdx],
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    };

    const routeRef = doc(db, 'routes', routeId);
    batch.update(routeRef, { items: updatedStops });

    await batch.commit();
  };

  // MARK INDIVIDUAL STOP AS FAILED ON ROUTE
  // Does NOT subtract stock since goods were not handed over
  const handleFailStop = async (routeId: string, clientIdx: number, reason: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) throw new Error('Rota não encontrada');

    const updatedStops = [...route.items];
    updatedStops[clientIdx] = {
      ...updatedStops[clientIdx],
      status: 'failed',
      failedReason: reason
    };

    await updateDoc(doc(db, 'routes', routeId), { items: updatedStops });
  };

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'stock', label: 'Movimentações', icon: History },
    { id: 'deliveries', label: 'Rotas', icon: Truck },
  ] as const;

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 font-sans">
        <div className="p-4 bg-indigo-600 rounded-3xl animate-bounce shadow-xl shadow-indigo-600/20">
          <Compass className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="text-center">
          <h2 className="text-white font-bold text-lg tracking-tight">LogEstoque</h2>
          <p className="text-slate-400 text-xs mt-1 font-medium animate-pulse">
            {authLoading ? "Autenticando sessão..." : "Carregando perfil..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (user && (!profile || !profile.completedOnboarding)) {
    return <OnboardingScreen user={user} onComplete={(newProf) => setProfile(newProf)} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans no-select antialiased">
      {/* 1. SIDEBAR (Hidden on mobile, beautiful on PC) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white flex-shrink-0 border-r border-slate-800">
        <div className="p-6 flex items-center gap-2 border-b border-slate-800">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight leading-none text-indigo-400 uppercase">LogEstoque</h1>
            <p className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase mt-0.5">PWA Inteligente</p>
          </div>
        </div>

        {/* Desktop nav links */}
        <nav className="flex-grow p-4 space-y-1" aria-label="Navegação Principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-tight transition-all duration-150 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile and Logout */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 p-2 hover:bg-slate-800/60 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-800"
            title="Clique para editar seu perfil"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={profile?.fullName || user.displayName || 'User'} className="w-10 h-10 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-indigo-400 font-bold uppercase text-sm">
                {(profile?.fullName || user?.email || 'US').slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 flex-grow">
              <p className="text-xs font-bold text-white truncate">{profile?.fullName || user?.displayName || 'Usuário'}</p>
              <p className="text-[10px] text-slate-500 truncate">{profile?.companyName || user?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-rose-900/20 hover:text-rose-400 text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer select-none"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <p className="font-bold">Sistema Logístico Integrado</p>
          <p className="mt-0.5">v1.2.0 (Offline Cache Active)</p>
        </div>
      </aside>

      {/* 2. MAIN APP SHELL CONTENT */}
      <div className="flex flex-col flex-grow min-w-0 h-full relative">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between px-4 py-3.5 bg-slate-900 text-white shadow-md flex-shrink-0 z-30">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-400" />
            <h1 className="font-black text-sm tracking-tight leading-none uppercase">LogEstoque</h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            aria-label="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Expanded Navigation overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div 
              className="absolute right-0 top-0 bottom-0 w-64 bg-slate-900 text-white p-6 shadow-2xl flex flex-col space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <span className="font-bold text-xs uppercase tracking-widest text-indigo-400">Navegar</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-xs text-slate-400 hover:text-white">Fechar</button>
              </div>
              <nav className="space-y-1.5" aria-label="Navegação Mobile">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-tight transition-all ${
                        isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile User Profile & Logout */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div 
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
                  title="Clique para editar seu perfil"
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={profile?.fullName || user.displayName || 'User'} className="w-10 h-10 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-indigo-400 font-bold uppercase text-sm">
                      {(profile?.fullName || user?.email || 'US').slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-grow">
                    <p className="text-xs font-bold text-white truncate">{profile?.fullName || user?.displayName || 'Usuário'}</p>
                    <p className="text-[10px] text-slate-500 truncate">{profile?.companyName || user?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    signOut(auth);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800/60 hover:bg-rose-900/20 hover:text-rose-400 text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer select-none"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. ACTIVE SUBCOMPONENT CONTAINER VIEW */}
        <main className="flex-grow p-4 md:p-6 overflow-y-auto h-full flex flex-col">
          {dbError && (
            <div className="mb-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-xl flex-shrink-0 z-20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <div className="flex-grow">
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider">Acesso ao Firestore Negado ou Restrito</h4>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                    Seu banco de dados do Firestore está recusando leituras. Isso acontece se você estiver usando um projeto próprio do Firebase e ainda não configurou as regras de acesso.
                  </p>
                </div>
                <button
                  onClick={() => setShowDbHelp(!showDbHelp)}
                  className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  {showDbHelp ? 'Ocultar Guia' : 'Como Corrigir?'}
                </button>
              </div>

              {showDbHelp && (
                <div className="mt-2 border-t border-slate-800/60 pt-3 space-y-3">
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Para resolver, vá no seu <strong>Console do Firebase &gt; Firestore Database &gt; Rules</strong>, substitua as regras existentes por estas regras de desenvolvimento e publique-as:
                  </p>
                  <div className="relative font-mono">
                    <pre className="bg-slate-950 p-3 rounded-xl text-indigo-300 text-[10px] leading-relaxed border border-slate-800 overflow-x-auto max-h-[140px] select-all">
                      {`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`);
                        setCopiedRules(true);
                        setTimeout(() => setCopiedRules(false), 2000);
                      }}
                      className="absolute right-2 top-2 p-1.5 bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 rounded-lg transition-colors cursor-pointer"
                      title="Copiar Regras"
                    >
                      {copiedRules ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 italic leading-normal">
                    Após atualizar as regras no console do seu Firebase, recarregue a aplicação.
                  </p>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-500 animate-pulse">Sincronizando base offline local...</p>
            </div>
          ) : (
            <div className="h-full">
              {activeTab === 'dashboard' && (
                <DashboardTab
                  products={products}
                  clients={clients}
                  routes={routes}
                  movements={movements}
                  onNavigateToTab={setActiveTab}
                />
              )}
              {activeTab === 'clients' && (
                <ClientsTab
                  clients={clients}
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                />
              )}
              {activeTab === 'products' && (
                <ProductsTab
                  products={products}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onQuickStockAdjust={handleQuickStockAdjust}
                />
              )}
              {activeTab === 'stock' && (
                <StockTab
                  products={products}
                  movements={movements}
                  onAddMovement={handleAddMovement}
                />
              )}
              {activeTab === 'deliveries' && (
                <DeliveriesTab
                  clients={clients}
                  products={products}
                  routes={routes}
                  onAddRoute={handleAddRoute}
                  onUpdateRoute={handleUpdateRoute}
                  onDeleteRoute={handleDeleteRoute}
                  onDeliverStop={handleDeliverStop}
                  onFailStop={handleFailStop}
                  profile={profile}
                />
              )}
            </div>
          )}
        </main>

        {/* 4. MOBILE BOTTOM TAB NAVIGATION (Sleek Native feel on iOS/Android PWAs) */}
        <nav 
          className="md:hidden flex justify-around bg-slate-900 border-t border-slate-800 py-2.5 px-2 text-white flex-shrink-0 z-30"
          aria-label="Navegação Rápida de Abas"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'text-indigo-400' : 'text-slate-400'
                }`}
                style={{ width: '20%' }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {profile && (
        <ProfileModal
          profile={profile}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdate={(updated) => setProfile(updated)}
        />
      )}
      <InstallPwaModal />
    </div>
  );
}

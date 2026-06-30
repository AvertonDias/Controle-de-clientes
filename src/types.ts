export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  weight: number; // in kg
  createdAt: string;
}

export type MovementType = 'entry' | 'exit' | 'return' | 'delivery' | 'adjustment';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number; // always positive in the record, sign determined by type
  date: string;
  observation: string;
  routeId?: string; // linked to delivery route if created by a delivery
}

export interface RouteItem {
  clientId: string;
  status: 'pending' | 'delivered' | 'failed';
  failedReason?: string;
  deliveredAt?: string;
  // Products to deliver to this client on this route
  items: {
    productId: string;
    productName: string;
    quantity: number;
  }[];
}

export interface DeliveryRoute {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  date: string;
  startAddress: string;
  startCoordinates: {
    lat: number;
    lng: number;
  };
  items: RouteItem[];
  optimizedOrder: number[]; // indices of items in the optimized visiting order
  createdAt: string;
  completedAt?: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  phone: string;
  cpf: string;
  role: string;
  companyName: string;
  cnpj: string;
  companyAddress: string;
  companyCoordinates?: {
    lat: number;
    lng: number;
  };
  segment: string;
  completedOnboarding: boolean;
  updatedAt: string;
}

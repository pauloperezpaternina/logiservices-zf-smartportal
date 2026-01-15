export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  companyName: string;
}

export type ShipmentStatus = 'In Transit' | 'In Warehouse' | 'Dispatched' | 'Customs';

export interface Shipment {
  id: string;
  blNumber: string;
  invoiceNumber: string;
  vcesCode: string;
  status: ShipmentStatus;
  arrivalDate: string;
  clientName: string;
  items: ShipmentItem[];
  documents: Document[];
}

export interface ShipmentItem {
  id: string;
  description: string;
  quantity: number;
  weight: number;
}

export interface Document {
  id: string;
  name: string;
  type: 'BL' | 'Invoice' | 'Other';
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Warehouse {
  id: string;
  nombre: string;
  codigo: string;
  ubicacion: string;
}

export interface InventoryItem {
  id: string;
  bodega_id: string;
  d_orden_id: string;
  cantidad_bultos: number;
  peso_actual: number;
  updated_at: string;
  // Joins
  bodega?: Warehouse;
  d_orden?: any; // We can refine this if we export DOrden interface
}

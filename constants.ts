import { Shipment } from './types';

export const MOCK_USER = {
  id: 'u1',
  email: 'admin@logiservices.com',
  role: 'admin' as const,
  companyName: 'Logiservices ZF',
};

export const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: 's1',
    blNumber: 'BL-987654',
    invoiceNumber: 'INV-2024-001',
    vcesCode: 'VCES-X99',
    status: 'In Warehouse',
    arrivalDate: '2024-05-15',
    clientName: 'Importaciones Colombia SAS',
    items: [
      { id: 'i1', description: 'Electronic Components', quantity: 500, weight: 250 },
    ],
    documents: [],
  },
  {
    id: 's2',
    blNumber: 'BL-123456',
    invoiceNumber: 'INV-2024-045',
    vcesCode: 'VCES-A12',
    status: 'In Transit',
    arrivalDate: '2024-05-20',
    clientName: 'TechSolutions Ltda',
    items: [
      { id: 'i2', description: 'Laptops', quantity: 100, weight: 200 },
    ],
    documents: [],
  },
  {
    id: 's3',
    blNumber: 'BL-555888',
    invoiceNumber: 'INV-2024-099',
    vcesCode: 'VCES-B55',
    status: 'Dispatched',
    arrivalDate: '2024-05-10',
    clientName: 'AutoParts Global',
    items: [
      { id: 'i3', description: 'Spare Tires', quantity: 50, weight: 500 },
    ],
    documents: [],
  }
];

export const STATUS_COLORS: Record<string, string> = {
  'In Transit': 'bg-blue-100 text-blue-800',
  'In Warehouse': 'bg-brand-yellow/20 text-yellow-800',
  'Dispatched': 'bg-green-100 text-green-800',
  'Customs': 'bg-red-100 text-red-800',
};
export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'operator';
  createdAt: string;
}

export type CustomerStatus = 'aktif' | 'putus' | 'isolir';

export interface Package {
  id: string;
  name: string;
  speed: string; // "5Mbps", "10Mbps", etc.
  price: number; // in IDR
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  packageId: string; // Reference to Package.id
  status: CustomerStatus;
  odpCode: string; // Kode ODP, e.g. ODP-TVA-01
  joinDate: string; // YYYY-MM-DD
  prorateAmountFirstMonth: number; // Prorated price paid or to be paid for first month
  ktpImage?: string; // Base64 or mock URL
  houseImage?: string; // Base64 or mock URL
  latitude?: number;
  longitude?: number;
  pppoeUsername?: string;
  pppoePassword?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  category: 'tagihan' | 'prorate' | 'operasional' | 'alat' | 'lainnya';
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: 'cash' | 'transfer';
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  billingMonth: string; // YYYY-MM
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'lunas' | 'belum_bayar' | 'terlambat';
  paymentDate?: string;
}

export interface MikrotikConfig {
  host: string;
  port: number;
  username: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastLog?: string;
}

export interface Product {
  id: string;
  name: string;
  company: string;
  unit: 'kg' | 'box' | 'pallet';
  boxWeight?: number;
  palletWeight?: number;
  boxesPerPallet?: number;
  quantity: number;
  totalWeight: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  totalWeight: number;
  date: Date;
  note?: string;
}

export interface UserPermissions {
  canAddProducts: boolean;
  canDeleteProducts: boolean;
  canManageTransactions: boolean;
  canViewReports: boolean;
}

export interface User {
  uid: string;
  email: string;
  permissions: UserPermissions;
  createdAt: Date;
}
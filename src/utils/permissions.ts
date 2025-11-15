export type UserRole = 'admin' | 'manager' | 'accounts' | 'frontdesk';

export type Permission = 'read' | 'create' | 'update' | 'delete';

export type ModuleName =
  | 'dashboard'
  | 'overhead'
  | 'expenses'
  | 'pricing'
  | 'seasons'
  | 'rates'
  | 'promos'
  | 'package-config'
  | 'packages'
  | 'bookings'
  | 'guests'
  | 'notifications'
  | 'users';

interface RolePermissions {
  [key: string]: Permission[];
}

const PERMISSIONS_MATRIX: Record<ModuleName, RolePermissions> = {
  dashboard: {
    admin: ['read'],
    manager: ['read'],
    accounts: ['read'],
    frontdesk: ['read'],
  },
  overhead: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read'],
    frontdesk: [],
  },
  expenses: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read', 'create', 'update', 'delete'],
    frontdesk: [],
  },
  pricing: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read'],
    frontdesk: ['read'],
  },
  seasons: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read'],
    frontdesk: [],
  },
  rates: {
    admin: ['read'],
    manager: ['read'],
    accounts: ['read'],
    frontdesk: ['read'],
  },
  promos: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read'],
    frontdesk: [],
  },
  'package-config': {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read'],
    frontdesk: [],
  },
  packages: {
    admin: ['read'],
    manager: ['read'],
    accounts: ['read'],
    frontdesk: ['read'],
  },
  bookings: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read'],
    frontdesk: ['read', 'create', 'update'],
  },
  guests: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read'],
    frontdesk: ['read', 'create', 'update'],
  },
  notifications: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read', 'create', 'update', 'delete'],
    accounts: ['read'],
    frontdesk: ['read', 'create', 'update'],
  },
  users: {
    admin: ['read', 'create', 'update', 'delete'],
    manager: ['read'],
    accounts: [],
    frontdesk: [],
  },
};

export function hasPermission(
  role: UserRole | null,
  module: ModuleName,
  permission: Permission
): boolean {
  if (!role) return false;

  const modulePermissions = PERMISSIONS_MATRIX[module];
  if (!modulePermissions) return false;

  const rolePermissions = modulePermissions[role];
  if (!rolePermissions) return false;

  return rolePermissions.includes(permission);
}

export function canAccessModule(role: UserRole | null, module: ModuleName): boolean {
  if (!role) return false;

  const modulePermissions = PERMISSIONS_MATRIX[module];
  if (!modulePermissions) return false;

  const rolePermissions = modulePermissions[role];
  return rolePermissions && rolePermissions.length > 0;
}

export function canRead(role: UserRole | null, module: ModuleName): boolean {
  return hasPermission(role, module, 'read');
}

export function canCreate(role: UserRole | null, module: ModuleName): boolean {
  return hasPermission(role, module, 'create');
}

export function canUpdate(role: UserRole | null, module: ModuleName): boolean {
  return hasPermission(role, module, 'update');
}

export function canDelete(role: UserRole | null, module: ModuleName): boolean {
  return hasPermission(role, module, 'delete');
}

export function canModify(role: UserRole | null, module: ModuleName): boolean {
  return canCreate(role, module) || canUpdate(role, module);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    accounts: 'Accounts',
    frontdesk: 'Front Desk',
  };
  return labels[role];
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full access to all features',
    manager: 'Full access except user management',
    accounts: 'Financial modules and reports',
    frontdesk: 'Bookings, guests, and pricing view',
  };
  return descriptions[role];
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'text-purple-600',
    manager: 'text-blue-600',
    accounts: 'text-emerald-600',
    frontdesk: 'text-orange-600',
  };
  return colors[role];
}

export function getRoleBgColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'bg-purple-100',
    manager: 'bg-blue-100',
    accounts: 'bg-emerald-100',
    frontdesk: 'bg-orange-100',
  };
  return colors[role];
}

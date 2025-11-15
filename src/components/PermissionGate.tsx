import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { ModuleName } from '../utils/permissions';
import { ShieldOff } from 'lucide-react';

interface PermissionGateProps {
  resortId: string;
  module: ModuleName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ resortId, module, children, fallback }: PermissionGateProps) {
  const permissions = usePermissions(resortId);

  if (permissions.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading permissions...</div>
      </div>
    );
  }

  if (!permissions.canAccess(module)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <ShieldOff size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">
            You don't have permission to access this module.
          </p>
          <p className="text-sm text-slate-500">
            Your role: <span className="font-semibold">{permissions.userRole || 'None'}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface ReadOnlyWrapperProps {
  resortId: string;
  module: ModuleName;
  children: (canModify: boolean, canDelete: boolean) => React.ReactNode;
}

export function ReadOnlyWrapper({ resortId, module, children }: ReadOnlyWrapperProps) {
  const permissions = usePermissions(resortId);

  const canModify = permissions.canModify(module);
  const canDelete = permissions.canDelete(module);

  return <>{children(canModify, canDelete)}</>;
}

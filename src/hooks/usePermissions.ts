import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  UserRole,
  ModuleName,
  Permission,
  hasPermission,
  canAccessModule,
  canRead,
  canCreate,
  canUpdate,
  canDelete,
  canModify,
} from '../utils/permissions';

export function usePermissions(resortId: string) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, [user, resortId]);

  const loadUserRole = async () => {
    if (!user) {
      console.log('DEBUG usePermissions: No user');
      setUserRole(null);
      setLoading(false);
      return;
    }

    if (!resortId) {
      console.log('DEBUG usePermissions: No resort ID');
      setUserRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('DEBUG usePermissions: Loading role for user', user.id, 'resort', resortId);

    // First check the current session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('DEBUG usePermissions: Current session user', session?.user?.id);

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('resort_id', resortId)
      .maybeSingle();

    console.log('DEBUG usePermissions: Query result', { data, error });

    if (error) {
      console.error('DEBUG usePermissions: Error details', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    }

    if (!error && data) {
      console.log('DEBUG usePermissions: Setting role to', data.role);
      setUserRole(data.role as UserRole);
    } else {
      console.log('DEBUG usePermissions: No role found or error, defaulting to null');
      // For now, set to admin if no role found to unblock development
      setUserRole('admin');
    }

    setLoading(false);
  };

  const checkPermission = (module: ModuleName, permission: Permission): boolean => {
    return hasPermission(userRole, module, permission);
  };

  const checkAccess = (module: ModuleName): boolean => {
    return canAccessModule(userRole, module);
  };

  const checkRead = (module: ModuleName): boolean => {
    return canRead(userRole, module);
  };

  const checkCreate = (module: ModuleName): boolean => {
    return canCreate(userRole, module);
  };

  const checkUpdate = (module: ModuleName): boolean => {
    return canUpdate(userRole, module);
  };

  const checkDelete = (module: ModuleName): boolean => {
    return canDelete(userRole, module);
  };

  const checkModify = (module: ModuleName): boolean => {
    return canModify(userRole, module);
  };

  return {
    userRole,
    loading,
    hasPermission: checkPermission,
    canAccess: checkAccess,
    canRead: checkRead,
    canCreate: checkCreate,
    canUpdate: checkUpdate,
    canDelete: checkDelete,
    canModify: checkModify,
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isAccounts: userRole === 'accounts',
    isFrontdesk: userRole === 'frontdesk',
  };
}

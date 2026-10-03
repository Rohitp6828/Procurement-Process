import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Profile } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextType {
  user: Profile;
  roles: UserRole[];
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  selectedProjectId: string; // 'ALL' or specific project ID
  setSelectedProjectId: (id: string) => void;
  hasPermission: (module: string, action: string) => boolean;
  isSupabaseLive: boolean;
  logout: () => void;
}

const DEFAULT_USER: Profile = {
  id: 'usr-admin-2',
  email: 'rohitpotdar6828@gmail.com',
  full_name: 'Rohit Potdar (Director)',
  role_code: 'SUPER_ADMIN',
  phone: '+91 9876543210',
  department: 'Executive Management',
  is_active: true,
};

const ALL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'PROJECT_ENGINEER',
  'SITE_MANAGER',
  'PROCUREMENT_MANAGER',
  'PROCUREMENT_EXECUTIVE',
  'STORE_MANAGER',
  'ACCOUNTS_MANAGER',
  'FINANCE_USER',
  'APPROVER',
  'MANAGEMENT',
  'VIEWER',
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('civprocure_active_role') as UserRole) || 'SUPER_ADMIN';
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [user, setUser] = useState<Profile>(() => {
    return { ...DEFAULT_USER, role_code: currentRole };
  });

  useEffect(() => {
    setUser(prev => ({ ...prev, role_code: currentRole }));
    localStorage.setItem('civprocure_active_role', currentRole);
  }, [currentRole]);

  // Handle Supabase Auth if available
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(prev => ({
            ...prev,
            auth_user_id: session.user.id,
            email: session.user.email || prev.email,
          }));
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(prev => ({
            ...prev,
            auth_user_id: session.user.id,
            email: session.user.email || prev.email,
          }));
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
  };

  // RBAC Permission engine
  const hasPermission = (module: string, action: string): boolean => {
    if (currentRole === 'SUPER_ADMIN') return true;
    if (currentRole === 'VIEWER') return action === 'VIEW' || action === 'EXPORT';

    // Role-specific matrix
    switch (currentRole) {
      case 'ADMIN':
        return true;
      case 'PROJECT_ENGINEER':
        if (['PR', 'PROJECT', 'SITE', 'REPORTS'].includes(module)) return true;
        return action === 'VIEW';
      case 'SITE_MANAGER':
        if (module === 'PR') return ['VIEW', 'CREATE', 'SUBMIT'].includes(action);
        if (module === 'GRN') return true;
        if (['PROJECT', 'SITE'].includes(module)) return action === 'VIEW';
        return action === 'VIEW';
      case 'PROCUREMENT_MANAGER':
        if (['PR', 'RFQ', 'QUOTATION', 'COMPARISON', 'SHORTLIST', 'PO', 'VENDOR', 'REPORTS'].includes(module)) return true;
        return action === 'VIEW';
      case 'PROCUREMENT_EXECUTIVE':
        if (['RFQ', 'QUOTATION', 'COMPARISON', 'PO', 'VENDOR'].includes(module)) {
          return ['VIEW', 'CREATE', 'EDIT', 'SUBMIT'].includes(action);
        }
        return action === 'VIEW';
      case 'STORE_MANAGER':
        if (['GRN', 'DEBIT_NOTE', 'INVENTORY'].includes(module)) return true;
        return action === 'VIEW';
      case 'ACCOUNTS_MANAGER':
        if (['BILL', 'POSTING', 'ADVANCE', 'PAYMENT', 'KNOCKOFF', 'REPORTS', 'DEBIT_NOTE'].includes(module)) return true;
        return action === 'VIEW';
      case 'FINANCE_USER':
        if (['ADVANCE', 'PAYMENT', 'KNOCKOFF', 'BILL', 'REPORTS'].includes(module)) {
          return ['VIEW', 'CREATE', 'EDIT'].includes(action);
        }
        return action === 'VIEW';
      case 'APPROVER':
        return action === 'VIEW' || action === 'APPROVE' || action === 'REJECT';
      case 'MANAGEMENT':
        return true;
      default:
        return action === 'VIEW';
    }
  };

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut();
    }
    setCurrentRoleState('SUPER_ADMIN');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles: ALL_ROLES,
        currentRole,
        setCurrentRole,
        selectedProjectId,
        setSelectedProjectId,
        hasPermission,
        isSupabaseLive: isSupabaseConfigured,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

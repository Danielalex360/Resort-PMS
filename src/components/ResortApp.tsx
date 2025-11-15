import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { ModuleName, getRoleLabel, getRoleColor } from '../utils/permissions';
import { Dashboard } from './Dashboard';
import { OverheadPanel } from './OverheadPanel';
import { CostPricePanel } from './CostPricePanel';
import { SeasonsPage } from './SeasonsPage';
import { BookingCalendar } from './BookingCalendar';
import { ProfitDashboard } from './ProfitDashboard';
import { GuestsPage } from './GuestsPage';
import { NotificationsLog } from './NotificationsLog';
import { ExpensesPage } from './ExpensesPage';
import { PackagesPage } from './PackagesPage';
import { PackageConfigPage } from './PackageConfigPage';
import { PromosPage } from './PromosPage';
import { RatesCalendar } from './RatesCalendar';
import { UsersPage } from './UsersPage';
import { PropertySetupPage } from './PropertySetupPage';
import { ReportsPage } from './ReportsPage';
import {
  Hotel,
  DollarSign,
  Calendar,
  Package,
  BarChart3,
  Settings,
  Sun,
  Users,
  Bell,
  Receipt,
  Tag,
  TrendingUp,
  Boxes,
  UserCog,
  User,
  ChevronDown,
  LogOut,
  Building2,
  FileText,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

type View = 'dashboard' | 'overhead' | 'pricing' | 'seasons' | 'rates' | 'packages' | 'package-config' | 'promos' | 'bookings' | 'guests' | 'notifications' | 'expenses' | 'users' | 'property-setup' | 'reports';

interface Resort {
  id: string;
  name: string;
  currency: string;
}

export function ResortApp() {
  const { user, signOut } = useAuth();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [selectedResort, setSelectedResort] = useState<Resort | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPropertySetup, setShowPropertySetup] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [todayStats, setTodayStats] = useState<any>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const permissions = usePermissions(selectedResort?.id || '');

  useEffect(() => {
    if (user && selectedResort) {
      loadUserRole();
      loadUnreadNotifications();
      loadTodayStats();
    }
  }, [user, selectedResort]);

  useEffect(() => {
    if (selectedResort) {
      const interval = setInterval(() => {
        loadUnreadNotifications();
        loadTodayStats();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [selectedResort]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadNotifications = async () => {
    if (!selectedResort) return;
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { count } = await supabase
      .from('notifications_log')
      .select('*', { count: 'exact', head: true })
      .eq('resort_id', selectedResort.id)
      .gte('created_at', oneDayAgo.toISOString());

    setUnreadNotifications(count || 0);
  };

  const loadTodayStats = async () => {
    if (!selectedResort) return;
    const today = new Date().toISOString().slice(0, 10);

    const [arrivalsResult, departuresResult, inhouseResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', selectedResort.id)
        .eq('check_in', today)
        .neq('status', 'cancelled'),

      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', selectedResort.id)
        .eq('check_out', today)
        .neq('status', 'cancelled'),

      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', selectedResort.id)
        .lte('check_in', today)
        .gt('check_out', today)
        .eq('status', 'confirmed')
    ]);

    setTodayStats({
      arrivals: arrivalsResult.count || 0,
      departures: departuresResult.count || 0,
      inhouse: inhouseResult.count || 0,
    });
  };

  const loadUserRole = async () => {
    if (!user || !selectedResort) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('resort_id', selectedResort.id)
      .maybeSingle();
    if (data) {
      setUserRole(data.role);
    }
  };

  useEffect(() => {
    loadResorts();
  }, []);

  const loadResorts = async () => {
    const { data, error } = await supabase.from('resorts').select('*').order('name');

    if (error) {
      console.error('Error loading resorts:', error);
    } else {
      setResorts(data || []);
      if (data && data.length > 0) {
        setSelectedResort(data[0]);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!selectedResort) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Hotel className="mx-auto text-slate-400 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Resorts Found</h2>
          <p className="text-slate-600">Please add a resort to get started.</p>
        </div>
      </div>
    );
  }

  const mainMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, module: 'dashboard' as ModuleName },
    { id: 'reports', label: 'Reports', icon: FileText, module: 'dashboard' as ModuleName },
    { id: 'bookings', label: 'Bookings', icon: Calendar, module: 'bookings' as ModuleName },
    { id: 'guests', label: 'Guests', icon: Users, module: 'guests' as ModuleName },
  ];

  const propertySetupItems = [
    { id: 'property-setup', label: 'Property Details', icon: Building2, module: 'pricing' as ModuleName },
    { id: 'overhead', label: 'Overhead', icon: DollarSign, module: 'overhead' as ModuleName },
    { id: 'expenses', label: 'Expenses', icon: Receipt, module: 'expenses' as ModuleName },
    { id: 'pricing', label: 'Cost & Price', icon: Settings, module: 'pricing' as ModuleName },
    { id: 'seasons', label: 'Seasons', icon: Sun, module: 'seasons' as ModuleName },
    { id: 'rates', label: 'Rates', icon: TrendingUp, module: 'rates' as ModuleName },
    { id: 'promos', label: 'Promos & Surcharges', icon: Tag, module: 'promos' as ModuleName },
    { id: 'package-config', label: 'Package Setup', icon: Boxes, module: 'package-config' as ModuleName },
    { id: 'packages', label: 'Packages', icon: Package, module: 'packages' as ModuleName },
  ];

  const filteredMainMenu = mainMenuItems.filter((item) => permissions.canAccess(item.module));
  const filteredPropertySetup = propertySetupItems.filter((item) => permissions.canAccess(item.module));

  console.log('DEBUG - Resort:', selectedResort?.id);
  console.log('DEBUG - User Role:', permissions.userRole);
  console.log('DEBUG - Permissions loading:', permissions.loading);
  console.log('DEBUG - Main menu count:', filteredMainMenu.length);
  console.log('DEBUG - Property setup count:', filteredPropertySetup.length);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left Sidebar */}
      <div className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Hotel className="text-emerald-600" size={24} />
              <span className="font-bold text-slate-900">Resort PMS</span>
            </div>
          )}
          {sidebarCollapsed && (
            <Hotel className="text-emerald-600 mx-auto" size={24} />
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-1 hover:bg-slate-100 rounded transition-colors ${sidebarCollapsed ? 'mx-auto mt-2' : ''}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Main Menu Items */}
          {filteredMainMenu.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  currentView === item.id
                    ? 'bg-emerald-50 text-emerald-700 border-r-4 border-emerald-600'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} className={sidebarCollapsed ? 'mx-auto' : ''} />
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}

          {/* Property Setup Section */}
          {filteredPropertySetup.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowPropertySetup(!showPropertySetup)}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings size={20} className={sidebarCollapsed ? 'mx-auto' : ''} />
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium flex-1 text-left">Property Setup</span>
                    <ChevronRight size={16} className={`transition-transform ${showPropertySetup ? 'rotate-90' : ''}`} />
                  </>
                )}
              </button>

              {!sidebarCollapsed && showPropertySetup && (
                <div className="bg-slate-50">
                  {filteredPropertySetup.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id as View)}
                        className={`w-full flex items-center gap-3 px-8 py-2.5 text-sm transition-colors ${
                          currentView === item.id
                            ? 'bg-emerald-50 text-emerald-700 border-r-4 border-emerald-600'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Today's Stats */}
            {todayStats && (
              <div className="flex items-center gap-4 text-sm border-r border-slate-200 pr-4">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Arrivals:</span>
                  <span className="font-semibold text-blue-600">{todayStats.arrivals}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Departures:</span>
                  <span className="font-semibold text-orange-600">{todayStats.departures}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">In-House:</span>
                  <span className="font-semibold text-emerald-600">{todayStats.inhouse}</span>
                </div>
              </div>
            )}

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setCurrentView('notifications');
                  setUnreadNotifications(0);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative"
              >
                <Bell size={20} className="text-slate-600" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Resort Selector */}
            <select
              value={selectedResort.id}
              onChange={(e) => {
                const resort = resorts.find((r) => r.id === e.target.value);
                if (resort) setSelectedResort(resort);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium text-sm"
            >
              {resorts.map((resort) => (
                <option key={resort.id} value={resort.id}>
                  {resort.name}
                </option>
              ))}
            </select>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User size={18} className="text-emerald-600" />
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {user?.email || 'User'}
                    </div>
                    {userRole && (
                      <div className={`text-xs font-medium mt-1 ${getRoleColor(userRole as any)}`}>
                        {getRoleLabel(userRole as any)}
                      </div>
                    )}
                  </div>
                  {permissions.canAccess('users') && (
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setCurrentView('users');
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <UserCog size={16} className="text-slate-500" />
                      User Management
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      signOut();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-slate-100"
                  >
                    <LogOut size={16} className="text-red-500" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentView === 'dashboard' && <Dashboard resortId={selectedResort.id} />}
          {currentView === 'reports' && <ReportsPage resortId={selectedResort.id} />}
          {currentView === 'overhead' && <OverheadPanel resortId={selectedResort.id} />}
          {currentView === 'expenses' && <ExpensesPage resortId={selectedResort.id} />}
          {currentView === 'pricing' && <CostPricePanel resortId={selectedResort.id} />}
          {currentView === 'property-setup' && <PropertySetupPage resortId={selectedResort.id} />}
          {currentView === 'seasons' && <SeasonsPage resortId={selectedResort.id} />}
          {currentView === 'rates' && <RatesCalendar resortId={selectedResort.id} />}
          {currentView === 'promos' && <PromosPage resortId={selectedResort.id} />}
          {currentView === 'package-config' && <PackageConfigPage resortId={selectedResort.id} />}
          {currentView === 'packages' && <PackagesPage resortId={selectedResort.id} />}
          {currentView === 'bookings' && <BookingCalendar resortId={selectedResort.id} />}
          {currentView === 'guests' && <GuestsPage resortId={selectedResort.id} />}
          {currentView === 'notifications' && <NotificationsLog resortId={selectedResort.id} />}
          {currentView === 'users' && user && <UsersPage resortId={selectedResort.id} currentUserId={user.id} />}
        </div>
      </div>
    </div>
  );
}




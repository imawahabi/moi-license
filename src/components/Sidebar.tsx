import React from 'react';
import {
  BarChart3,
  Users,
  FileText,
  Shield,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Bell,
  Zap
} from 'lucide-react';

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  category?: 'main' | 'management' | 'system';
}

const navigation: NavigationItem[] = [
  { id: 'dashboard', name: 'لوحة التحكم', icon: BarChart3, category: 'main' },
  { id: 'add-license', name: 'إضافة رخصة جديدة', icon: PlusCircle, category: 'main' },
  { id: 'licenses', name: 'قائمة الرخص', icon: FileText, category: 'main' },
  { id: 'employees', name: 'إدارة الموظفين', icon: Users, category: 'main' },
  { id: 'reports', name: 'التقارير والإحصائيات', icon: Shield, category: 'management' },
];

const categoryLabels = {
  main: 'العمليات الأساسية',
  management: 'الإدارة والمتابعة',
  system: 'إعدادات النظام'
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Sidebar({ isCollapsed, onToggle, currentPage, onPageChange }: SidebarProps) {
  const groupedNavigation = navigation.reduce((acc, item) => {
    const category = item.category || 'main';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  return (
    <div 
      dir="rtl" 
      className={`flex h-screen flex-col bg-gradient-to-b from-slate-50 to-gray-100 border-l border-gray-300 shadow-2xl transition-all duration-300 fixed right-0 top-0 z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Header Section */}
      <div className={`relative ${isCollapsed ? 'h-20' : 'h-52'} bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 border-b border-blue-800 shadow-lg`}>
        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute -left-6 top-6 p-3 rounded-xl bg-white/90 border border-gray-300 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-md hover:scale-110"
          style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
        >
          {isCollapsed ? (
            <ChevronLeft className="h-5 w-5 text-blue-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-blue-600" />
          )}
        </button>

        <div className="h-full flex flex-col items-center justify-center p-4">
          {!isCollapsed ? (
            <>
              {/* Logo */}
              <div 
                className="p-2 rounded-2xl bg-white/40 border border-gray-300 shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-md"
                style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/42/MOI_logo.png"
                  alt="Ministry Logo"
                  className="w-16 h-16 object-contain"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/logo.png";
                  }}                
                />
              </div>              
              {/* System Info */}
              <div className="text-center space-y-1 mt-2">
                <h1 className="text-lg font-bold text-white drop-shadow-md">
                  نظام متابعة الرخص
                </h1>
                <p className="text-blue-100 text-xs font-medium drop-shadow">
                إدارة السجل العام
                </p>
                <p className="text-blue-200 text-xs drop-shadow">
                الإدارة العامة لمكتب وكيل الوازرة
                </p>
              </div>
            </>
          ) : (
            <div className="w-18 h-18 rounded-full px-1 py-1 flex items-center justify-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/4/42/MOI_logo.png" 
                alt="Ministry Logo" 
                className="w-12 h-12 object-contain" 
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/logo.png";
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-4">
          {Object.entries(groupedNavigation).map(([category, items]) => (
            <div key={category}>
              {!isCollapsed && (
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h3>
                  <div className="h-px bg-gray-200"></div>
                </div>
              )}
              
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.name}
                      onClick={() => onPageChange(item.id)}
                      className={`
                        w-full group flex items-center justify-between rounded-lg transition-all duration-200 relative
                        ${isCollapsed ? 'px-3 py-3 mx-1' : 'px-4 py-3'}
                        ${isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }
                      `}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <item.icon
                          className={`
                            ${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} transition-colors duration-200
                            ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}
                          `}
                        />
                        {!isCollapsed && (
                          <span className="text-sm">
                            {item.name}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <div className="absolute right-0 top-0 w-full h-full rounded-md bg-blue-500/10 backdrop-blur-sm animate-pulse z-[-1]"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer Section */}
      <div className="px-3 py-3 border-t border-gray-200">
        {!isCollapsed ? (
          <div className="text-center">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-gray-700">الإصدار 1.0</p>
              <p className="text-xs text-gray-500">نظام إدارة الرخص</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <p className="text-xs font-medium text-gray-700">v1.0</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import {
  Users,
  FolderOpen,
  PlusCircle,
  ChevronsLeft,
  ChevronsRight,
  FilePlus,
  PieChart,
  LayoutDashboard,
  Settings,
  UserCog,
  LogOut,
  Bell,
  HelpCircle
} from 'lucide-react';

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  category: 'main' | 'reports' | 'settings' | 'support';
  badge?: string;
  isNew?: boolean;
}

const navigation: NavigationItem[] = [
  // القائمة الرئيسية
  { id: 'dashboard', name: 'الرئيسية', icon: LayoutDashboard, category: 'main' },
  { id: 'add-license', name: 'إضافة استئذان', icon: PlusCircle, category: 'main' },
  { id: 'licenses', name: 'سجلات الاستئذانات', icon: FolderOpen, category: 'main' },
  { id: 'employees', name: 'إدارة الموظفين', icon: Users, category: 'main' },
  
  // التقارير
  { id: 'reports', name: 'إنشاء تقرير جديد', icon: FilePlus, category: 'reports' },
  { id: 'old-reports', name: 'التقارير الشاملة', icon: PieChart, category: 'reports' }
];

const categoryLabels = {
  main: 'القائمة الرئيسية',
  reports: 'التقارير'
};

const categoryIcons = {
  main: LayoutDashboard,
  reports: PieChart
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle?: () => void;
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
      className={`flex h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-gray-50 border-l border-gray-200 shadow-xl transition-all duration-300 fixed right-0 top-0 z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Header Section - Modern Design */}
      <div className={`relative ${isCollapsed ? 'h-24' : 'h-56'} bg-gradient-to-br from-blue-600 to-blue-800 border-b border-white/20 shadow-2xl overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3Ccircle cx='53' cy='7' r='7'/%3E%3Ccircle cx='30' cy='30' r='7'/%3E%3Ccircle cx='7' cy='53' r='7'/%3E%3Ccircle cx='53' cy='53' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          ></div>
        </div>
        
        <div className="relative h-full flex flex-col items-center justify-center p-3">
          {!isCollapsed ? (
            <>
              {/* Logo with Enhanced Design */}
              <div className="relative group mb-4">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-white/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Logo Container */}
                <div 
                  className="relative p-3 rounded-3xl bg-gradient-to-br from-white/30 to-white/15 border border-white/40 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 backdrop-blur-xl"
                  style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/25 to-transparent"></div>
                  <img
                    src="/icons/logo.png"
                    alt="Ministry Logo"
                    className="relative w-16 h-16 object-contain drop-shadow-2xl"
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/icons/icon.png";
                    }}
                  />
                </div>
              </div>
              
              {/* System Info with Enhanced Typography */}
              <div className="text-center space-y-2">
                <h1 className="text-xl font-bold text-white drop-shadow-lg tracking-wide leading-tight">
                  نظام متابعة الاستئذانات
                </h1>
                <div className="space-y-1">
                  <p className="text-white/90 text-sm font-semibold drop-shadow-md">
                    إدارة السجل العام
                  </p>
                  <p className="text-white/80 text-xs drop-shadow-sm leading-relaxed px-2">
                    الإدارة العامة لمكتب وكيل الوزارة
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Logo Container */}
              <div className="relative p-1.5 rounded-xl bg-gradient-to-br from-white/25 to-white/10 border border-white/30 shadow-2xl backdrop-blur-xl">
                <img
                  src="/icons/logo.png"
                  alt="Ministry Logo"
                  className="relative w-10 h-10 object-contain drop-shadow-2xl"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/icons/icon.png";
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 overflow-y-auto py-8 custom-scrollbar">
        <div className="space-y-6 px-3">
          {Object.entries(groupedNavigation).map(([category, items]) => (
            <div key={category} className="space-y-2">
              {!isCollapsed && (
                <div className="relative px-3">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {React.createElement(categoryIcons[category as keyof typeof categoryIcons], {
                      className: 'h-4 w-4 text-blue-500',
                      strokeWidth: 2.5
                    })}
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h3>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-2"></div>
                </div>
              )}
              
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = currentPage === item.id;
                  const Icon = item.icon;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onPageChange(item.id)}
                      className={`
                        w-full group flex items-center justify-between rounded-lg transition-all duration-300 relative
                        overflow-hidden
                        ${isCollapsed ? 'px-2 py-3 mx-1' : 'px-4 py-3'}
                        ${isActive 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg border-0' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                        }
                      `}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <span className={`
                          p-2 rounded-lg flex-shrink-0 transition-all duration-300
                          ${isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                          }
                        `}>
                          <Icon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        
                        {!isCollapsed && (
                          <span className={`text-sm font-semibold text-right flex-1 transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                            {item.name}
                          </span>
                        )}
                      </div>
                      
                      {/* Badges */}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {item.isNew && !isCollapsed && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            جديد
                          </span>
                        )}
                        
                        {item.badge && (
                          <span className={`
                            text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center
                            ${isActive 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer Section - Toggle Button */}
      <div className="mt-auto border-t border-gray-100 bg-white/50 backdrop-blur-sm p-3">
        <button
          onClick={onToggle}
          className="w-full group relative transition-all duration-500 ease-out"
          aria-label={isCollapsed ? 'فتح القائمة' : 'إغلاق القائمة'}
          title={isCollapsed ? 'فتح القائمة' : 'إغلاق القائمة'}
        >
          <div className="relative">
            {/* Animated Glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 rounded-full opacity-0 group-hover:opacity-40 blur-lg transition-all duration-500"></div>
            
            {/* Main Button */}
            <div
              className="relative w-full h-10 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center border border-blue-500/50 group-hover:-translate-y-0.5"
              style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
            >
              {/* Inner Light */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent"></div>
              
              {/* Icon and Text Container */}
              <div className="relative flex items-center justify-center gap-2 text-white">
                {isCollapsed ? (
                  <>
                    <ChevronsLeft className="h-5 w-5 transition-all duration-300 group-hover:scale-125" />
                  </>
                ) : (
                  <>
                    <ChevronsRight className="h-5 w-5 transition-all duration-300 group-hover:scale-125" />
                    <span className="text-sm font-base">إغلاق القائمة</span>

                  </>
                )}
              </div>
              
              {/* Shimmer */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

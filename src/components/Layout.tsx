import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { CalendarDays, Clock3 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const getPageTitle = (activeTab: string): string => {
  const titles: Record<string, string> = {
    'dashboard': 'اللوحة الرئيسية',
    'modern-add-license': 'إضافة استئذان متطور',
    'add-license': 'تسجيل استئذان',
    'licenses': 'سجلات الاستئذانات',
    'employees': 'إدارة الموظفين',
    'reports': 'إنشاء تقرير جديد',
    'old-reports': 'التقارير الشاملة',
  };
  return titles[activeTab] || 'نظام إدارة الاستئذانات';
};

const getPageSubtitle = (activeTab: string): string => {
  const subtitles: Record<string, string> = {
    'dashboard': 'نظرة شاملة على إحصائيات النظام',
    'modern-add-license': 'نظام متطور لإضافة الاستئذانات بخطوات سهلة ومنظمة',
    'add-license': 'إضافة استئذان جديد لموظف أو عدة موظفين',
    'licenses': 'عرض وإدارة جميع الاستئذانات المسجلة',
    'employees': 'إدارة بيانات الموظفين',
    'reports': 'نظام متطور لإنشاء التقارير بخطوات سهلة ومنظمة',
    'old-reports': 'تقارير وإحصائيات مفصلة بالطريقة التقليدية',
    'alerts': 'التنبيهات والإشعارات',
    'settings': 'إعدادات النظام'
  };
  return subtitles[activeTab] || 'نظام إدارة استئذانات السجل العام';
};

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={handleToggleSidebar}
        currentPage={activeTab}
        onPageChange={onTabChange}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'mr-20' : 'mr-64'
        }`}
      >
        {/* Top Header with Live Clock */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-md px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="mr-6">
              <h1 className="text-2xl font-bold text-gray-800">
                {getPageTitle(activeTab)}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {getPageSubtitle(activeTab)}
              </p>
            </div>
            <div className="relative">
              <div className="flex items-center gap-3">
                {/* Date pill - hidden on very small screens */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/60 border border-gray-200 shadow-sm backdrop-blur-md">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-gray-700">
                    {currentTime.toLocaleDateString('ar-us', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Time pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 border border-gray-200 shadow-sm backdrop-blur-md">
                  <Clock3 className="w-4 h-4 text-blue-600" />
                  <span className="text-md font-bold text-gray-800">
                    {currentTime.toLocaleTimeString('ar-us', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                  <span className="inline-flex items-center justify-center w-6 h-6 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
                    {currentTime.toLocaleTimeString('ar-us', { second: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            </div>
          
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto animate-fade-in">
            {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <div>
              <p>جميع الحقوق محفوظة - الإدارة العامة لمكتب وكيل الوزارة - إدارة السجل العام 2025</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
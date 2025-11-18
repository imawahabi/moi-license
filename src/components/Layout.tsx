import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Clock3 } from 'lucide-react';

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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">

      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
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
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="mr-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {getPageTitle(activeTab)}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-200"></span>
                    {getPageSubtitle(activeTab)}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="flex items-center gap-3">
                {/* Date & Time Container */}
                <div className="flex items-stretch overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm">
                  {/* Date Section */}
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 border-l border-gray-100">
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500">
                        {currentTime.toLocaleDateString('ar-us', { weekday: 'long' })}
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        {currentTime.getDate()}
                      </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200 mx-1"></div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500">
                        {currentTime.toLocaleDateString('ar-us', { month: 'long' })}
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        {currentTime.getFullYear()}
                      </div>
                    </div>
                  </div>

                  {/* Time Section */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-white">
                    <Clock3 className="w-4 h-4 text-blue-600" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-blue-700 tabular-nums">
                        {currentTime.toLocaleTimeString('ar-us', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </span>
                      <span className="text-xs font-medium text-blue-600">
                        {currentTime.getHours() >= 12 ? 'م' : 'ص'}
                      </span>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center ml-1">
                      <span className="text-xs font-bold text-blue-700">
                        {currentTime.getSeconds()}
                      </span>
                    </div>
                  </div>
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
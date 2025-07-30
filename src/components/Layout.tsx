import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const getPageTitle = (activeTab: string): string => {
  const titles: Record<string, string> = {
    'dashboard': 'لوحة التحكم',
    'modern-add-license': 'إضافة رخصة متطورة',
    'add-license': 'تسجيل رخصة تقليدية',
    'licenses': 'قائمة الرخص',
    'employees': 'إدارة الموظفين',
    'reports': 'التقارير الحديثة',
    'old-reports': 'التقارير التقليدية',
  };
  return titles[activeTab] || 'نظام إدارة الرخص';
};

const getPageSubtitle = (activeTab: string): string => {
  const subtitles: Record<string, string> = {
    'dashboard': 'نظرة شاملة على إحصائيات النظام',
    'modern-add-license': 'نظام متطور لإضافة الرخص بخطوات سهلة ومنظمة',
    'add-license': 'إضافة رخصة جديدة لموظف أو عدة موظفين',
    'licenses': 'عرض وإدارة جميع الرخص المسجلة',
    'employees': 'إدارة بيانات الموظفين',
    'reports': 'تقارير وإحصائيات مفصلة',
    'alerts': 'التنبيهات والإشعارات',
    'settings': 'إعدادات النظام'
  };
  return subtitles[activeTab] || 'نظام إدارة رخص السجل العام';
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
        <header className="bg-white shadow-md border-b border-gray-200 px-6 py-4">
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
                <div className="flex items-center justify-center space-x-4 space-x-reverse">
                  {/* التاريخ والوقت في سطر واحد */}
                  <div className="text-center">
                    <div className="text-md font-bold leading-tight flex items-center justify-center space-x-4 space-x-reverse">
                      <span className="text-gray-800">
                        {currentTime.toLocaleDateString('ar-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-600">
                        {currentTime.toLocaleTimeString('ar-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        })}
                      </span>
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
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <p>الإدارة العامة لمكتب وكيل الوزارة - وزارة الداخلية - دولة الكويت</p>
            </div>
            <div>
              <p>© جميع الحقوق محفوظة - الإصدار 1.0</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
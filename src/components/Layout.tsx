import React from 'react';
import { Shield, Users, FileText, BarChart3, PlusCircle, Upload } from 'lucide-react';
import KuwaitLogo from './KuwaitLogo';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: BarChart3 },
    { id: 'licenses', label: 'قائمة الرخص', icon: FileText },
    { id: 'reports', label: 'التقارير والإحصائيات', icon: Shield },
    { id: 'employees', label: 'الموظفين', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-kuwait-gradient shadow-lg border-b-4 border-blue-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center space-x-5 rtl:space-x-reverse">
              <KuwaitLogo size="lg" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wider">
                  نظام إدارة رخص السجل العام
                </h1>
                <p className="text-base text-blue-200">
                  الإدارة العامة لمكتب وكيل الوزارة
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-white font-semibold">وزارة الداخلية - دولة الكويت</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 space-x-reverse items-center">
            {/* التابات العادية */}
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 space-x-reverse px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            {/* أزرار الإجراءات */}
            <div className="flex items-center space-x-3 space-x-reverse" style={{ marginRight: 'auto' }}>
              {/* زر استيراد البيانات 
              <button
                onClick={() => onTabChange('data-importer')}
                className={`flex items-center space-x-2 space-x-reverse px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-md hover:shadow-lg ${activeTab === 'data-importer' ? 'bg-purple-700' : ''}`}
                title="استيراد بيانات من SQL"
              >
                <Upload className="w-4 h-4" />
                <span>استيراد البيانات</span>
              </button>*/}

              {/* زر إضافة رخصة جديدة */}
              <button
                onClick={() => onTabChange('add-license')}
                className={`btn-primary flex items-center space-x-2 space-x-reverse ${activeTab === 'add-license' ? 'bg-primary-700 text-white' : ''}`}
                title="إضافة رخصة جديدة"
              >
                <PlusCircle className="w-4 h-4" />
                <span>تسجيل رخصة جديدة</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-secondary-200 mt-16 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <KuwaitLogo size="sm" />
              <div className="text-sm text-secondary-600">
                <p>الإدارة العامة لمكتب وكيل الوزارة</p>
                <p>نظام إدارة رخص السجل العام</p>
              </div>
            </div>
            <div className="text-sm text-secondary-500">
              <p>النسخة 1.0.0</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
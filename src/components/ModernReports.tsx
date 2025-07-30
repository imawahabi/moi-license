import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Calendar, Users, Filter, Download, Printer, Eye, ChevronLeft, CheckCircle } from 'lucide-react';
import Select from 'react-select';
import { EmployeeService } from '../services/employeeService';
import { LicenseService } from '../services/licenseService';
import { Employee, License } from '../types';
import { CATEGORY_ORDER, OFFICER_RANK_ORDER, NCO_RANK_ORDER } from '../utils/sorting';

interface ReportConfig {
  title: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  categories: string[];
  includeDetails: boolean;
}

interface ReportStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface ModernReportsProps {
  onNavigate?: (tab: string) => void;
}

const ModernReports: React.FC<ModernReportsProps> = ({ onNavigate }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: '',
    dateRange: {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
      endDate: new Date().toISOString().split('T')[0] // Today
    },
    categories: [],
    includeDetails: false
  });
  const [showReport, setShowReport] = useState(false);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [employeesData, licensesData] = await Promise.all([
          EmployeeService.getAll(),
          LicenseService.getAll()
        ]);
        setEmployees(employeesData);
        setLicenses(licensesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const steps: ReportStep[] = [
    {
      id: 1,
      title: 'تفاصيل التقرير',
      description: 'أدخل عنوان التقرير والفترة الزمنية',
      icon: <FileText className="w-5 h-5" />,
      completed: reportConfig.title && reportConfig.dateRange.startDate && reportConfig.dateRange.endDate
    },
    {
      id: 2,
      title: 'اختيار الفئات',
      description: 'حدد الفئات المراد تضمينها في التقرير',
      icon: <Users className="w-5 h-5" />,
      completed: reportConfig.categories.length > 0
    },
    {
      id: 3,
      title: 'معاينة وطباعة',
      description: 'راجع التقرير واطبعه',
      icon: <Eye className="w-5 h-5" />,
      completed: showReport
    }
  ];

  // Filter licenses based on config
  const filteredLicenses = useMemo(() => {
    if (!reportConfig.dateRange.startDate || !reportConfig.dateRange.endDate) {
      return [];
    }

    return licenses.filter(license => {
      if (!license.employee) return false;
      
      const licenseDate = new Date(license.license_date);
      const startDate = new Date(reportConfig.dateRange.startDate);
      const endDate = new Date(reportConfig.dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      const dateMatch = licenseDate >= startDate && licenseDate <= endDate;
      const categoryMatch = reportConfig.categories.length === 0 || 
        reportConfig.categories.includes(license.employee.category);

      return dateMatch && categoryMatch;
    });
  }, [licenses, reportConfig]);

  // Generate report data
  const reportData = useMemo(() => {
    const employeeMap = new Map();
    
    filteredLicenses.forEach(license => {
      const employeeId = license.employee!.id;
      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employee: license.employee,
          fullDays: 0,
          halfDays: 0,
          totalHours: 0,
          licenses: []
        });
      }
      
      const data = employeeMap.get(employeeId);
      data.licenses.push(license);
      
      if (license.license_type === 'يوم كامل') {
        data.fullDays += 1;
        data.totalHours += 8;
      } else if (license.license_type === 'نصف يوم') {
        data.halfDays += 1;
        data.totalHours += 4;
      }
    });
    
    return Array.from(employeeMap.values()).sort((a, b) => {
      const categoryOrder = { 'ضابط': 1, 'ضابط صف': 2, 'عريف': 3 };
      const aCategoryOrder = categoryOrder[a.employee.category as keyof typeof categoryOrder] || 4;
      const bCategoryOrder = categoryOrder[b.employee.category as keyof typeof categoryOrder] || 4;
      
      if (aCategoryOrder !== bCategoryOrder) {
        return aCategoryOrder - bCategoryOrder;
      }
      
      if (a.employee.category === 'ضابط') {
        return (OFFICER_RANK_ORDER[a.employee.rank] || 999) - (OFFICER_RANK_ORDER[b.employee.rank] || 999);
      } else if (a.employee.category === 'ضابط صف') {
        return (NCO_RANK_ORDER[a.employee.rank] || 999) - (NCO_RANK_ORDER[b.employee.rank] || 999);
      }
      
      return a.employee.full_name.localeCompare(b.employee.full_name, 'ar');
    });
  }, [filteredLicenses]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowReport(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateReport = () => {
    setShowReport(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      textAlign: 'right',
      direction: 'rtl',
      minHeight: '48px',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      '&:hover': {
        border: '2px solid #3b82f6'
      },
      '&:focus-within': {
        border: '2px solid #3b82f6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
      }
    }),
    placeholder: (base: any) => ({
      ...base,
      textAlign: 'right',
      color: '#9ca3af'
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: '#dbeafe',
      borderRadius: '6px'
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: '#1e40af',
      fontWeight: '500'
    })
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 animate-pulse">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">جاري تحميل البيانات...</h2>
          <p className="text-gray-600">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  if (showReport) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Print Header - Only visible when printing */}
        <div className="print-only text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {reportConfig.title || 'تقرير متابعة موظفي إدارة السجل العام'}
          </h1>
          <p className="text-gray-600">
            من تاريخ {new Date(reportConfig.dateRange.startDate).toLocaleDateString('en-US')} 
            إلى تاريخ {new Date(reportConfig.dateRange.endDate).toLocaleDateString('en-US')}
          </p>
          {reportConfig.categories.length > 0 && (
            <p className="text-blue-600 font-semibold mt-2">
              ( {reportConfig.categories.join(' / ')} )
            </p>
          )}
        </div>

        {/* Screen Header - Hidden when printing */}
        <div className="no-print bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowReport(false)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
                العودة للإعدادات
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-800">
                {reportConfig.title || 'تقرير متابعة الموظفين'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('old-reports')}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  التقارير التقليدية
                </button>
              )}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Report Header */}
            <div className="no-print bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">نتائج التقرير</h2>
                    <p className="text-blue-100 text-sm">عرض {reportData.length} موظف</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">الفترة</p>
                  <p className="font-semibold">
                    {new Date(reportConfig.dateRange.startDate).toLocaleDateString('en-US')} - 
                    {new Date(reportConfig.dateRange.endDate).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
            </div>

            {/* Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">م</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">الرتبة</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">اسم الموظف</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">يوم كامل</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">نصف يوم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.length > 0 ? reportData.map((data, index) => (
                    <tr key={data.employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 mx-auto">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                        <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold">
                          {data.employee.category === 'ضابط' || data.employee.category === 'ضابط صف'
                            ? data.employee.rank
                            : data.employee.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">{data.employee.full_name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          {data.fullDays || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                          {data.halfDays || '-'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="w-16 h-16 text-gray-300" />
                          <p className="text-lg font-medium">لا توجد بيانات</p>
                          <p className="text-sm">لا توجد رخص في الفترة المحددة</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('old-reports')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
              >
                <FileText className="w-4 h-4" />
                التقارير التقليدية
              </button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">إنشاء تقرير جديد</h1>
          <p className="text-gray-600">اتبع الخطوات لإنشاء تقرير مخصص لمتابعة الموظفين</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 ${
                currentStep === step.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : step.completed 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  step.icon
                )}
                <span className="font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronLeft className="w-5 h-5 text-gray-400 mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-2">{steps[currentStep - 1].title}</h2>
            <p className="text-gray-600">{steps[currentStep - 1].description}</p>
          </div>

          <div className="px-8 py-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">عنوان التقرير</label>
                  <input
                    type="text"
                    value={reportConfig.title}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="تقرير متابعة موظفي إدارة السجل العام لسنة 2025"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right"
                  />
                  <p className="text-xs text-gray-500 mt-1">اتركه فارغاً لاستخدام العنوان الافتراضي</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">من تاريخ</label>
                    <input
                      type="date"
                      value={reportConfig.dateRange.startDate}
                      onChange={(e) => setReportConfig(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, startDate: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">إلى تاريخ</label>
                    <input
                      type="date"
                      value={reportConfig.dateRange.endDate}
                      onChange={(e) => setReportConfig(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, endDate: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">اختيار الفئات</label>
                  <Select
                    isMulti
                    options={Object.keys(CATEGORY_ORDER).map(cat => ({ value: cat, label: cat }))}
                    value={reportConfig.categories.map(cat => ({ value: cat, label: cat }))}
                    onChange={(newValue) => setReportConfig(prev => ({ 
                      ...prev, 
                      categories: newValue ? newValue.map(v => v.value) : []
                    }))}
                    placeholder="اختر الفئات المراد تضمينها..."
                    styles={customSelectStyles}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                  <p className="text-sm text-gray-500 mt-2">اتركها فارغة لتشمل جميع الفئات</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">إحصائيات البيانات المتاحة</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                      <div className="text-gray-600">إجمالي الموظفين</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{licenses.length}</div>
                      <div className="text-gray-600">إجمالي الرخص</div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-800 mb-3">معاينة التقرير</h3>
                  <div className="text-sm text-blue-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">العنوان:</span>
                      <span className="text-right">{reportConfig.title || 'تقرير متابعة موظفي إدارة السجل العام'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">الفترة:</span>
                      <span className="text-right">{reportConfig.dateRange.startDate && reportConfig.dateRange.endDate
                        ? `من ${new Date(reportConfig.dateRange.startDate).toLocaleDateString('en-US')} إلى ${new Date(reportConfig.dateRange.endDate).toLocaleDateString('en-US')}`
                        : 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">الفئات:</span>
                      <span className="text-right">{reportConfig.categories.length > 0 ? reportConfig.categories.join(', ') : 'جميع الفئات'}</span>
                    </div>
                    <div className="border-t border-blue-200 pt-2 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">عدد الموظفين في التقرير:</span>
                        <span className="text-xl font-bold text-blue-800">{reportData.length}</span>
                      </div>
                      {reportData.length > 0 && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="font-medium">إجمالي الرخص:</span>
                          <span className="font-bold text-blue-800">{reportData.reduce((sum, emp) => sum + emp.fullDays + emp.halfDays, 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {reportData.length === 0 && reportConfig.dateRange.startDate && reportConfig.dateRange.endDate && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">تنبيه: لا توجد رخص في الفترة المحددة</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">جرب تغيير نطاق التاريخ أو الفئات للحصول على نتائج</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">التقرير جاهز!</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  تم إعداد التقرير بنجاح. يمكنك الآن معاينته وطباعته.
                </p>
                
                <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto">
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">عدد الموظفين:</span>
                      <span>{reportData.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">إجمالي الرخص:</span>
                      <span>{reportData.reduce((sum, emp) => sum + emp.fullDays + emp.halfDays, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">أيام كاملة:</span>
                      <span>{reportData.reduce((sum, emp) => sum + emp.fullDays, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">أنصاف أيام:</span>
                      <span>{reportData.reduce((sum, emp) => sum + emp.halfDays, 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
              السابق
            </button>

            <div className="flex items-center gap-3">
              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={!steps[currentStep - 1].completed}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                    steps[currentStep - 1].completed
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={generateReport}
                  disabled={reportData.length === 0}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
                    reportData.length > 0
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {reportData.length > 0 ? 'عرض التقرير' : 'لا توجد بيانات'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernReports;

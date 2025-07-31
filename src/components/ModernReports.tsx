import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Calendar, Users, Printer, Eye, ChevronLeft, CheckCircle } from 'lucide-react';
import Select from 'react-select';
import DatePicker from './DatePicker';

import { LicenseService } from '../services/licenseService';
import { License } from '../types';
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

interface ModernReportsProps {}

const ModernReports: React.FC<ModernReportsProps> = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: '',
    dateRange: {
    startDate: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}-01`;
    })(),
      endDate: new Date().toISOString().split('T')[0] // Today
    },
    categories: [],
    includeDetails: false
  });
  const [showReport, setShowReport] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const licensesData = await LicenseService.getAll();
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
      title: 'إعدادات التقرير',
      description: 'تحديد العنوان والفترة الزمنية والفئات',
      icon: <FileText className="w-5 h-5" />,
      completed: currentStep > 1
    },
    {
      id: 2,
      title: 'معاينة التقرير',
      description: 'مراجعة البيانات والطباعة',
      icon: <Eye className="w-5 h-5" />,
      completed: currentStep > 2
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
      // استخدام نفس منطق الترتيب الموجود في utils/sorting.ts
      const aCategoryOrder = CATEGORY_ORDER[a.employee.category] || 99;
      const bCategoryOrder = CATEGORY_ORDER[b.employee.category] || 99;

      if (aCategoryOrder !== bCategoryOrder) {
        return aCategoryOrder - bCategoryOrder;
      }

      // ترتيب الضباط حسب الرتبة (الأعلى أولاً)
      if (a.employee.category === 'ضابط') {
        const rankA = OFFICER_RANK_ORDER[a.employee.rank.replace(' حقوقي', '').trim()] || 999;
        const rankB = OFFICER_RANK_ORDER[b.employee.rank.replace(' حقوقي', '').trim()] || 999;
        if (rankA !== rankB) return rankA - rankB;
      }

      // ترتيب ضباط الصف حسب الرتبة (الأعلى أولاً)
      if (a.employee.category === 'ضابط صف') {
        const rankA = NCO_RANK_ORDER[a.employee.rank] || 999;
        const rankB = NCO_RANK_ORDER[b.employee.rank] || 999;
        if (rankA !== rankB) return rankA - rankB;
      }

      // ترتيب أبجدي للأسماء في حالة تساوي الرتب
      return a.employee.full_name.localeCompare(b.employee.full_name, 'ar');
    });
  }, [filteredLicenses]);

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      return !!(reportConfig.dateRange.startDate && reportConfig.dateRange.endDate);
    }
    return false;
  };

  const handleNext = () => {
    if (currentStep < 2 && canProceedToNextStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };



  const handlePrint = () => {
    // Create custom print window with only the report content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير الطباعة</title>
        <style>
          @page {
            size: A4;
            margin: 4.5cm 1.75cm 0.5cm 1.75cm;
            orientation: portrait;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Sultan Normal', 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: white;
            padding: 20px;
            direction: rtl;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .report-header {
            text-align: center;
            margin-bottom: 40px;
            flex: 0 0 auto;
            padding: 80px 0 40px 0;
          }

          .content-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }

          .report-title {
            font-family: 'Sultan Bold', 'Times New Roman', serif;
            font-size: 22pt;
            font-weight: normal;
            text-decoration: none;
            text-align: center;
            margin-bottom: 10px;
            color: #000;
          }

          .report-date {
            font-family: 'Sultan Normal', 'Times New Roman', serif;
            font-size: 18pt;
            color: #000;
            text-align: center;
            margin-bottom: 5px;
            font-weight:bold;
          }

          .report-categories {
            font-family: 'Sultan Bold', 'Times New Roman', serif;
            font-size: 18pt;
            color: #ff0000;
            margin-bottom: 5px;
          }

          table {
            width: 100%;
            margin: 0px auto;
            direction: rtl;
          }

          th, td {
            border: 1px solid #000; /* حدود سميكة */
            padding: 8px;
            text-align: center;
            vertical-align: top;
            font-family: 'Sultan Normal', 'Times New Roman', serif;
            font-size: 17pt;
          }

          th {
            background: #e8e8e8;
            font-family: 'Sultan Bold', 'Times New Roman', serif;
            font-size: 17pt;
          }

          /* لجعل حدود الخلايا الداخلية واضحة جداً */
          table, th, td {
            border-width: 2px;
            border-style: solid;
            border-collapse: collapse
            border-color: #000;
          }

          .number-cell {
            font-weight: bold;
          }

          .employee-name {
            text-align: center;
            font-weight: normal;
          }

          @media print {
            body {
              padding: 0;
              margin: 0;
            }

            .report-header {
              padding-top: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="content-wrapper">
          <div class="report-header">
            <h1 class="report-title">${reportConfig.title || `تقرير متابعة موظفي إدارة السجل العام لسنة ${new Date(reportConfig.dateRange.startDate).getFullYear()}`}</h1>
            <p class="report-date">من ${reportConfig.dateRange.startDate.replace(/-/g, '/')} إلى ${reportConfig.dateRange.endDate.replace(/-/g, '/')}</p>
            ${reportConfig.categories.length > 0 ? `<p class="report-categories">( ${reportConfig.categories.map(cat => {
              if (cat === 'ضابط') return 'ضباط';
              if (cat === 'ضابط صف') return 'ضباط صف';
              if (cat === 'مهني') return 'مهنيين';
              if (cat === 'مدني') return 'مدنيين';
              return cat;
            }).join(' / ')} )</p>` : ''}
          </div>

          <table>
          <thead class="background-color:#e8e8e8">
            <tr>
              <th>م</th>
              <th>الرتبة</th>
              <th>الاسم</th>
              <th>استئذان طويل</th>
              <th>استئذان قصير</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${(item.employee.category === 'ضابط' || item.employee.category === 'ضابط صف') ? item.employee.rank : item.employee.category}</td>
                <td class="employee-name">${item.employee.full_name}</td>
                <td class="number-cell">${item.fullDays}</td>
                <td class="number-cell">${item.halfDays}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.documentElement.innerHTML = printContent;

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
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
            {reportConfig.title || `تقرير متابعة موظفي إدارة السجل العام لسنة ${new Date(reportConfig.dateRange.startDate).getFullYear()}`}
          </h1>
          <p className="text-gray-600 text-lg mb-2">
            من {reportConfig.dateRange.startDate.replace(/-/g, '/')} إلى {reportConfig.dateRange.endDate.replace(/-/g, '/')}
          </p>
          {reportConfig.categories.length > 0 && (
            <p className="text-blue-600 font-semibold mt-2">
              ( {reportConfig.categories.map(cat => {
                if (cat === 'ضابط') return 'ضباط';
                if (cat === 'ضابط صف') return 'ضباط صف';
                if (cat === 'مهني') return 'مهنيين';
                if (cat === 'مدني') return 'مدنيين';
                return cat;
              }).join(' / ')} )
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-200 to-gray-100 rounded-2xl">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
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
                  <DatePicker
                    label="من تاريخ"
                    value={reportConfig.dateRange.startDate}
                    onChange={(date) => setReportConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, startDate: date }
                    }))}
                    placeholder="اختر تاريخ البداية"
                    required
                  />
                  <DatePicker
                    label="إلى تاريخ"
                    value={reportConfig.dateRange.endDate}
                    onChange={(date) => setReportConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, endDate: date }
                    }))}
                    placeholder="اختر تاريخ النهاية"
                    minDate={reportConfig.dateRange.startDate}
                    required
                  />
                </div>

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
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Report Preview Header */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-blue-900">معاينة التقرير</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Report Title Card */}
                    <div className="bg-white rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">عنوان التقرير</span>
                        <FileText className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-blue-900 font-semibold mt-1 text-right">
                        {reportConfig.title || 'تقرير متابعة موظفي إدارة السجل العام'} لسنة {new Date(reportConfig.dateRange.startDate).getFullYear()}
                      </p>
                    </div>

                    {/* Date Range Card */}
                    <div className="bg-white rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">الفترة الزمنية</span>
                        <Calendar className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-blue-900 font-semibold mt-1 text-right">
                        {reportConfig.dateRange.startDate && reportConfig.dateRange.endDate
                          ? `من ${new Date(reportConfig.dateRange.startDate).toLocaleDateString('ar-US')} إلى ${new Date(reportConfig.dateRange.endDate).toLocaleDateString('ar-US')}`
                          : 'غير محدد'}
                      </p>
                    </div>

                    {/* Categories Card */}
                    <div className="bg-white rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">الفئات المحددة</span>
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-blue-900 font-semibold mt-1 text-right">
                        {reportConfig.categories.length > 0 ? reportConfig.categories.map(cat => {
                          if (cat === 'ضابط') return 'ضباط';
                          if (cat === 'ضابط صف') return 'ضباط صف';
                          if (cat === 'مهني') return 'مهنيين';
                          if (cat === 'مدني') return 'مدنيين';
                          return cat;
                        }).join(' • ') : 'جميع الفئات'}
                      </p>
                    </div>

                    {/* Statistics */}
                    {reportData.length > 0 && (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-purple-700">
                              {reportData.reduce((sum, emp) => sum + emp.fullDays, 0)}
                            </div>
                            <div className="text-xs text-purple-600 font-medium">إستئذانات طويلة</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-orange-700">
                              {reportData.reduce((sum, emp) => sum + emp.halfDays, 0)}
                            </div>
                            <div className="text-xs text-orange-600 font-medium">إستئذانات قصيرة</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-700">
                              {reportData.reduce((sum, emp) => sum + emp.fullDays + emp.halfDays, 0)}
                            </div>
                            <div className="text-xs text-green-600 font-medium">إجمالي الإستئذانات</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-700">
                              {reportData.length}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">إجمالي الموظفين</div>
                          </div>
                        </div>
                      </div>
                    )}
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

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg"
                  >
                    <Eye className="w-5 h-5" />
                    معاينة التقرير
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-lg"
                  >
                    <Printer className="w-5 h-5" />
                    طباعة التقرير
                  </button>
                </div>

                {/* Back Button */}
                <div className="text-center pt-4">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors mx-auto"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                    العودة للخطوة السابقة
                  </button>
                </div>
              </div>
            )}



          </div>

          {/* Navigation */}
          {currentStep < 2 && (
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
                <button
                  onClick={handleNext}
                  disabled={!canProceedToNextStep()}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                    canProceedToNextStep()
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="no-print bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">معاينة التقرير</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Report Header */}
              <div className="text-center mb-8 pb-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {reportConfig.title || 'تقرير متابعة موظفي إدارة السجل العام'} لسنة {new Date(reportConfig.dateRange.startDate).getFullYear()}
                </h1>
                <p className="text-gray-600">
                  من تاريخ {new Date(reportConfig.dateRange.startDate).toLocaleDateString('ar-US')}
                  إلى تاريخ {new Date(reportConfig.dateRange.endDate).toLocaleDateString('ar-US')}
                </p>
                {reportConfig.categories.length > 0 && (
                  <p className="text-blue-600 font-semibold mt-2">
                    ( {reportConfig.categories.join(' / ')} )
                  </p>
                )}
              </div>

              {/* Report Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">م</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">الرتبة</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">الاسم</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">استئذان طويل</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">استئذان قصير</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item, index) => (
                      <tr key={item.employee.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="border border-gray-300 px-4 py-3 text-center font-medium">{index + 1}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          {item.employee.category === 'ضابط' || item.employee.category === 'ضابط صف'
                            ? item.employee.rank
                            : item.employee.category}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center font-semibold">{item.employee.full_name}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center font-bold text-blue-600">{item.fullDays}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center font-bold text-green-600">{item.halfDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="no-print mt-6 bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{reportData.length}</div>
                    <div className="text-sm text-gray-600">إجمالي الموظفين</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{reportData.reduce((sum, emp) => sum + emp.fullDays + emp.halfDays, 0)}</div>
                    <div className="text-sm text-gray-600">إجمالي الإستئذانات</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{reportData.reduce((sum, emp) => sum + emp.fullDays, 0)}</div>
                    <div className="text-sm text-gray-600">إستئذانات طويلة</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{reportData.reduce((sum, emp) => sum + emp.halfDays, 0)}</div>
                    <div className="text-sm text-gray-600">إستئذانات قصيرة</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="no-print bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  handlePrint();
                }}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernReports;

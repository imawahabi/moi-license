import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Calendar, Users, Printer, Eye, ChevronLeft, CheckCircle, X } from 'lucide-react';
import Select from 'react-select';
import DatePicker from './DatePicker';

import { LicenseService } from '../services/licenseService';
import { License } from '../types';
import { CATEGORY_ORDER, OFFICER_RANK_ORDER, NCO_RANK_ORDER, sortEmployees, sortLicenses } from '../utils/sorting';

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
          medicalLicenses: 0,
          totalHours: 0,
          licenses: []
        });
      }
      
      const data = employeeMap.get(employeeId);
      data.licenses.push(license);
      
      if (license.license_type === 'يوم كامل') {
        data.fullDays += 1;
      } else if (license.license_type === 'إستئذان قصير') {
        data.halfDays += 1;
        data.totalHours += Number(license.hours) || 0;
      } else if (license.license_type === 'إستئذان طبي') {
        data.medicalLicenses += 1;
      }
    });
    
    const employeeReports = Array.from(employeeMap.values());
    
    // استخدام وظيفة sortEmployees من ملف sorting.ts لترتيب البيانات حسب الفئة والرتبة
    return employeeReports.sort((a, b) => {
      // استخدام نفس منطق الترتيب الموجود في وظيفة sortEmployees
      const employeeA = a.employee;
      const employeeB = b.employee;
      
      const categoryA = CATEGORY_ORDER[employeeA.category] || 99;
      const categoryB = CATEGORY_ORDER[employeeB.category] || 99;

      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }

      if (employeeA.category === 'ضابط') {
        const rankA = OFFICER_RANK_ORDER[employeeA.rank.replace(' حقوقي', '').trim()] || 99;
        const rankB = OFFICER_RANK_ORDER[employeeB.rank.replace(' حقوقي', '').trim()] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }

      if (employeeA.category === 'ضابط صف') {
        const rankA = NCO_RANK_ORDER[employeeA.rank] || 99;
        const rankB = NCO_RANK_ORDER[employeeB.rank] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }

      return employeeA.full_name.localeCompare(employeeB.full_name, 'ar');
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

  const handleCloseModal = () => {
    // Reset form and close modal
    setReportConfig({
      title: '',
      dateRange: {
        startDate: (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          return `${year}-${month}-01`;
        })(),
        endDate: new Date().toISOString().split('T')[0]
      },
      categories: [],
      includeDetails: false
    });
    setCurrentStep(1);
    setShowReport(false);
    setShowPreviewModal(false);
    
    // Remove the modal from DOM by reloading or navigating
    // This is the smart way - just reload the page to go back to main view
    window.location.href = window.location.pathname;
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.modalOpen) {
        handleCloseModal();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);



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
        <title></title>
        <style>
          @page {
            size: A4;
            margin: 2.5cm 1.27cm 1.5cm 1.27cm;
            orientation: portrait;
            @top-left { content: none !important; }
            @top-center { content: none !important; }
            @top-right { content: none !important; }
            @bottom-left { content: none !important; }
            @bottom-center { content: none !important; }
            @bottom-right { content: none !important; }
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
            padding-top: 50px;
            direction: rtl;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .report-header {
            text-align: center;
            margin-bottom: 0;
            flex: 0 0 auto;
            padding: 0;
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
            margin-bottom: 0;
            color: #000;
          }

          .report-date {
            font-family: 'Sultan Normal', 'Times New Roman', serif;
            font-size: 18pt;
            color: #000;
            text-align: center;
            margin-bottom: 0;
            font-weight:bold;
          }

          .report-date-range {
            color: #d00000;
          }

          .report-categories {
            font-family: 'Sultan Bold', 'Times New Roman', serif;
            font-size: 18pt;
            color: #ff0000;
            margin-bottom: 8px;
          }

          .table-wrapper {
            width: 100%;
            margin: 15px auto 0 auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            direction: rtl;
            table-layout: auto;
          }

          th, td {
            border: 1px solid #000;
            padding: 6px 4px;
            text-align: center;
            vertical-align: middle;
            font-family: 'Sultan Normal', 'Times New Roman', serif;
            font-size: 14pt;
          }

          th {
            background: #e0e0e0; /* رأس الجدول رمادي فاتح */
            font-family: 'Sultan Bold', 'Times New Roman', serif;
            font-size: 15pt;
          }

          thead tr {
            border-bottom-width: 2px;
          }

          tbody tr:nth-child(even) {
            background-color: #ffffff;
          }

          tbody tr:nth-child(odd) {
            background-color: #ffffff;
          }

          tbody td:first-child {
            background-color: #e0e0e0; /* عمود المسلسل رمادي فاتح بالكامل */
          }

          .number-cell {
            font-family: 'Sultan Bold', 'Times New Roman', serif;
            font-weight: bold;
          }

          .employee-name {
            text-align: center;
            padding-right: 0;
          }

          .rank-cell {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            text-align: center;
            padding: 6px 8px;
          }

          @media print {
            body {
              padding: 0;
              margin: 0;
            }

            .report-header {
              padding-top: 0;
            }

            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="content-wrapper">
          <div class="report-header">
            <h1 class="report-title">${reportConfig.title || `تقرير متابعة موظفي إدارة السجل العام لسنة <b>${new Date(reportConfig.dateRange.startDate).getFullYear()}`}</b></h1>
            <p class="report-date">من <span class="report-date-range">${reportConfig.dateRange.startDate.replace(/-/g, '/')}</span> إلى <span class="report-date-range">${reportConfig.dateRange.endDate.replace(/-/g, '/')}</span></p>
            ${reportConfig.categories.length > 0 ? `<p class="report-categories">( ${reportConfig.categories.map(cat => {
              if (cat === 'ضابط') return 'ضباط';
              if (cat === 'ضابط صف') return 'ضباط صف';
              if (cat === 'مهني') return 'مهنيين';
              if (cat === 'مدني') return 'مدنيين';
              return cat;
            }).join(' / ')} )</p>` : ''}
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: auto; min-width: 40px">م</th>
                  <th style="width: auto; min-width: 80px">الرتبة</th>
                  <th style="width: auto; min-width: 150px">الاسم</th>
                  <th style="width: auto; min-width: 70px">رخصة يوم</th>
                  <th style="width: auto; min-width: 70px">استئذان قصير</th>
                  <th style="width: auto; min-width: 80px">إستئذان طبي</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.map((item, index) => `
                  <tr>
                    <td class="number-cell">${index + 1}</td>
                    <td class="rank-cell">${(item.employee.category === 'ضابط' || item.employee.category === 'ضابط صف') ? item.employee.rank : item.employee.category}</td>
                    <td class="employee-name">${item.employee.full_name}</td>
                    <td class="number-cell">${item.fullDays}</td>
                    <td class="number-cell">${item.halfDays}</td>
                    <td class="number-cell">${item.medicalLicenses}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
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
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
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
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">رخصة يوم كامل</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">استئذان قصير</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">إستئذان طبي</th>
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
                      <td className="px-6 py-4 text-center">
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                          {data.medicalLicenses || '-'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  إنشاء تقرير جديد
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {currentStep === 1
                    ? 'حدد معايير التقرير'
                    : 'عرض بيانات التقرير'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-8 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex-shrink-0 flex items-center justify-between">
          {[
            { id: 1, title: 'إعدادات التقرير' },
            { id: 2, title: 'معاينة وطباعة' }
          ].map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                  currentStep > step.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : currentStep === step.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md ring-4 ring-blue-200'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold">{step.id}</span>
                  )}
                </div>
                <div className="flex-1 text-right mr-3">
                  <h3 className={`font-semibold text-sm ${
                    currentStep >= step.id ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </h3>
                </div>
              </div>
              {index < 1 && (
                <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${
                  currentStep > step.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                    : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-12 py-8 space-y-8">
            {currentStep === 1 && (
              <div className="space-y-8">
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

                <div className="relative z-50">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">اختيار الفئات</label>
                  <Select
                    isMulti
                    options={Object.keys(CATEGORY_ORDER).map(cat => ({ value: cat, label: cat }))}
                    value={reportConfig.categories.map(cat => ({ value: cat, label: cat }))}
                    onChange={(newValue) => setReportConfig(prev => ({
                      ...prev,
                      categories: newValue ? newValue.map((v: any) => v.value) : []
                    }))}
                    placeholder="اختر الفئات المراد تضمينها..."
                    styles={{
                      ...customSelectStyles,
                      menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
                    }}
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
              <div className="space-y-8">
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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-purple-700">
                              {reportData.reduce((sum, emp) => sum + emp.fullDays, 0)}
                            </div>
                            <div className="text-xs text-purple-600 font-medium">رخصة يوم كامل</div>
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
                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-pink-700">
                              {reportData.reduce((sum, emp) => sum + emp.medicalLicenses, 0)}
                            </div>
                            <div className="text-xs text-pink-600 font-medium">إستئذان طبي</div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-700">
                              {reportData.reduce((sum, emp) => sum + (Number(emp.totalHours) || 0), 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-green-600 font-medium">ساعات الاستئذانات القصيرة</div>
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
              </div>
            )}
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 flex-shrink-0 flex items-center justify-between">
          {currentStep === 2 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-md transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
              السابق
            </button>
          )}
          <div className="flex-1" />
          {currentStep === 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceedToNextStep()}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg ${
                canProceedToNextStep()
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              التالي
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handlePrint}
              className="flex items-center gap-3 px-8 py-3 rounded-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg transition-all duration-200"
            >
              <Printer className="w-5 h-5" />
              طباعة التقرير
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[98vh] overflow-hidden">
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
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">رخصة يوم كامل</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">استئذان قصير</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">إستئذان طبي</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold">ساعات الاستئذانات القصيرة</th>
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
                        <td className="border border-gray-300 px-4 py-3 text-center font-bold text-purple-600">{item.medicalLicenses}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center font-bold text-indigo-600">{Number(item.totalHours || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="no-print mt-6 bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{reportData.length}</div>
                    <div className="text-sm text-gray-600">إجمالي الموظفين</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{reportData.reduce((sum, emp) => sum + emp.fullDays, 0)}</div>
                    <div className="text-sm text-gray-600">رخصة يوم كامل</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{reportData.reduce((sum, emp) => sum + emp.halfDays, 0)}</div>
                    <div className="text-sm text-gray-600">الاستئذانات القصيرة</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-600">{reportData.reduce((sum, emp) => sum + emp.medicalLicenses, 0)}</div>
                    <div className="text-sm text-gray-600">الإستئذان الطبي</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{reportData.reduce((sum, emp) => sum + (Number(emp.totalHours) || 0), 0).toFixed(2)}</div>
                    <div className="text-sm text-gray-600">ساعات الاستئذانات القصيرة</div>
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

import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Packer, Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';
import { Search, FileText, Printer, Calendar, Users, Eye, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

import { LicenseService } from '../services/licenseService';
import { Employee, License } from '../types';
import { CATEGORY_ORDER, OFFICER_RANK_ORDER, NCO_RANK_ORDER } from '../utils/sorting';

// Constants for monthly limits
const MONTHLY_LIMITS = {
  FULL_DAY_LICENSES: 3, // حد الاستئذانات الطويلة: 3 مرات شهرياً (لا تُحتسب بالساعات)
  SHORT_LICENSES: 4, // حد الاستئذانات القصيرة: 4 مرات شهرياً
  MAX_SHORT_HOURS_PER_MONTH: 12, // حد ساعات الاستئذانات القصيرة فقط: 12 ساعة شهرياً
  HOURS_PER_SHORT_LICENSE: 3 // معدل 3 ساعات لكل استئذان قصير
};

// تاريخ بداية تطبيق الحدود الشهرية - أول يوم في الشهر الحالي
const getCurrentMonthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};
const MONTHLY_LIMITS_START_DATE = getCurrentMonthStart();

interface ReportConfig {
  title: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  categories: string[];
  reportType: 'yearly' | 'monthly' | 'employee' | 'multi';
  selectedYear?: string;
  selectedMonths: string[];
  selectedEmployees: string[];
}

interface EmployeeReportData {
  employee: Employee;
  fullDays: number;
  halfDays: number;
  totalHours: number;
}

interface MonthlyEmployeeStats {
  employee: Employee;
  fullDayLicenses: number;
  shortLicenses: number;
  totalHours: number; // ساعات الاستئذانات القصيرة فقط
  remainingFullDays: number;
  remainingShortLicenses: number;
  remainingShortHours: number; // الساعات المتبقية للاستئذانات القصيرة
  fullDayStatus: 'safe' | 'warning' | 'danger'; // حالة الاستئذانات الطويلة
  shortLicensesStatus: 'safe' | 'warning' | 'danger'; // حالة الاستئذانات القصيرة (عدد + ساعات)
  overallStatus: 'safe' | 'warning' | 'danger'; // الحالة العامة
}

// مكون الدائرة التقدمية
const ProgressCircle: React.FC<{
  current: number;
  max: number;
  status: 'safe' | 'warning' | 'danger';
  size?: number;
}> = ({ current, max, status, size = 48 }) => {
  const percentage = Math.min((current / max) * 100, 100);
  const circumference = 2 * Math.PI * 16; // نصف قطر 16
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    safe: '#10b981', // أخضر
    warning: '#f59e0b', // أصفر
    danger: '#ef4444' // أحمر
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* الدائرة الخلفية */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="16"
          stroke="#e5e7eb"
          strokeWidth="3"
          fill="transparent"
        />
        {/* دائرة التقدم */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="16"
          stroke={colors[status]}
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {/* الرقم في المنتصف */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${
          status === 'safe' ? 'text-green-700' :
          status === 'warning' ? 'text-yellow-700' :
          'text-red-700'
        }`}>
          {current}
        </span>
      </div>
    </div>
  );
};

const customSelectStyles = {
  control: (provided: any) => ({
    ...provided,
    minHeight: '44px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    '&:hover': {
      borderColor: '#3b82f6',
    },
    '&:focus-within': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    },
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    padding: '12px 16px',
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: '#1e40af',
    fontWeight: '500',
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: '#1e40af',
    '&:hover': {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },
  }),
};

const Reports: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'monthly-limits' | 'custom-reports'>('monthly-limits');
  
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
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
    reportType: 'multi',
    selectedYear: new Date().getFullYear().toString(),
    selectedMonths: [(new Date().getMonth() + 1).toString()],
    selectedEmployees: [],
  });

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

  // Calculate monthly stats for current month
  const calculateMonthlyStats = useMemo(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const stats: MonthlyEmployeeStats[] = [];

    // Get unique employees from licenses
    const uniqueEmployeesInData = new Map<string, Employee>();
    licenses.forEach(license => {
      if (license.employee) {
        uniqueEmployeesInData.set(license.employee.id.toString(), license.employee);
      }
    });

    Array.from(uniqueEmployeesInData.values()).forEach(employee => {
      const employeeLicenses = licenses.filter(license => {
        if (!license.employee || license.employee.id !== employee.id) return false;

        const licenseDate = new Date(license.license_date);
        return licenseDate.getFullYear() === currentYear &&
               licenseDate.getMonth() + 1 === currentMonth;
      });

      let fullDayLicenses = 0;
      let shortLicenses = 0;
      let totalHours = 0;

      employeeLicenses.forEach(license => {
        const licenseDate = new Date(license.license_date);
        const isAfterLimitsStart = licenseDate >= MONTHLY_LIMITS_START_DATE;

        if (isAfterLimitsStart) {
          // الاستئذان القصير: يُحتسب بالعدد والساعات
          if (license.license_type === 'نصف يوم') {
            shortLicenses++;
            totalHours += MONTHLY_LIMITS.HOURS_PER_SHORT_LICENSE; // 3 ساعات لكل استئذان قصير
          }
          // الاستئذان الطويل: يُحتسب بالعدد فقط (لا يُحتسب بالساعات)
          else if (license.license_type === 'يوم كامل') {
            fullDayLicenses++;
            // لا نضيف ساعات للاستئذان الطويل - هذا هو التصحيح المطلوب
          }
        }
      });

      const remainingFullDays = Math.max(0, MONTHLY_LIMITS.FULL_DAY_LICENSES - fullDayLicenses);
      const remainingShortLicenses = Math.max(0, MONTHLY_LIMITS.SHORT_LICENSES - shortLicenses);
      const remainingShortHours = Math.max(0, MONTHLY_LIMITS.MAX_SHORT_HOURS_PER_MONTH - totalHours);

      // تحديث المنطق حسب المتطلبات الجديدة
      let fullDayStatus: 'safe' | 'warning' | 'danger' = 'safe';
      let shortLicensesStatus: 'safe' | 'warning' | 'danger' = 'safe';

      // حالة الاستئذانات الطويلة
      if (fullDayLicenses > MONTHLY_LIMITS.FULL_DAY_LICENSES) {
        fullDayStatus = 'danger'; // تحذير: تجاوز اليوم الكامل
      } else if (fullDayLicenses === MONTHLY_LIMITS.FULL_DAY_LICENSES) {
        fullDayStatus = 'danger'; // تحذير: استنفاذ اليوم الكامل
      } else if (remainingFullDays === 1) {
        fullDayStatus = 'warning'; // تنبيه: تبقى رخصة واحدة
      } else {
        fullDayStatus = 'safe'; // ضمن حد اليوم الكامل
      }

      // حالة الاستئذانات القصيرة (دمج منطق العدد والساعات)
      const shortLicensesExceeded = shortLicenses > MONTHLY_LIMITS.SHORT_LICENSES;
      const shortLicensesExhausted = shortLicenses === MONTHLY_LIMITS.SHORT_LICENSES;
      const shortHoursExceeded = totalHours > MONTHLY_LIMITS.MAX_SHORT_HOURS_PER_MONTH;
      const shortHoursExhausted = totalHours === MONTHLY_LIMITS.MAX_SHORT_HOURS_PER_MONTH;

      if (shortLicensesExceeded || shortHoursExceeded) {
        shortLicensesStatus = 'danger'; // تحذير: تجاوز الاستئذانات القصيرة
      } else if (shortLicensesExhausted || shortHoursExhausted) {
        shortLicensesStatus = 'danger'; // تحذير: استنفاذ الاستئذانات القصيرة
      } else if (remainingShortLicenses === 1 || remainingShortHours <= 3) {
        shortLicensesStatus = 'warning'; // تنبيه: اقتراب من الاستنفاذ
      } else {
        shortLicensesStatus = 'safe'; // ضمن حد الاستئذانات القصيرة
      }

      // تحديد الحالة العامة
      const overallStatus = fullDayStatus === 'danger' || shortLicensesStatus === 'danger' ? 'danger' :
                           fullDayStatus === 'warning' || shortLicensesStatus === 'warning' ? 'warning' : 'safe';

      // Only include employees who have licenses this month
      if (employeeLicenses.length > 0) {
        stats.push({
          employee,
          fullDayLicenses,
          shortLicenses,
          totalHours,
          remainingFullDays,
          remainingShortLicenses,
          remainingShortHours,
          fullDayStatus,
          shortLicensesStatus,
          overallStatus
        });
      }
    });

    return stats.sort((a, b) => {
      // Sort by category first
      const categoryA = CATEGORY_ORDER[a.employee.category] ?? 99;
      const categoryB = CATEGORY_ORDER[b.employee.category] ?? 99;

      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }

      // Sort by military rank within each category
      if (a.employee.category === 'ضابط') {
        const rankA = OFFICER_RANK_ORDER[a.employee.rank.replace(' حقوقي', '').trim()] || 99;
        const rankB = OFFICER_RANK_ORDER[b.employee.rank.replace(' حقوقي', '').trim()] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }

      if (a.employee.category === 'ضابط صف') {
        const rankA = NCO_RANK_ORDER[a.employee.rank] || 99;
        const rankB = NCO_RANK_ORDER[b.employee.rank] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }

      // Finally sort by name
      return a.employee.full_name.localeCompare(b.employee.full_name, 'ar');
    });
  }, [licenses]);

  // Filter licenses based on config and search
  const filteredLicenses = useMemo(() => {
    let filtered = licenses.filter(license => {
      if (!license.employee) return false;

      const licenseDate = new Date(license.license_date);

      // Report type specific filtering
      if (reportConfig.reportType === 'yearly' && reportConfig.selectedYear) {
        if (licenseDate.getFullYear() !== parseInt(reportConfig.selectedYear)) {
          return false;
        }
      } else if (reportConfig.reportType === 'monthly' && reportConfig.selectedYear && reportConfig.selectedMonths.length > 0) {
        if (licenseDate.getFullYear() !== parseInt(reportConfig.selectedYear) ||
            !reportConfig.selectedMonths.includes((licenseDate.getMonth() + 1).toString())) {
          return false;
        }
      } else if (reportConfig.reportType === 'employee' && reportConfig.selectedEmployees.length > 0) {
        if (!reportConfig.selectedEmployees.includes(license.employee.id.toString())) {
          return false;
        }
      } else if (reportConfig.reportType === 'multi') {
        // Multi-criteria filtering
        let passesFilter = true;

        // Year filter
        if (reportConfig.selectedYear && licenseDate.getFullYear() !== parseInt(reportConfig.selectedYear)) {
          passesFilter = false;
        }

        // Months filter
        if (reportConfig.selectedMonths.length > 0 &&
            !reportConfig.selectedMonths.includes((licenseDate.getMonth() + 1).toString())) {
          passesFilter = false;
        }

        // Employees filter
        if (reportConfig.selectedEmployees.length > 0 &&
            !reportConfig.selectedEmployees.includes(license.employee.id.toString())) {
          passesFilter = false;
        }

        if (!passesFilter) return false;
      }

      // Category filter
      if (reportConfig.categories.length > 0 && !reportConfig.categories.includes(license.employee.category)) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          license.employee.full_name.toLowerCase().includes(searchLower) ||
          license.employee.rank.toLowerCase().includes(searchLower) ||
          license.employee.category.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    return filtered;
  }, [licenses, reportConfig, searchTerm]);

  // Generate report data
  const reportData = useMemo(() => {
    const employeeMap = new Map<string, EmployeeReportData>();

    filteredLicenses.forEach(license => {
      if (!license.employee) return;

      const employeeId = license.employee.id.toString();
      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employee: license.employee,
          fullDays: 0,
          halfDays: 0,
          totalHours: 0
        });
      }

      const data = employeeMap.get(employeeId)!

      if (license.license_type === 'يوم كامل') {
        data.fullDays += 1;
        // الاستئذانات الطويلة لا تُحتسب بالساعات
      } else if (license.license_type === 'نصف يوم') {
        data.halfDays += 1;
        data.totalHours += MONTHLY_LIMITS.HOURS_PER_SHORT_LICENSE; // 3 ساعات لكل استئذان قصير
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) => {
      // Sort by category first
      const aCategoryOrder = CATEGORY_ORDER[a.employee.category] || 99;
      const bCategoryOrder = CATEGORY_ORDER[b.employee.category] || 99;

      if (aCategoryOrder !== bCategoryOrder) {
        return aCategoryOrder - bCategoryOrder;
      }

      // Sort by military rank within each category
      if (a.employee.category === 'ضابط') {
        const rankA = OFFICER_RANK_ORDER[a.employee.rank.replace(' حقوقي', '').trim()] || 99;
        const rankB = OFFICER_RANK_ORDER[b.employee.rank.replace(' حقوقي', '').trim()] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }

      if (a.employee.category === 'ضابط صف') {
        const rankA = NCO_RANK_ORDER[a.employee.rank] || 99;
        const rankB = NCO_RANK_ORDER[b.employee.rank] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }

      // Finally sort by name
      return a.employee.full_name.localeCompare(b.employee.full_name, 'ar');
    });
  }, [filteredLicenses]);

  // Get unique employees for employee selector
  const uniqueEmployees = useMemo(() => {
    const employeeMap = new Map();
    licenses.forEach(license => {
      if (license.employee && !employeeMap.has(license.employee.id)) {
        employeeMap.set(license.employee.id, license.employee);
      }
    });
    return Array.from(employeeMap.values()).sort((a: Employee, b: Employee) => {
      // Sort by category first
      const categoryA = CATEGORY_ORDER[a.category] || 99;
      const categoryB = CATEGORY_ORDER[b.category] || 99;

      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }

      // Sort by military rank within each category
      if (a.category === 'ضابط') {
        const rankA = OFFICER_RANK_ORDER[a.rank.replace(' حقوقي', '').trim()] || 99;
        const rankB = OFFICER_RANK_ORDER[b.rank.replace(' حقوقي', '').trim()] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }

      if (a.category === 'ضابط صف') {
        const rankA = NCO_RANK_ORDER[a.rank] || 99;
        const rankB = NCO_RANK_ORDER[b.rank] || 99;
        if (rankA !== rankB) return rankA - rankB;
      }

      // Finally sort by name
      return a.full_name.localeCompare(b.full_name, 'ar');
    });
  }, [licenses]);

  // Get unique years and months
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    licenses.forEach(license => {
      years.add(new Date(license.license_date).getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [licenses]);

  const availableMonths = [
    { value: '1', label: 'يناير' },
    { value: '2', label: 'فبراير' },
    { value: '3', label: 'مارس' },
    { value: '4', label: 'أبريل' },
    { value: '5', label: 'مايو' },
    { value: '6', label: 'يونيو' },
    { value: '7', label: 'يوليو' },
    { value: '8', label: 'أغسطس' },
    { value: '9', label: 'سبتمبر' },
    { value: '10', label: 'أكتوبر' },
    { value: '11', label: 'نوفمبر' },
    { value: '12', label: 'ديسمبر' }
  ];

  // Generate report title and subtitle based on filters
  const generateReportInfo = () => {
    let title = 'تقرير متابعة موظفي إدارة السجل العام';
    let subtitle = '';
    let monthsText = '';
    let categoriesText = '';

    // Add year to title if selected
    if (reportConfig.selectedYear) {
      title += ` لسنة ${reportConfig.selectedYear}`;
    }

    // Add months subtitle if selected
    if (reportConfig.selectedMonths.length > 0) {
      if (reportConfig.selectedMonths.length === 1) {
        const monthName = availableMonths.find(m => m.value === reportConfig.selectedMonths[0])?.label;
        monthsText = `لشهر ${monthName}`;
      } else if (reportConfig.selectedMonths.length === 12) {
        monthsText = 'لجميع أشهر السنة';
      } else {
        const monthNames = reportConfig.selectedMonths
          .map(m => availableMonths.find(month => month.value === m)?.label)
          .join(' و ');
        monthsText = `لأشهر ${monthNames}`;
      }
    }

    // Add categories if selected
    if (reportConfig.categories.length > 0) {
      if (reportConfig.categories.length === 1) {
        const category = reportConfig.categories[0];
        if (category === 'ضابط') categoriesText = '( ضباط )';
        else if (category === 'ضابط صف') categoriesText = '( ضباط صف )';
        else if (category === 'مهني') categoriesText = '( مهنيين )';
        else if (category === 'مدني') categoriesText = '( مدنيين )';
        else categoriesText = `( ${category} )`;
      } else {
        const categoryNames = reportConfig.categories.map(cat => {
          if (cat === 'ضابط') return 'ضباط';
          if (cat === 'ضابط صف') return 'ضباط صف';
          if (cat === 'مهني') return 'مهنيين';
          if (cat === 'مدني') return 'مدنيين';
          return cat;
        }).join(' / ');
        categoriesText = `( ${categoryNames} )`;
      }
    }

    // Combine subtitle parts
    const subtitleParts = [monthsText, categoriesText].filter(Boolean);
    subtitle = subtitleParts.join(' ');

    return { title, subtitle };
  };

  // Handle print for custom reports
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const { title: reportTitle, subtitle } = generateReportInfo();

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
            font-weight: bold;
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
            border: 1px solid #000;
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

          table, th, td {
            border-width: 2px;
            border-style: solid;
            border-collapse: collapse;
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
            <h1 class="report-title">${reportTitle}</h1>
            ${subtitle ? `<p class="report-categories">${subtitle}</p>` : ''}
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

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6 m-auto">
          {/* Tabs */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div
                onClick={() => setActiveTab('monthly-limits')}
                className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-300 ${
                  activeTab === 'monthly-limits'
                    ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    activeTab === 'monthly-limits' ? 'bg-blue-600' : 'bg-blue-100'
                  }`}>
                    <Clock className={`w-8 h-8 ${
                      activeTab === 'monthly-limits' ? 'text-white' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${
                      activeTab === 'monthly-limits' ? 'text-blue-700' : 'text-gray-800'
                    }`}>
                      الحدود الشهرية
                    </h3>
                    <p className="text-gray-600 mt-1">
                      متابعة حدود الاستئذانات الشهرية للموظفين
                    </p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {calculateMonthlyStats.length} موظف
                      </span>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {calculateMonthlyStats.filter(s => s.overallStatus === 'danger').length} تحذير
                      </span>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {calculateMonthlyStats.filter(s => s.overallStatus === 'warning').length} تنبيه
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {calculateMonthlyStats.filter(s => s.overallStatus === 'safe').length} آمن
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('custom-reports')}
                className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-300 ${
                  activeTab === 'custom-reports'
                    ? 'border-purple-500 bg-purple-50 shadow-lg transform scale-105'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    activeTab === 'custom-reports' ? 'bg-purple-600' : 'bg-purple-100'
                  }`}>
                    <FileText className={`w-8 h-8 ${
                      activeTab === 'custom-reports' ? 'text-white' : 'text-purple-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${
                      activeTab === 'custom-reports' ? 'text-purple-700' : 'text-gray-800'
                    }`}>
                      التقارير المخصصة
                    </h3>
                    <p className="text-gray-600 mt-1">
                      إنشاء تقارير مخصصة بمعايير متقدمة
                    </p>
                    <div className="flex gap-2 mt-3">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {reportData.length} موظف
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {filteredLicenses.length} رخصة
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Limits Card */}
        {activeTab === 'monthly-limits' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">الحدود الشهرية للاستئذانات</h2>
                    <p className="text-sm text-gray-600">
                      من بداية {MONTHLY_LIMITS_START_DATE.toLocaleDateString('ar-US')} - وما قبل ذلك لا يتبع الحدود الشهرية
                    </p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        حد الاستئذانات الطويلة: {MONTHLY_LIMITS.FULL_DAY_LICENSES}
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        حد الاستئذانات القصيرة: {MONTHLY_LIMITS.SHORT_LICENSES}
                      </span>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        حد ساعات الاستئذانات القصيرة: {MONTHLY_LIMITS.MAX_SHORT_HOURS_PER_MONTH}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">الشهر الحالي</div>
                  <div className="text-lg font-bold text-blue-600">
                    {new Date().toLocaleDateString('ar-US', { year: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              {calculateMonthlyStats.length > 0 ? (
                <>
                  {/* Search for Monthly Limits */}
                  <div className="mb-6">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ابحث عن موظف بالاسم أو الرتبة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                      />
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                  </div>



                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border-4 border-gray-100">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 text-sm">م</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 text-sm">الرتبة</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">الاسم</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 text-sm">استئذانات طويلة</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 text-sm">استئذانات قصيرة</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-700 text-sm">ساعات الاستئذانات القصيرة</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {calculateMonthlyStats
                          .filter(stat => {
                            if (!searchTerm) return true;
                            const searchLower = searchTerm.toLowerCase();
                            return (
                              stat.employee.full_name.toLowerCase().includes(searchLower) ||
                              stat.employee.rank.toLowerCase().includes(searchLower) ||
                              stat.employee.category.toLowerCase().includes(searchLower)
                            );
                          })
                          .map((stat,index) => (
                          <tr>
                           <td className="py-4 px-3 text-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 mx-auto">
                               {index + 1}
                              </div>                              
                            </td>
                            <td className="py-4 px-3 text-center">
                                {stat.employee.category === 'ضابط' || stat.employee.category === 'ضابط صف'
                                  ? stat.employee.rank
                                  : stat.employee.category}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{stat.employee.full_name}</span>
                                <span className="text-sm text-gray-400">رقم الملف: {stat.employee.file_number}</span>
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <ProgressCircle
                                  current={stat.fullDayLicenses}
                                  max={MONTHLY_LIMITS.FULL_DAY_LICENSES}
                                  status={stat.fullDayStatus}
                                  size={52}
                                />
                                <span className="text-xs text-gray-500">من {MONTHLY_LIMITS.FULL_DAY_LICENSES}</span>
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <ProgressCircle
                                  current={stat.shortLicenses}
                                  max={MONTHLY_LIMITS.SHORT_LICENSES}
                                  status={stat.shortLicensesStatus}
                                  size={52}
                                />
                                <span className="text-xs text-gray-500">من {MONTHLY_LIMITS.SHORT_LICENSES}</span>
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <ProgressCircle
                                  current={stat.totalHours}
                                  max={MONTHLY_LIMITS.MAX_SHORT_HOURS_PER_MONTH}
                                  status={stat.shortLicensesStatus}
                                  size={52}
                                />
                                <span className="text-xs text-gray-500">من {MONTHLY_LIMITS.MAX_SHORT_HOURS_PER_MONTH} ساعة</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center">
                                {stat.overallStatus === 'danger' ? (
                                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <span className="text-red-700 font-semibold text-sm">
                                      {stat.fullDayStatus === 'danger' ? 'تحذير استئذانات طويلة' : 'تحذير استئذانات قصيرة'}
                                    </span>
                                  </div>
                                ) : stat.overallStatus === 'warning' ? (
                                  <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                                    <Clock className="w-4 h-4 text-yellow-600" />
                                    <span className="text-yellow-700 font-semibold text-sm">
                                      {stat.fullDayStatus === 'warning' ? 'تنبيه استئذانات طويلة' : 'تنبيه استئذانات قصيرة'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-green-700 font-semibold text-sm">ضمن الحد</span>
                                  </div>
                                )}
                              </div>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* No Results Message */}
                    {calculateMonthlyStats.filter(stat => {
                      if (!searchTerm) return true;
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        stat.employee.full_name.toLowerCase().includes(searchLower) ||
                        stat.employee.rank.toLowerCase().includes(searchLower) ||
                        stat.employee.category.toLowerCase().includes(searchLower)
                      );
                    }).length === 0 && searchTerm && (
                      <div className="text-center py-8">
                        <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد نتائج</h3>
                        <p className="text-gray-500">لا يوجد موظفين يطابقون البحث "{searchTerm}"</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد بيانات للشهر الحالي</h3>
                  <p className="text-gray-500">لم يتم تسجيل أي استئذانات هذا الشهر</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Reports Card */}
        {activeTab === 'custom-reports' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">التقارير المخصصة</h2>
                  <p className="text-sm text-gray-600">إنشاء تقارير مخصصة بمعايير متقدمة</p>
                </div>
              </div>
            </div>

            {/* Report Type Cards */}
            <div className="px-8 py-6 border-b border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-4">نوع التقرير</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setReportConfig(prev => ({ ...prev, reportType: 'multi' }))}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    reportConfig.reportType === 'multi'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-lg'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <FileText className="w-8 h-8 mx-auto mb-3 text-indigo-600" />
                  <div className="font-bold text-lg">تقرير شامل</div>
                  <div className="text-sm text-gray-600 mt-1">معايير متعددة ومرونة كاملة</div>
                </button>

                <button
                  onClick={() => setReportConfig(prev => ({ ...prev, reportType: 'yearly' }))}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    reportConfig.reportType === 'yearly'
                      ? 'border-green-500 bg-green-50 text-green-700 shadow-lg'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <Calendar className="w-8 h-8 mx-auto mb-3 text-green-600" />
                  <div className="font-bold text-lg">تقرير سنوي</div>
                  <div className="text-sm text-gray-600 mt-1">رخص سنة كاملة</div>
                </button>

                <button
                  onClick={() => setReportConfig(prev => ({ ...prev, reportType: 'monthly' }))}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    reportConfig.reportType === 'monthly'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-lg'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  <Calendar className="w-8 h-8 mx-auto mb-3 text-orange-600" />
                  <div className="font-bold text-lg">تقرير شهري</div>
                  <div className="text-sm text-gray-600 mt-1">أشهر محددة</div>
                </button>

                <button
                  onClick={() => setReportConfig(prev => ({ ...prev, reportType: 'employee' }))}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    reportConfig.reportType === 'employee'
                      ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <Users className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                  <div className="font-bold text-lg">تقرير موظفين</div>
                  <div className="text-sm text-gray-600 mt-1">موظفين محددين</div>
                </button>
              </div>
            </div>

            {/* Dynamic Filters Based on Report Type */}
            <div className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">الفلاتر والمعايير</h3>

              {/* Common Search Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">البحث</label>
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الرتبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />
              </div>

              {/* Yearly Report Filters */}
              {reportConfig.reportType === 'yearly' && (
                <div className="bg-green-50 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    تقرير سنوي
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        السنة <span className="text-red-500">*</span>
                      </label>
                    <select
                      value={reportConfig.selectedYear || ''}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, selectedYear: e.target.value || undefined }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="">اختر السنة</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">الفئة</label>
                    <select
                      value={reportConfig.categories[0] || ''}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        categories: e.target.value ? [e.target.value] : []
                      }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="">جميع الفئات</option>
                      <option value="ضابط">ضابط</option>
                      <option value="ضابط صف">ضابط صف</option>
                      <option value="مهني">مهني</option>
                      <option value="مدني">مدني</option>
                    </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Report Filters */}
              {reportConfig.reportType === 'monthly' && (
                <div className="bg-orange-50 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    تقرير شهري
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        السنة <span className="text-red-500">*</span>
                      </label>
                    <select
                      value={reportConfig.selectedYear || ''}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, selectedYear: e.target.value || undefined }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="">اختر السنة</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">الشهر *</label>
                    <select
                      value={reportConfig.selectedMonths[0] || ''}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        selectedMonths: e.target.value ? [e.target.value] : []
                      }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="">اختر الشهر</option>
                      {availableMonths.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">الفئة</label>
                    <select
                      value={reportConfig.categories[0] || ''}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        categories: e.target.value ? [e.target.value] : []
                      }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="">جميع الفئات</option>
                      <option value="ضابط">ضابط</option>
                      <option value="ضابط صف">ضابط صف</option>
                      <option value="مهني">مهني</option>
                      <option value="مدني">مدني</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Employee Report Filters */}
              {reportConfig.reportType === 'employee' && (
                <div className="bg-purple-50 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    تقرير موظفين
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        الموظفين <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        {/* Search Input */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="ابحث عن موظف بالاسم أو الرتبة..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                          />
                          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>

                        {/* Selected Employees */}
                        {reportConfig.selectedEmployees.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-blue-800">
                                الموظفين المحددين ({reportConfig.selectedEmployees.length})
                              </span>
                              <button
                                onClick={() => setReportConfig(prev => ({ ...prev, selectedEmployees: [] }))}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                مسح الكل
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {reportConfig.selectedEmployees.map(empId => {
                                const emp = uniqueEmployees.find((e: Employee) => e.id.toString() === empId);
                                return emp ? (
                                  <div key={empId} className="bg-white px-3 py-1 rounded-full border border-blue-300 flex items-center gap-2">
                                    <span className="text-sm text-blue-800">{emp.full_name}</span>
                                    <button
                                      onClick={() => {
                                        setReportConfig(prev => ({
                                          ...prev,
                                          selectedEmployees: prev.selectedEmployees.filter(id => id !== empId)
                                        }));
                                      }}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {/* Employee List */}
                        <div className="border-2 border-gray-200 rounded-xl max-h-40 overflow-y-auto">
                          {uniqueEmployees
                            .filter((emp: Employee) => {
                              if (!searchTerm) return true;
                              const searchLower = searchTerm.toLowerCase();
                              return (
                                emp.full_name.toLowerCase().includes(searchLower) ||
                                emp.rank.toLowerCase().includes(searchLower) ||
                                emp.category.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((emp: Employee) => {
                              const isSelected = reportConfig.selectedEmployees.includes(emp.id.toString());
                              return (
                                <div
                                  key={emp.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setReportConfig(prev => ({
                                        ...prev,
                                        selectedEmployees: prev.selectedEmployees.filter(id => id !== emp.id.toString())
                                      }));
                                    } else {
                                      setReportConfig(prev => ({
                                        ...prev,
                                        selectedEmployees: [...prev.selectedEmployees, emp.id.toString()]
                                      }));
                                    }
                                  }}
                                  className={`p-3 border-b border-gray-100 cursor-pointer transition-colors duration-200 ${
                                    isSelected
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-gray-900">{emp.full_name}</div>
                                      <div className="text-sm text-gray-600">{emp.rank} - {emp.category}</div>
                                    </div>
                                    {isSelected && (
                                      <CheckCircle className="w-5 h-5 text-blue-600" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          {uniqueEmployees.filter((emp: Employee) => {
                            if (!searchTerm) return true;
                            const searchLower = searchTerm.toLowerCase();
                            return (
                              emp.full_name.toLowerCase().includes(searchLower) ||
                              emp.rank.toLowerCase().includes(searchLower) ||
                              emp.category.toLowerCase().includes(searchLower)
                            );
                          }).length === 0 && (
                            <div className="p-4 text-center text-gray-500">
                              لا توجد نتائج للبحث
                            </div>
                          )}
                        </div>
                      </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">الفئة</label>
                    <select
                      value={reportConfig.categories[0] || ''}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        categories: e.target.value ? [e.target.value] : []
                      }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option value="">جميع الفئات</option>
                      <option value="ضابط">ضابط</option>
                      <option value="ضابط صف">ضابط صف</option>
                      <option value="مهني">مهني</option>
                      <option value="مدني">مدني</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi (Comprehensive) Report Filters */}
              {reportConfig.reportType === 'multi' && (
                <div className="space-y-6">
                  {/* Time Period Section */}
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      الفترة الزمنية
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">السنة</label>
                        <select
                          value={reportConfig.selectedYear || ''}
                          onChange={(e) => setReportConfig(prev => ({ ...prev, selectedYear: e.target.value || undefined }))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                        >
                          <option value="">جميع السنوات</option>
                          {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">الأشهر</label>
                        <select
                          multiple
                          value={reportConfig.selectedMonths}
                          onChange={(e) => {
                            const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                            setReportConfig(prev => ({ ...prev, selectedMonths: selectedValues }));
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white h-32"
                        >
                          {availableMonths.map(month => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">اضغط Ctrl للاختيار المتعدد</p>
                      </div>
                    </div>
                  </div>

                  {/* Employees and Categories Section */}
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      الموظفين والفئات
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">الموظفين</label>
                        <div className="space-y-3">
                          {/* Search Input */}
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="ابحث عن موظف بالاسم أو الرتبة..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                            />
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          </div>

                          {/* Selected Employees */}
                          {reportConfig.selectedEmployees.length > 0 && (
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-purple-800">
                                  الموظفين المحددين ({reportConfig.selectedEmployees.length})
                                </span>
                                <button
                                  onClick={() => setReportConfig(prev => ({ ...prev, selectedEmployees: [] }))}
                                  className="text-purple-600 hover:text-purple-800 text-xs"
                                >
                                  مسح الكل
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {reportConfig.selectedEmployees.map(empId => {
                                  const emp = uniqueEmployees.find((e: Employee) => e.id.toString() === empId);
                                  return emp ? (
                                    <div key={empId} className="bg-white px-3 py-1 rounded-full border border-purple-300 flex items-center gap-2">
                                      <span className="text-sm text-purple-800">{emp.full_name}</span>
                                      <button
                                        onClick={() => {
                                          setReportConfig(prev => ({
                                            ...prev,
                                            selectedEmployees: prev.selectedEmployees.filter(id => id !== empId)
                                          }));
                                        }}
                                        className="text-purple-600 hover:text-purple-800"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}

                          {/* Employee List */}
                          <div className="border-2 border-gray-200 rounded-xl max-h-32 overflow-y-auto">
                            {uniqueEmployees
                              .filter((emp: Employee) => {
                                if (!searchTerm) return true;
                                const searchLower = searchTerm.toLowerCase();
                                return (
                                  emp.full_name.toLowerCase().includes(searchLower) ||
                                  emp.rank.toLowerCase().includes(searchLower) ||
                                  emp.category.toLowerCase().includes(searchLower)
                                );
                              })
                              .map((emp: Employee) => {
                                const isSelected = reportConfig.selectedEmployees.includes(emp.id.toString());
                                return (
                                  <div
                                    key={emp.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setReportConfig(prev => ({
                                          ...prev,
                                          selectedEmployees: prev.selectedEmployees.filter(id => id !== emp.id.toString())
                                        }));
                                      } else {
                                        setReportConfig(prev => ({
                                          ...prev,
                                          selectedEmployees: [...prev.selectedEmployees, emp.id.toString()]
                                        }));
                                      }
                                    }}
                                    className={`p-2 border-b border-gray-100 cursor-pointer transition-colors duration-200 ${
                                      isSelected
                                        ? 'bg-purple-50 border-purple-200'
                                        : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium text-gray-900 text-sm">{emp.full_name}</div>
                                        <div className="text-xs text-gray-600">{emp.rank}</div>
                                      </div>
                                      {isSelected && (
                                        <CheckCircle className="w-4 h-4 text-purple-600" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            {uniqueEmployees.filter((emp: Employee) => {
                              if (!searchTerm) return true;
                              const searchLower = searchTerm.toLowerCase();
                              return (
                                emp.full_name.toLowerCase().includes(searchLower) ||
                                emp.rank.toLowerCase().includes(searchLower) ||
                                emp.category.toLowerCase().includes(searchLower)
                              );
                            }).length === 0 && (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                لا توجد نتائج للبحث
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">الفئات</label>
                        <select
                          multiple
                          value={reportConfig.categories}
                          onChange={(e) => {
                            const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                            setReportConfig(prev => ({ ...prev, categories: selectedValues }));
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white h-32"
                        >
                          <option value="ضابط">ضابط</option>
                          <option value="ضابط صف">ضابط صف</option>
                          <option value="مهني">مهني</option>
                          <option value="مدني">مدني</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">اضغط Ctrl للاختيار المتعدد</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">إجراءات التقرير</h3>
                  <p className="text-sm text-gray-600">طباعة وتصدير التقرير</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    disabled={reportData.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-5 h-5" />
                    طباعة التقرير
                  </button>
                  <button
                    disabled={reportData.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-5 h-5" />
                    تصدير Word
                  </button>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="p-8">
              {reportData.length > 0 ? (
                <>
                  {/* Report Summary */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">ملخص التقرير</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <div className="w-4 h-4 bg-blue-500 rounded mx-auto mb-2"></div>
                        <div className="text-2xl font-bold text-blue-700">{reportData.length}</div>
                        <div className="text-sm text-blue-600 font-medium">إجمالي الموظفين</div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-2"></div>
                        <div className="text-2xl font-bold text-green-700">
                          {reportData.reduce((sum, emp) => sum + emp.fullDays + emp.halfDays, 0)}
                        </div>
                        <div className="text-sm text-green-600 font-medium">إجمالي الاستئذانات</div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                        <div className="w-4 h-4 bg-purple-500 rounded mx-auto mb-2"></div>
                        <div className="text-2xl font-bold text-purple-700">
                          {reportData.reduce((sum, emp) => sum + emp.fullDays, 0)}
                        </div>
                        <div className="text-sm text-purple-600 font-medium">استئذانات طويلة</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                        <div className="w-4 h-4 bg-orange-500 rounded mx-auto mb-2"></div>
                        <div className="text-2xl font-bold text-orange-700">
                          {reportData.reduce((sum, emp) => sum + emp.halfDays, 0)}
                        </div>
                        <div className="text-sm text-orange-600 font-medium">استئذانات قصيرة</div>
                      </div>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-right py-4 px-4 font-bold text-gray-700">م</th>
                          <th className="text-right py-4 px-4 font-bold text-gray-700">الرتبة</th>
                          <th className="text-right py-4 px-4 font-bold text-gray-700">الاسم</th>
                          <th className="text-center py-4 px-4 font-bold text-gray-700">رقم الملف</th>
                          <th className="text-center py-4 px-4 font-bold text-gray-700">استئذانات طويلة</th>
                          <th className="text-center py-4 px-4 font-bold text-gray-700">استئذانات قصيرة</th>
                          <th className="text-center py-4 px-4 font-bold text-gray-700">ساعات الاستئذانات القصيرة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportData.map((item, index) => (
                          <tr key={item.employee.id} className="hover:bg-gray-50">
                            <td className="py-4 px-4 text-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                                {index + 1}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-gray-700">
                              {item.employee.category === 'ضابط' || item.employee.category === 'ضابط صف'
                                ? item.employee.rank
                                : item.employee.category}
                            </td>
                            <td className="py-4 px-4 font-bold text-gray-900">{item.employee.full_name}</td>
                            <td className="py-4 px-4 text-center text-gray-700">{item.employee.file_number}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                                {item.fullDays}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
                                {item.halfDays}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                {item.totalHours > 0 ? `${item.totalHours} ساعة` : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد نتائج</h3>
                  <p className="text-gray-500">لا توجد بيانات تطابق المعايير المحددة</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

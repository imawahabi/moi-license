import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Search, FileText, Calendar, Users, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { Employee, License } from '../types';
import { CATEGORY_ORDER, sortEmployees, sortLicenses } from '../utils/sorting';

// Constants for monthly limits
const MONTHLY_LIMITS = {
  FULL_DAY_LICENSES: 3,
  SHORT_LICENSES: 4,
  MAX_HOURS_PER_MONTH: 12,
  MEDICAL_LICENSES: Infinity // بدون حدود
};

interface MonthlyEmployeeStats {
  employee: Employee;
  fullDayLicenses: number;
  shortLicenses: number;
  medicalLicenses: number;
  totalHours: number;
  remainingFullDays: number;
  remainingShortLicenses: number;
  remainingMedicalLicenses: number;
  remainingHours: number;
  status: 'safe' | 'warning' | 'danger';
  warnings: string[];
}

interface ReportFilters {
  selectedYear: string;
  selectedMonth: string;
  selectedEmployees: string[];
  categories: string[];
}

const customSelectStyles = {
  control: (provided: any) => ({
    ...provided,
    minHeight: '40px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
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
    padding: '8px 12px',
  }),
};

interface ReportStep {
  id: number;
  title: string;
}

const ReportsNew: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly-limits' | 'detailed'>('overview');
  const [currentStep, setCurrentStep] = useState(1);
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = (currentDate.getMonth() + 1).toString();
  
  const [filters, setFilters] = useState<ReportFilters>({
    selectedYear: currentYear,
    selectedMonth: currentMonth,
    selectedEmployees: [],
    categories: []
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const licensesData = await LicenseService.getAll();
        setLicenses(licensesData);
      } catch (error) {
        console.error('Failed to load licenses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get unique employees and years
  const uniqueEmployees = useMemo(() => {
    const employeeMap = new Map();
    licenses.forEach(license => {
      if (license.employee && !employeeMap.has(license.employee.id)) {
        employeeMap.set(license.employee.id, license.employee);
      }
    });
    return Array.from(employeeMap.values());
  }, [licenses]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    licenses.forEach(license => {
      const year = new Date(license.license_date).getFullYear().toString();
      years.add(year);
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

  // Calculate monthly stats for each employee
  const monthlyStats = useMemo(() => {
    const stats: MonthlyEmployeeStats[] = [];
    
    uniqueEmployees.forEach(employee => {
      const employeeLicenses = licenses.filter(license => {
        if (!license.employee || license.employee.id !== employee.id) return false;
        
        const licenseDate = new Date(license.license_date);
        const licenseYear = licenseDate.getFullYear().toString();
        const licenseMonth = (licenseDate.getMonth() + 1).toString();
        
        return licenseYear === filters.selectedYear && licenseMonth === filters.selectedMonth;
      });

      let fullDayLicenses = 0;
      let shortLicenses = 0;
      let medicalLicenses = 0;
      let totalHours = 0;

      employeeLicenses.forEach(license => {
        if (license.license_type === 'يوم كامل') {
          fullDayLicenses++;
        } else if (license.license_type === 'إستئذان قصير') {
          shortLicenses++;
          totalHours += license.hours || 0;
        } else if (license.license_type === 'إستئذان طبي') {
          medicalLicenses++;
        } else {
          fullDayLicenses++;
        }
      });

      const remainingFullDays = Math.max(0, MONTHLY_LIMITS.FULL_DAY_LICENSES - fullDayLicenses);
      const remainingShortLicenses = Math.max(0, MONTHLY_LIMITS.SHORT_LICENSES - shortLicenses);
      const remainingMedicalLicenses = Math.max(0, MONTHLY_LIMITS.MEDICAL_LICENSES - medicalLicenses);
      const remainingHours = Math.max(0, MONTHLY_LIMITS.MAX_HOURS_PER_MONTH - totalHours);

      const warnings: string[] = [];
      let statusOverLimit: 'safe' | 'warning' | 'danger' = 'safe';

      if (fullDayLicenses > MONTHLY_LIMITS.FULL_DAY_LICENSES) {
        warnings.push(`تجاوز حد الاستئذانات الطويلة (${fullDayLicenses}/${MONTHLY_LIMITS.FULL_DAY_LICENSES})`);
        statusOverLimit = 'danger';
      }

      if (shortLicenses > MONTHLY_LIMITS.SHORT_LICENSES) {
        warnings.push(`تجاوز حد الاستئذانات القصيرة (${shortLicenses}/${MONTHLY_LIMITS.SHORT_LICENSES})`);
        statusOverLimit = 'danger';
      }

      // الإستئذان الطبي بدون حدود - لا تحذيرات

      if (totalHours > MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
        warnings.push(`تجاوز حد الساعات الشهرية (${totalHours}/${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH})`);
        statusOverLimit = 'danger';
      }

      stats.push({
        employee,
        fullDayLicenses,
        shortLicenses,
        medicalLicenses,
        totalHours,
        remainingFullDays,
        remainingShortLicenses,
        remainingMedicalLicenses,
        remainingHours,
        status: statusOverLimit,
        warnings
      });
    });

    const filteredStats = stats.filter(stat => {
      // Apply filters
      if (filters.selectedEmployees.length > 0 && !filters.selectedEmployees.includes(stat.employee.id.toString())) {
        return false;
      }
      
      if (filters.categories.length > 0 && !filters.categories.includes(stat.employee.category)) {
        return false;
      }

      // Apply search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          stat.employee.full_name.toLowerCase().includes(searchLower) ||
          stat.employee.rank.toLowerCase().includes(searchLower) ||
          stat.employee.file_number.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
    
    // استخدام وظيفة sortEmployees من ملف sorting.ts لترتيب الإحصائيات حسب الفئة والرتبة
    return filteredStats.sort((a, b) => {
      // استخدام نفس منطق الترتيب الموجود في وظيفة sortEmployees
      const employeeA = a.employee;
      const employeeB = b.employee;
      
      const categoryA = CATEGORY_ORDER[employeeA.category] || 99;
      const categoryB = CATEGORY_ORDER[employeeB.category] || 99;

      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }
      
      return employeeA.full_name.localeCompare(employeeB.full_name, 'ar');
    });
  }, [uniqueEmployees, licenses, filters, searchTerm]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const totalEmployees = monthlyStats.length;
    const employeesOverLimit = monthlyStats.filter(stat => stat.status === 'danger').length;
    const totalFullDayLicenses = monthlyStats.reduce((sum, stat) => sum + stat.fullDayLicenses, 0);
    const totalShortLicenses = monthlyStats.reduce((sum, stat) => sum + stat.shortLicenses, 0);
    const totalMedicalLicenses = monthlyStats.reduce((sum, stat) => sum + stat.medicalLicenses, 0);
    const totalHours = monthlyStats.reduce((sum, stat) => sum + stat.totalHours, 0);

    return {
      totalEmployees,
      employeesOverLimit,
      totalFullDayLicenses,
      totalShortLicenses,
      totalMedicalLicenses,
      totalHours,
      averageFullDayPerEmployee: totalEmployees > 0 ? (totalFullDayLicenses / totalEmployees).toFixed(1) : '0',
      averageShortPerEmployee: totalEmployees > 0 ? (totalShortLicenses / totalEmployees).toFixed(1) : '0',
      averageHoursPerEmployee: totalEmployees > 0 ? (totalHours / totalEmployees).toFixed(1) : '0'
    };
  }, [monthlyStats]);

  const getMonthName = (month: string) => {
    const monthObj = availableMonths.find(m => m.value === month);
    return monthObj ? monthObj.label : month;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 animate-pulse">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">جاري تحميل التقارير...</h2>
          <p className="text-gray-600">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  const reportSteps: ReportStep[] = [
    { id: 1, title: 'تحديد المعايير' },
    { id: 2, title: 'عرض البيانات' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Progress Bar */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          {reportSteps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = step.id < currentStep;
            return (
              <React.Fragment key={step.id}>
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : isCompleted
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'bg-gray-50 border-gray-300 text-gray-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.id}
                  </div>
                  <span className="mt-2 text-xs font-medium text-gray-700 text-center">
                    {step.title}
                  </span>
                </div>
                {index < reportSteps.length - 1 && (
                  <div className="flex-1 h-px mx-2 bg-gradient-to-l from-gray-300 via-gray-200 to-gray-300" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">البحث والفلاتر</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
              <input
                type="text"
                placeholder="ابحث بالاسم أو الرتبة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">السنة</label>
              <select
                value={filters.selectedYear}
                onChange={(e) => setFilters(prev => ({ ...prev, selectedYear: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الشهر</label>
              <select
                value={filters.selectedMonth}
                onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
              >
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الموظفين</label>
              <Select
                isMulti
                options={uniqueEmployees.map(emp => ({
                  value: emp.id.toString(),
                  label: `${emp.full_name} - ${emp.rank}`
                }))}
                value={filters.selectedEmployees.map(empId => {
                  const emp = uniqueEmployees.find(e => e.id.toString() === empId);
                  return emp ? { value: empId, label: `${emp.full_name} - ${emp.rank}` } : null;
                }).filter(Boolean)}
                onChange={(newValue) => setFilters(prev => ({
                  ...prev,
                  selectedEmployees: newValue ? newValue.map(v => v!.value) : []
                }))}
                placeholder="جميع الموظفين"
                styles={customSelectStyles}
                className="text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الفئات</label>
              <Select
                isMulti
                options={[
                  { value: 'ضابط', label: 'ضابط' },
                  { value: 'ضابط صف', label: 'ضابط صف' },
                  { value: 'جندي', label: 'جندي' }
                ]}
                value={filters.categories.map(cat => ({ value: cat, label: cat }))}
                onChange={(newValue) => setFilters(prev => ({
                  ...prev,
                  categories: newValue ? newValue.map(v => v.value) : []
                }))}
                placeholder="جميع الفئات"
                styles={customSelectStyles}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsNew;

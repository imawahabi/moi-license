import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Search, FileText, Calendar, Users, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { Employee, License } from '../types';
import { CATEGORY_ORDER } from '../utils/sorting';

// Constants for monthly limits
const MONTHLY_LIMITS = {
  FULL_DAY_LICENSES: 3,
  SHORT_LICENSES: 4,
  MAX_HOURS_PER_MONTH: 12
};

interface MonthlyEmployeeStats {
  employee: Employee;
  fullDayLicenses: number;
  shortLicenses: number;
  totalHours: number;
  remainingFullDays: number;
  remainingShortLicenses: number;
  remainingHours: number;
  isOverLimit: boolean;
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

const ReportsNew: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly-limits' | 'detailed'>('overview');
  
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
      let totalHours = 0;

      employeeLicenses.forEach(license => {
        if (license.hours && license.hours > 0) {
          shortLicenses++;
          totalHours += license.hours;
        } else {
          fullDayLicenses++;
        }
      });

      const remainingFullDays = Math.max(0, MONTHLY_LIMITS.FULL_DAY_LICENSES - fullDayLicenses);
      const remainingShortLicenses = Math.max(0, MONTHLY_LIMITS.SHORT_LICENSES - shortLicenses);
      const remainingHours = Math.max(0, MONTHLY_LIMITS.MAX_HOURS_PER_MONTH - totalHours);

      const warnings: string[] = [];
      let isOverLimit = false;

      if (fullDayLicenses > MONTHLY_LIMITS.FULL_DAY_LICENSES) {
        warnings.push(`تجاوز حد الاستئذانات الطويلة (${fullDayLicenses}/${MONTHLY_LIMITS.FULL_DAY_LICENSES})`);
        isOverLimit = true;
      }

      if (shortLicenses > MONTHLY_LIMITS.SHORT_LICENSES) {
        warnings.push(`تجاوز حد الاستئذانات القصيرة (${shortLicenses}/${MONTHLY_LIMITS.SHORT_LICENSES})`);
        isOverLimit = true;
      }

      if (totalHours > MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
        warnings.push(`تجاوز حد الساعات الشهرية (${totalHours}/${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH})`);
        isOverLimit = true;
      }

      stats.push({
        employee,
        fullDayLicenses,
        shortLicenses,
        totalHours,
        remainingFullDays,
        remainingShortLicenses,
        remainingHours,
        isOverLimit,
        warnings
      });
    });

    return stats.filter(stat => {
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
    }).sort((a, b) => {
      // Sort by category first, then by name
      const categoryA = CATEGORY_ORDER[a.employee.category] ?? 99;
      const categoryB = CATEGORY_ORDER[b.employee.category] ?? 99;
      
      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }
      
      return a.employee.full_name.localeCompare(b.employee.full_name, 'ar');
    });
  }, [uniqueEmployees, licenses, filters, searchTerm]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const totalEmployees = monthlyStats.length;
    const employeesOverLimit = monthlyStats.filter(stat => stat.isOverLimit).length;
    const totalFullDayLicenses = monthlyStats.reduce((sum, stat) => sum + stat.fullDayLicenses, 0);
    const totalShortLicenses = monthlyStats.reduce((sum, stat) => sum + stat.shortLicenses, 0);
    const totalHours = monthlyStats.reduce((sum, stat) => sum + stat.totalHours, 0);

    return {
      totalEmployees,
      employeesOverLimit,
      totalFullDayLicenses,
      totalShortLicenses,
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">التقارير والإحصائيات المتقدمة</h1>
              <p className="text-blue-100">
                {getMonthName(filters.selectedMonth)} {filters.selectedYear} - 
                إجمالي {overallStats.totalEmployees} موظف
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{overallStats.totalFullDayLicenses + overallStats.totalShortLicenses}</div>
            <div className="text-blue-100 text-sm">إجمالي الرخص</div>
          </div>
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

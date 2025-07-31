import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Calendar, CheckCircle, ChevronLeft, Eye, FileText, AlertTriangle, Search, X } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { EmployeeService } from '../services/employeeService';
import { Employee, License } from '../types';
import DatePicker from './DatePicker';

// Constants for monthly limits
const MONTHLY_LIMITS = {
  FULL_DAY_LICENSES: 3,
  SHORT_LICENSES: 4,
  MAX_HOURS_PER_MONTH: 12
};



interface LicenseConfig {
  selectedEmployee: Employee | null;
  licenseType: 'يوم كامل' | 'نصف يوم';
  licenseDate: Date | null;
  hours?: number;
}

interface LicenseStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface AddLicenseProps {
  onNavigate?: (tab: string) => void;
}

const AddLicense: React.FC<AddLicenseProps> = ({ onNavigate }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<License[] | null>(null);
  const [monthlyLimitWarning, setMonthlyLimitWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

  const [licenseConfig, setLicenseConfig] = useState<LicenseConfig>({
    selectedEmployee: null,
    licenseType: 'يوم كامل',
    licenseDate: new Date(),
    hours: undefined
  });



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
        setMessage({ type: 'error', text: 'فشل في تحميل البيانات' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    return employees.filter(emp =>
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.rank.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.file_number.includes(searchQuery) ||
      emp.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  // Calculate monthly limits for selected employee
  const calculateEmployeeMonthlyStats = useMemo(() => {
    if (!licenseConfig.selectedEmployee || !licenseConfig.licenseDate) {
      return null;
    }

    const currentDate = licenseConfig.licenseDate;
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const employeeLicenses = licenses.filter(license => {
      if (!license.employee || license.employee.id !== licenseConfig.selectedEmployee!.id) return false;

      const licenseDate = new Date(license.license_date);
      return licenseDate.getFullYear() === currentYear &&
             licenseDate.getMonth() + 1 === currentMonth;
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

    return {
      fullDayLicenses,
      shortLicenses,
      totalHours,
      remainingFullDays: Math.max(0, MONTHLY_LIMITS.FULL_DAY_LICENSES - fullDayLicenses),
      remainingShortLicenses: Math.max(0, MONTHLY_LIMITS.SHORT_LICENSES - shortLicenses),
      remainingHours: Math.max(0, MONTHLY_LIMITS.MAX_HOURS_PER_MONTH - totalHours)
    };
  }, [licenseConfig.selectedEmployee, licenseConfig.licenseDate, licenses]);

  useEffect(() => {
    const checkDuplicates = async () => {
      if (!licenseConfig.selectedEmployee || !licenseConfig.licenseDate) {
        setDuplicateWarning(null);
        return;
      }
      try {
        const dateString = licenseConfig.licenseDate.toISOString().split('T')[0];
        const duplicates = await LicenseService.checkDuplicateDate(licenseConfig.selectedEmployee.id.toString(), dateString);
        setDuplicateWarning(duplicates.length > 0 ? duplicates : null);
      } catch (error) {
        console.error('Error checking duplicates:', error);
      }
    };
    checkDuplicates();
  }, [licenseConfig.selectedEmployee, licenseConfig.licenseDate]);

  // Check monthly limits
  useEffect(() => {
    if (!calculateEmployeeMonthlyStats) {
      setMonthlyLimitWarning(null);
      return;
    }

    const stats = calculateEmployeeMonthlyStats;
    const warnings: string[] = [];

    if (licenseConfig.licenseType === 'يوم كامل') {
      if (stats.remainingFullDays < 0) {
        warnings.push(`تم تجاوز الحد الأقصى للاستئذانات الطويلة هذا الشهر (${MONTHLY_LIMITS.FULL_DAY_LICENSES} استئذانات)`);
      } else if (stats.remainingFullDays === 0) {
        warnings.push(`وصل للحد الأقصى للاستئذانات الطويلة هذا الشهر (${MONTHLY_LIMITS.FULL_DAY_LICENSES} استئذانات)`);
      } else if (stats.remainingFullDays === 1) {
        warnings.push(`تحذير: متبقي استئذان طويل واحد فقط هذا الشهر`);
      }
    } else if (licenseConfig.licenseType === 'نصف يوم' && licenseConfig.hours) {
      // Check short licenses count
      if (stats.remainingShortLicenses < 0) {
        warnings.push(`تم تجاوز الحد الأقصى للاستئذانات القصيرة هذا الشهر (${MONTHLY_LIMITS.SHORT_LICENSES} استئذانات)`);
      } else if (stats.remainingShortLicenses === 0) {
        warnings.push(`وصل للحد الأقصى للاستئذانات القصيرة هذا الشهر (${MONTHLY_LIMITS.SHORT_LICENSES} استئذانات)`);
      }

      // Check hours limit
      const newTotalHours = stats.totalHours + licenseConfig.hours;
      if (newTotalHours > MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
        const exceededHours = newTotalHours - MONTHLY_LIMITS.MAX_HOURS_PER_MONTH;
        warnings.push(`تجاوز الحد الأقصى للساعات الشهرية بـ ${exceededHours} ساعة (الحد الأقصى: ${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH} ساعة)`);
      } else if (newTotalHours === MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
        warnings.push(`وصل للحد الأقصى للساعات الشهرية (${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH} ساعة)`);
      } else if (stats.remainingHours < licenseConfig.hours) {
        warnings.push(`تحذير: متبقي ${stats.remainingHours} ساعة فقط من الحد الشهري`);
      }

      if (stats.remainingShortLicenses === 1) {
        warnings.push(`تحذير: متبقي استئذان قصير واحد فقط هذا الشهر`);
      }
    }

    setMonthlyLimitWarning(warnings.length > 0 ? warnings.join('\n') : null);
  }, [calculateEmployeeMonthlyStats, licenseConfig.licenseType, licenseConfig.hours]);

  // Check if there are critical monthly limit violations
  const hasCriticalLimitViolation = useMemo(() => {
    if (!calculateEmployeeMonthlyStats) return false;

    const stats = calculateEmployeeMonthlyStats;

    if (licenseConfig.licenseType === 'يوم كامل' && stats.remainingFullDays <= 0) {
      return true;
    }

    if (licenseConfig.licenseType === 'نصف يوم' && licenseConfig.hours) {
      if (stats.remainingShortLicenses <= 0) return true;

      const newTotalHours = stats.totalHours + licenseConfig.hours;
      if (newTotalHours >= MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) return true;
    }

    return false;
  }, [calculateEmployeeMonthlyStats, licenseConfig.licenseType, licenseConfig.hours]);

  const steps: LicenseStep[] = [
    {
      id: 1,
      title: 'اختيار الموظف وتفاصيل الاستئذان',
      description: 'حدد الموظف والتاريخ ونوع الاستئذان',
      icon: <Users className="w-5 h-5" />,
      completed: !!(licenseConfig.selectedEmployee && licenseConfig.licenseDate && (licenseConfig.licenseType === 'يوم كامل' || (licenseConfig.licenseType === 'نصف يوم' && licenseConfig.hours && licenseConfig.hours > 0)))
    },
    {
      id: 2,
      title: 'المراجعة والحفظ',
      description: 'راجع البيانات واحفظ الاستئذان',
      icon: <CheckCircle className="w-5 h-5" />,
      completed: false
    }
  ];

  const handleNext = () => {
    // منع المتابعة إذا كان هناك تحذير تكرار
    if (duplicateWarning && duplicateWarning.length > 0) {
      setMessage({
        type: 'error',
        text: 'لا يمكن المتابعة. يوجد رخصة مكررة للموظف في نفس التاريخ.'
      });
      return;
    }

    // فحص الحدود الشهرية الحرجة
    if (calculateEmployeeMonthlyStats) {
      const stats = calculateEmployeeMonthlyStats;

      if (licenseConfig.licenseType === 'يوم كامل' && stats.remainingFullDays <= 0) {
        setMessage({
          type: 'error',
          text: 'لا يمكن المتابعة. تم استنفاد الحد الأقصى للاستئذانات الطويلة هذا الشهر.'
        });
        return;
      }

      if (licenseConfig.licenseType === 'نصف يوم' && licenseConfig.hours) {
        if (stats.remainingShortLicenses <= 0) {
          setMessage({
            type: 'error',
            text: 'لا يمكن المتابعة. تم استنفاد الحد الأقصى للاستئذانات القصيرة هذا الشهر.'
          });
          return;
        }

        const newTotalHours = stats.totalHours + licenseConfig.hours;
        if (newTotalHours >= MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
          setMessage({
            type: 'error',
            text: `لا يمكن المتابعة. سيتم الوصول أو تجاوز الحد الأقصى للساعات الشهرية (${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH} ساعة).`
          });
          return;
        }
      }
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setLicenseConfig(prev => ({
      ...prev,
      selectedEmployee: prev.selectedEmployee?.id === employee.id ? null : employee
    }));
  };

  const handleRemoveEmployee = () => {
    setLicenseConfig(prev => ({
      ...prev,
      selectedEmployee: null
    }));
  };

  const handleSubmit = async () => {
    if (!licenseConfig.selectedEmployee || !licenseConfig.licenseDate) {
      setMessage({ type: 'error', text: 'يرجى اختيار موظف وتحديد التاريخ' });
      return;
    }

    if (licenseConfig.licenseType === 'نصف يوم' && (!licenseConfig.hours || licenseConfig.hours <= 0)) {
      setMessage({ type: 'error', text: 'يرجى إدخال عدد الساعات' });
      return;
    }

    if (duplicateWarning && duplicateWarning.length > 0) {
      setMessage({
        type: 'error',
        text: 'لا يمكن إضافة رخصة للموظف المحدد. يوجد رخصة مسجلة مسبقاً في نفس التاريخ.'
      });
      return;
    }

    // فحص الحدود الشهرية قبل الحفظ
    if (calculateEmployeeMonthlyStats) {
      const stats = calculateEmployeeMonthlyStats;

      if (licenseConfig.licenseType === 'يوم كامل' && stats.remainingFullDays <= 0) {
        setMessage({
          type: 'error',
          text: 'لا يمكن حفظ الرخصة. تم استنفاد الحد الأقصى للاستئذانات الطويلة هذا الشهر.'
        });
        return;
      }

      if (licenseConfig.licenseType === 'نصف يوم' && licenseConfig.hours) {
        if (stats.remainingShortLicenses <= 0) {
          setMessage({
            type: 'error',
            text: 'لا يمكن حفظ الرخصة. تم استنفاد الحد الأقصى للاستئذانات القصيرة هذا الشهر.'
          });
          return;
        }

        const newTotalHours = stats.totalHours + licenseConfig.hours;
        if (newTotalHours >= MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
          setMessage({
            type: 'error',
            text: `لا يمكن حفظ الرخصة. سيتم الوصول أو تجاوز الحد الأقصى للساعات الشهرية (${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH} ساعة).`
          });
          return;
        }
      }
    }

    setLoading(true);
    try {
      const date = licenseConfig.licenseDate;

      const newLicense = {
        employee_id: licenseConfig.selectedEmployee.id,
        license_type: licenseConfig.licenseType,
        license_date: date.toISOString().split('T')[0],
        hours: licenseConfig.licenseType === 'نصف يوم' ? licenseConfig.hours : undefined,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        reason: '',
        approved: true
      };

      await LicenseService.create(newLicense);

      setMessage({
        type: 'success',
        text: `تم تسجيل رخصة ${licenseConfig.selectedEmployee.full_name} بنجاح`
      });

      // Reset form
      setLicenseConfig({
        selectedEmployee: null,
        licenseType: 'يوم كامل',
        licenseDate: new Date(),
        hours: undefined
      });
      setCurrentStep(1);
      setSearchQuery('');
    } catch (error) {
      console.error('Error submitting license:', error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الرخصة' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-200 to-gray-100 rounded-2xl">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl">
              <Plus className="w-8 h-8 text-white" />
            </div>

          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">إضافة استئذان جديد</h1>
          <p className="text-gray-600">نظام بسيط وسريع لإضافة استئذان لموظف واحد</p>
        </div>

        {message && (
          <div className={`mb-6 p-8 rounded-xl border ${
            message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
               message.type === 'error' ? <X className="w-5 h-5" /> :
               <AlertTriangle className="w-5 h-5" />}
              <span className="font-bold">{message.text}</span>
            </div>
          </div>
        )}

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

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 py-8">
            {/* Step 1: Employee Selection and License Details */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">إضافة رخصة جديدة</h2>
                  <p className="text-gray-600">اختر الموظف وحدد تفاصيل الرخصة</p>
                </div>

                {/* Employee Selection Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">اختيار الموظف</h3>
                    {licenseConfig.selectedEmployee && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        موظف محدد
                      </span>
                    )}
                  </div>

                  {/* Search Bar - Only show if no employee is selected */}
                  {!licenseConfig.selectedEmployee && (
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث بالاسم، الرتبة، رقم الملف، أو الفئة..."
                        className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right"
                      />
                    </div>
                  )}

                  {/* Selected Employee Display */}
                  {licenseConfig.selectedEmployee && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-green-800">تسجيل رخصة لـ</h3>
                        <button
                          onClick={handleRemoveEmployee}
                          className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                        >
                          <X className="w-4 h-4" />
                          اختيار موظف آخر
                        </button>
                      </div>
                      <div className="flex items-center gap-4 bg-white px-4 py-3 rounded-lg border border-green-200">
                        <div className="text-right flex-1">
                          <div className="font-bold text-gray-800 text-lg">{licenseConfig.selectedEmployee.rank} / {licenseConfig.selectedEmployee.full_name}</div>
                          <div className="text-sm text-gray-500 mt-1">رقم الملف: {licenseConfig.selectedEmployee.file_number}</div>
                        </div>
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employee List - Only show if no employee is selected */}
                  {!licenseConfig.selectedEmployee && (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                    {filteredEmployees.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">
                          {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد موظفون'}
                        </p>
                      </div>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const isSelected = licenseConfig.selectedEmployee?.id === employee.id;
                        return (
                          <div
                            key={employee.id}
                            onClick={() => handleEmployeeSelect(employee)}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                              isSelected
                                ? 'border-green-500 bg-green-50 shadow-md'
                                : 'border-gray-200 hover:border-green-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                                }`}>
                                  {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-800">{employee.rank} / {employee.full_name}</div>
                                  <div className="text-sm text-gray-600">رقم الملف: {employee.file_number}</div>
                                </div>
                              </div>
                              <div className="text-left">
                                <div className={`text-sm px-2 py-1 rounded-full ${
                                  employee.category === 'ضابط' ? 'bg-blue-100 text-blue-800' :
                                  employee.category === 'ضابط صف' ? 'bg-green-100 text-green-800' :
                                  employee.category === 'مهني' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {employee.category}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    </div>
                  )}
                </div>

                {/* License Details Section */}
                {licenseConfig.selectedEmployee && (
                  <div className="space-y-6 border-t border-gray-200 pt-8">
                    <h3 className="text-lg font-bold text-gray-800">تفاصيل الرخصة</h3>

                    {/* License Date */}
                    <DatePicker
                      label="تاريخ الرخصة"
                      value={licenseConfig.licenseDate ? licenseConfig.licenseDate.toISOString().split('T')[0] : ''}
                      onChange={(date: string) => setLicenseConfig(prev => ({ ...prev, licenseDate: new Date(date) }))}
                      placeholder="اختر التاريخ"
                      className="date-picker-rtl"
                      required
                    />

                    {/* License Type Selection */}
                    <div className="space-y-4">
                      <label className="block text-sm font-semibold text-gray-700">نوع الاستئذان *</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          onClick={() => setLicenseConfig(prev => ({ ...prev, licenseType: 'يوم كامل', hours: undefined }))}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            licenseConfig.licenseType === 'يوم كامل'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                              licenseConfig.licenseType === 'يوم كامل' ? 'bg-blue-600' : 'bg-gray-400'
                            }`}>
                              <Calendar className="w-4 h-4 text-white" />
                            </div>
                            <div className="font-bold text-gray-800">إستئذان طويل</div>
                            <div className="text-xs text-gray-600 mt-1">يوم كامل</div>
                          </div>
                        </div>
                        <div
                          onClick={() => setLicenseConfig(prev => ({ ...prev, licenseType: 'نصف يوم' }))}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            licenseConfig.licenseType === 'نصف يوم'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                              licenseConfig.licenseType === 'نصف يوم' ? 'bg-blue-600' : 'bg-gray-400'
                            }`}>
                              <Calendar className="w-4 h-4 text-white" />
                            </div>
                            <div className="font-bold text-gray-800">إستئذان قصير</div>
                            <div className="text-xs text-gray-600 mt-1">ساعات محددة</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hours Input (if half day) */}
                    {licenseConfig.licenseType === 'نصف يوم' && (
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700">عدد ساعات الإستئذان *</label>
                        <input
                          type="number"
                          value={licenseConfig.hours || ''}
                          onChange={(e) => setLicenseConfig(prev => ({ ...prev, hours: parseInt(e.target.value) || undefined }))}
                          placeholder="أدخل عدد الساعات"
                          min="1"
                          max="8"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-right"
                        />
                        <p className="text-xs text-gray-500">الحد الأقصى 3 ساعات</p>
                      </div>
                    )}

                    {/* Duplicate Warning */}
                    {duplicateWarning && duplicateWarning.length > 0 && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 text-red-800 mb-4">
                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">تحذير: رخصة مكررة!</h4>
                            <p className="text-sm">الموظف {licenseConfig.selectedEmployee?.full_name} لديه رخصة مسجلة مسبقاً في هذا التاريخ</p>
                          </div>
                        </div>
      </div>
                    )}

                    {/* Monthly Limits Warning */}
                    {monthlyLimitWarning && (
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 text-yellow-800 mb-4">
                          <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">تحذير الحدود الشهرية</h3>
                            <p className="text-sm">يرجى مراجعة الحدود المسموحة للموظف</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-yellow-200">
                          <div className="space-y-2">
                            {monthlyLimitWarning.split('\n').map((warning, index) => (
                              <div key={index} className="flex items-center gap-2 text-yellow-800">
                                <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                                <span className="text-sm font-medium">{warning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Review and Save */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-4 shadow-lg">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">مراجعة الاستئذان النهائية</h3>
                  <p className="text-gray-500">تأكد من صحة البيانات قبل الحفظ</p>
                </div>

                {/* Main Review Card */}
                <div className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
                  {/* Employee Info */}
                  <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl border border-blue-100">                    <div className="text-right flex-1">
                      <div className="font-bold text-gray-800 text-xl text-center">
                        {licenseConfig.selectedEmployee?.rank} / {licenseConfig.selectedEmployee?.full_name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 text-center">
                        رقم الملف: {licenseConfig.selectedEmployee?.file_number}
                      </div>
                      <div className="text-sm text-blue-600 mt-1 font-medium text-center">
                        {licenseConfig.selectedEmployee?.category}
                      </div>
                    </div>
                  </div>

                  {/* License Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">نوع الاستئذان</div>
                      <div className="font-bold text-gray-800 text-lg">
                        {licenseConfig.licenseType === 'يوم كامل' ? 'إستئذان طويل' : 'إستئذان قصير'}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">التاريخ</div>
                      <div className="font-bold text-gray-800 text-lg">
                        {licenseConfig.licenseDate?.toLocaleDateString('ar-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Duplicate Warning */}
                {duplicateWarning && duplicateWarning.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 text-red-800 mb-4">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl">خطأ: لا يمكن إضافة الرخصة!</h4>
                        <p className="text-sm">الموظف {licenseConfig.selectedEmployee?.full_name} لديه رخصة مسجلة مسبقاً في هذا التاريخ</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <p className="text-red-700 font-medium mb-3">تفاصيل الرخصة الموجودة للموظف {licenseConfig.selectedEmployee?.full_name} في تاريخ {licenseConfig.licenseDate?.toLocaleDateString('ar-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}:</p>
                      <div className="space-y-2">
                        {duplicateWarning.map((license, index) => (
                          <div key={index} className="flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                              <X className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-lg">{license.employee?.full_name}</div>
                              <div className="text-sm mt-1">نوع الرخصة: <span className="font-medium">{license.license_type}</span></div>
                              {license.hours && <div className="text-sm">عدد الساعات: <span className="font-medium">{license.hours}</span></div>}
                              <div className="text-xs mt-1 text-red-600">تاريخ التسجيل: {new Date(license.license_date).toLocaleDateString('ar-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-200">
                        <p className="text-red-800 font-bold text-sm mb-2">
                          ⚠️ لا يمكن إضافة رخصتين لنفس الموظف في يوم واحد
                        </p>
                        <p className="text-red-700 text-sm">
                          يرجى تغيير التاريخ أو اختيار موظف آخر للمتابعة
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Limits Warning in Step 2 */}
                {monthlyLimitWarning && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 text-yellow-800 mb-4">
                      <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl">تحذير: الحدود الشهرية</h4>
                        <p className="text-sm">يرجى مراجعة الحدود المسموحة قبل الحفظ</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-yellow-200">
                      <div className="space-y-3">
                        {monthlyLimitWarning.split('\n').map((warning, index) => (
                          <div key={index} className="flex items-center gap-3 text-yellow-800">
                            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                            <span className="font-medium">{warning}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Current month stats */}
                    {calculateEmployeeMonthlyStats && (
                      <div className="mt-4 bg-white rounded-lg p-4 border border-yellow-200">
                        <h5 className="font-semibold text-yellow-800 mb-3">إحصائيات {licenseConfig.selectedEmployee?.full_name} للشهر الحالي:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="font-bold text-xl text-gray-800">{calculateEmployeeMonthlyStats.fullDayLicenses}</div>
                            <div className="text-gray-600 font-medium">استئذانات طويلة</div>
                            <div className="text-xs text-green-600 mt-1">متبقي: {calculateEmployeeMonthlyStats.remainingFullDays} من {MONTHLY_LIMITS.FULL_DAY_LICENSES}</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="font-bold text-xl text-gray-800">{calculateEmployeeMonthlyStats.shortLicenses}</div>
                            <div className="text-gray-600 font-medium">استئذانات قصيرة</div>
                            <div className="text-xs text-green-600 mt-1">متبقي: {calculateEmployeeMonthlyStats.remainingShortLicenses} من {MONTHLY_LIMITS.SHORT_LICENSES}</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="font-bold text-xl text-gray-800">{calculateEmployeeMonthlyStats.totalHours}</div>
                            <div className="text-gray-600 font-medium">إجمالي الساعات</div>
                            <div className="text-xs text-green-600 mt-1">متبقي: {calculateEmployeeMonthlyStats.remainingHours} من {MONTHLY_LIMITS.MAX_HOURS_PER_MONTH} ساعة</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !!(duplicateWarning && duplicateWarning.length > 0) || hasCriticalLimitViolation}
                    className={`flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
                      loading || (duplicateWarning && duplicateWarning.length > 0) || hasCriticalLimitViolation
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : monthlyLimitWarning
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white hover:from-yellow-700 hover:to-yellow-800 hover:shadow-xl'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-xl'
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        حفظ الاستئذان
                      </>
                    )}
                  </button>
                </div>

                {/* Back Button */}
                <div className="text-center pt-4">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 mx-auto border border-gray-200 hover:border-gray-300"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                    العودة للخطوة السابقة
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation - Hidden in step 2 */}
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
                  disabled={!steps[0].completed || !!(duplicateWarning && duplicateWarning.length > 0) || hasCriticalLimitViolation}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    steps[0].completed && !(duplicateWarning && duplicateWarning.length > 0) && !hasCriticalLimitViolation
                      ? monthlyLimitWarning
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
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
    </div>
  );
};

export default AddLicense;
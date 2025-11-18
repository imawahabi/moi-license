import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Calendar, CheckCircle, ChevronLeft, Eye, FileText, AlertTriangle, Search, X, UserPlus } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { EmployeeService } from '../services/employeeService';
import { Employee, License } from '../types';
import DatePicker from './DatePicker';

// Constants for monthly limits
const MONTHLY_LIMITS = {
  FULL_DAY_LICENSES: 3,
  SHORT_LICENSES: 4,
  MAX_HOURS_PER_MONTH: 12,
  MEDICAL_LICENSES: Infinity // بدون حدود
};



interface LicenseConfig {
  selectedEmployee: Employee | null;
  licenseType: 'يوم كامل' | 'إستئذان قصير' | 'إستئذان طبي';
  licenseDate: Date | null;
  hours?: number;
  notes?: string;
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
    hours: undefined,
    notes: ''
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
    let medicalLicenses = 0;
    let totalHours = 0;

    employeeLicenses.forEach(license => {
      // فصل الأنواع الثلاثة بشكل صريح بناءً على نوع الرخصة فقط
      if (license.license_type === 'يوم كامل') {
        fullDayLicenses++;
      } else if (license.license_type === 'إستئذان قصير') {
        shortLicenses++;
        // ساعات الاستئذانات القصيرة فقط تدخل في حد 8 ساعة
        totalHours += license.hours || 0;
      } else if (license.license_type === 'إستئذان طبي') {
        // الإستئذان الطبي تُحتسب بالعدد فقط، ولا تدخل ساعاتها في totalHours
        medicalLicenses++;
      }
    });

    return {
      fullDayLicenses,
      shortLicenses,
      medicalLicenses,
      totalHours,
      remainingFullDays: Math.max(0, MONTHLY_LIMITS.FULL_DAY_LICENSES - fullDayLicenses),
      remainingShortLicenses: Math.max(0, MONTHLY_LIMITS.SHORT_LICENSES - shortLicenses),
      remainingMedicalLicenses: Math.max(0, MONTHLY_LIMITS.MEDICAL_LICENSES - medicalLicenses),
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
      if (stats.fullDayLicenses >= MONTHLY_LIMITS.FULL_DAY_LICENSES) {
        warnings.push(`وصل للحد الأقصى للاستئذانات الطويلة (${MONTHLY_LIMITS.FULL_DAY_LICENSES} استئذانات).`);
      } else if (stats.remainingFullDays === 1) {
        warnings.push(`تحذير: متبقي استئذان طويل واحد فقط.`);
      }
    }
    // الإستئذان الطبي بدون حدود - لا تحذيرات
    else if (licenseConfig.licenseType === 'إستئذان قصير' && licenseConfig.hours) {
      const newTotalHours = stats.totalHours + (licenseConfig.hours || 0);

      // Critical warnings for exceeding limits
      if (stats.shortLicenses >= MONTHLY_LIMITS.SHORT_LICENSES) {
        warnings.push(`تم الوصول للحد الأقصى للاستئذانات القصيرة (${MONTHLY_LIMITS.SHORT_LICENSES}).`);
      }
      if (newTotalHours > MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
        warnings.push(`سيتم تجاوز الحد الأقصى للساعات (${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH}).`);
      }

      // Informational warnings for approaching limits
      if (stats.shortLicenses === MONTHLY_LIMITS.SHORT_LICENSES - 1) {
        warnings.push('تحذير: سيتم استخدام آخر استئذان قصير متاح.');
      }
      if (newTotalHours === MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
        warnings.push(`تحذير: سيتم الوصول إلى الحد الأقصى للساعات (${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH}).`);
      }
    }

    setMonthlyLimitWarning(warnings.length > 0 ? warnings.join('\n') : null);
  }, [calculateEmployeeMonthlyStats, licenseConfig.licenseType, licenseConfig.hours]);

  // Check if there are critical monthly limit violations
  const hasCriticalLimitViolation = useMemo(() => {
    if (!calculateEmployeeMonthlyStats) return false;
    const stats = calculateEmployeeMonthlyStats;

    if (licenseConfig.licenseType === 'يوم كامل') {
      return stats.fullDayLicenses >= MONTHLY_LIMITS.FULL_DAY_LICENSES;
    }

    // الإستئذان الطبي بدون حدود
    if (licenseConfig.licenseType === 'إستئذان طبي') {
      return false; // لا حدود
    }

    if (licenseConfig.licenseType === 'إستئذان قصير' && licenseConfig.hours) {
      // Block if already at the license limit
      if (stats.shortLicenses >= MONTHLY_LIMITS.SHORT_LICENSES) return true;
      // Block if adding the new license would exceed the hour limit
      if (stats.totalHours + licenseConfig.hours > MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) return true;
    }

    return false;
  }, [calculateEmployeeMonthlyStats, licenseConfig.licenseType, licenseConfig.hours]);

  const steps: LicenseStep[] = [
    {
      id: 1,
      title: 'اختيار الموظف وتفاصيل الاستئذان',
      description: 'حدد الموظف والتاريخ ونوع الاستئذان',
      icon: <Users className="w-5 h-5" />,
      completed: !!(licenseConfig.selectedEmployee && licenseConfig.licenseDate && (
        licenseConfig.licenseType === 'يوم كامل' || 
        (licenseConfig.licenseType === 'إستئذان قصير' && licenseConfig.hours && licenseConfig.hours > 0) || 
        (licenseConfig.licenseType === 'إستئذان طبي' && licenseConfig.hours && licenseConfig.hours > 0)
      ))
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

      if (licenseConfig.licenseType === 'إستئذان قصير' && licenseConfig.hours) {
        if (stats.shortLicenses >= MONTHLY_LIMITS.SHORT_LICENSES) {
          setMessage({
            type: 'error',
            text: 'لا يمكن المتابعة. تم استنفاد الحد الأقصى للاستئذانات القصيرة هذا الشهر.'
          });
          return;
        }

        const newTotalHours = stats.totalHours + licenseConfig.hours;
        if (newTotalHours > MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
          setMessage({
            type: 'error',
            text: `لا يمكن المتابعة. سيتم تجاوز الحد الأقصى للساعات الشهرية (${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH} ساعة).`
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

  const handleCloseModal = () => {
    // Reset form and close modal
    setLicenseConfig({
      selectedEmployee: null,
      licenseType: 'يوم كامل',
      licenseDate: new Date(),
      hours: undefined,
      notes: ''
    });
    setCurrentStep(1);
    setSearchQuery('');
    setMessage(null);
    
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

    if ((licenseConfig.licenseType === 'إستئذان قصير' || licenseConfig.licenseType === 'إستئذان طبي') && (!licenseConfig.hours || licenseConfig.hours <= 0)) {
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

      if (licenseConfig.licenseType === 'إستئذان قصير' && licenseConfig.hours) {
        if (stats.shortLicenses >= MONTHLY_LIMITS.SHORT_LICENSES) {
          setMessage({
            type: 'error',
            text: 'لا يمكن حفظ الرخصة. تم استنفاد الحد الأقصى للاستئذانات القصيرة هذا الشهر.'
          });
          return;
        }

        const newTotalHours = stats.totalHours + licenseConfig.hours;
        if (newTotalHours > MONTHLY_LIMITS.MAX_HOURS_PER_MONTH) {
          setMessage({
            type: 'error',
            text: `لا يمكن حفظ الرخصة. سيتم تجاوز الحد الأقصى للساعات الشهرية (${MONTHLY_LIMITS.MAX_HOURS_PER_MONTH} ساعة).`
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
        hours: (licenseConfig.licenseType === 'إستئذان قصير' || licenseConfig.licenseType === 'إستئذان طبي') ? licenseConfig.hours : undefined,
        notes: licenseConfig.notes || '',
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
        hours: undefined,
        notes: ''
      });
      setCurrentStep(1);
      setSearchQuery('');

      // Close modal after 2 seconds
      setTimeout(() => {
        window.history.back();
      }, 2000);
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  إضافة استئذان جديد
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {currentStep === 1
                    ? `${employees.length} موظف متاح`
                    : 'مراجعة البيانات'}
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
        <div className="px-8 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
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
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${
                    currentStep > step.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                      : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 space-y-6">
            {message && (
              <div className={`p-4 rounded-xl border ${
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

            {/* Step 1: Employee Selection and License Details */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">إضافة رخصة / إستئذان جديدة</h2>
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
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg border border-red-300 font-medium text-sm"
                        >
                          <UserPlus className="w-4 h-4" />
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
                                  employee.category === 'مهني' ? 'bg-green-100 text-green-800' :
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
                      <div className="grid grid-cols-3 gap-4">
                        <div
                          onClick={() => setLicenseConfig(prev => ({ ...prev, licenseType: 'يوم كامل', hours: undefined }))}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            licenseConfig.licenseType === 'يوم كامل'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                              licenseConfig.licenseType === 'يوم كامل' 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg' 
                                : 'bg-gray-200'
                            }`}>
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div className={`font-bold ${
                              licenseConfig.licenseType === 'يوم كامل' ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                              رخصة يوم كامل
                            </div>
                            <div className={`text-xs mt-1 ${
                              licenseConfig.licenseType === 'يوم كامل' ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              يوم كامل
                            </div>
                          </div>
                        </div>
                        <div
                          onClick={() => setLicenseConfig(prev => ({ ...prev, licenseType: 'إستئذان قصير' }))}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            licenseConfig.licenseType === 'إستئذان قصير'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                              licenseConfig.licenseType === 'إستئذان قصير'
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg'
                                : 'bg-gray-200'
                            }`}>
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className={`font-bold ${
                              licenseConfig.licenseType === 'إستئذان قصير' ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                              إستئذان قصير
                            </div>
                            <div className={`text-xs mt-1 ${
                              licenseConfig.licenseType === 'إستئذان قصير' ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              ساعات محددة
                            </div>
                          </div>
                        </div>
                        <div
                          onClick={() => setLicenseConfig(prev => ({ ...prev, licenseType: 'إستئذان طبي' }))}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            licenseConfig.licenseType === 'إستئذان طبي'
                              ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-100'
                              : 'border-gray-200 hover:border-green-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                              licenseConfig.licenseType === 'إستئذان طبي' 
                                ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg' 
                                : 'bg-gray-200'
                            }`}>
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className={`font-bold ${
                              licenseConfig.licenseType === 'إستئذان طبي' ? 'text-green-800' : 'text-gray-800'
                            }`}>
                              إستئذان طبي
                            </div>
                            <div className={`text-xs mt-1 ${
                              licenseConfig.licenseType === 'إستئذان طبي' ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              ساعات طبية محددة
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hours Input (if half day or medical) */}
                    {(licenseConfig.licenseType === 'إستئذان قصير' || licenseConfig.licenseType === 'إستئذان طبي') && (
                      <div className={`space-y-3 p-4 rounded-xl ${
                        licenseConfig.licenseType === 'إستئذان طبي' 
                          ? 'bg-green-50 border border-green-100' 
                          : 'bg-blue-50 border border-blue-100'
                      }`}>
                        <label className="block text-sm font-semibold flex items-center">
                          {licenseConfig.licenseType === 'إستئذان طبي' ? (
                            <>
                              <svg className="w-4 h-4 ml-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              عدد الساعات الطبية *
                            </>
                          ) : 'عدد ساعات الإستئذان *'}
                        </label>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-4 rtl:space-x-reverse">
                            <span className={`text-sm font-bold w-10 text-center ${
                              licenseConfig.licenseType === 'إستئذان طبي' ? 'text-green-600' : 'text-blue-600'
                            }`}>0.5</span>
                            <div className="relative flex-1">
                              <input 
                                type="range" 
                                min="0.5" 
                                max="8" 
                                step="0.5" 
                                value={licenseConfig.hours || 0.5}
                                onChange={(e) => setLicenseConfig(prev => ({ ...prev, hours: parseFloat(e.target.value) }))}
                                className={`w-full h-2 rounded-full appearance-none cursor-pointer ${
                                  licenseConfig.licenseType === 'إستئذان طبي' ? 'bg-green-200' : 'bg-blue-200'
                                }`}
                                style={{
                                  background: licenseConfig.licenseType === 'إستئذان طبي' 
                                    ? `linear-gradient(to left, #34c475ff ${((licenseConfig.hours || 0.5) - 0.5) / 7.5 * 100}%, #d5ffe5ff ${((licenseConfig.hours || 0.5) - 0.5) / 7.5 * 100}%)`
                                    : `linear-gradient(to left, #3b82f6 ${((licenseConfig.hours || 0.5) - 0.5) / 7.5 * 100}%, #e5ebe8ff ${((licenseConfig.hours || 0.5) - 0.5) / 7.5 * 100}%)`
                                }}
                              />
                              <div className="absolute -top-6 left-0 right-0 flex justify-center">
                                <span className={`px-2 py-1 text-xs font-bold text-white rounded-md shadow-md transform translate-x-1/2 ${
                                  licenseConfig.licenseType === 'إستئذان طبي' ? 'bg-green-600' : 'bg-blue-600'
                                }`} 
                                  style={{ right: `${((licenseConfig.hours || 0.5) - 0.5) / 7.5 * 100}%` }}>
                                  {licenseConfig.hours || 0.5} ساعة 
                                </span>
                              </div>
                            </div>
                            <span className={`text-sm font-bold w-10 text-center ${
                              licenseConfig.licenseType === 'إستئذان طبي' ? 'text-green-600' : 'text-blue-600'
                            }`}>8</span>
                          </div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <div className="relative">
                              <input
                                type="number"
                                min="0.5"
                                max="8"
                                step="0.5"
                                value={licenseConfig.hours || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value) && value >= 0.5 && value <= 8) {
                                    setLicenseConfig(prev => ({ ...prev, hours: value }));
                                  } else if (e.target.value === '') {
                                    setLicenseConfig(prev => ({ ...prev, hours: undefined }));
                                  }
                                }}
                                className={`w-32 px-5 font-bold  py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 text-right ${
                                  licenseConfig.licenseType === 'إستئذان طبي' 
                                    ? 'border-green-200 bg-white focus:border-green-500 focus:ring-green-200' 
                                    : 'border-blue-200 bg-white focus:border-blue-500 focus:ring-blue-200'
                                }`}
                                placeholder={licenseConfig.licenseType === 'إستئذان طبي' ? 'ساعات' : 'ساعات'}
                              />
                              <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 font-bold text-xs ${
                                licenseConfig.licenseType === 'إستئذان طبي' ? 'text-green-500' : 'text-blue-500'
                              }`}>ساعة</span>
                            </div>
                            <div className="flex-1">
                              <div className={`text-sm font-medium py-4 px-4 rounded-lg border shadow-sm ${
                                licenseConfig.licenseType === 'إستئذان طبي' 
                                  ? 'bg-green-50 border-green-200 text-green-800' 
                                  : 'bg-blue-50 border-blue-200 text-gray-700'
                              }`}>
                                {licenseConfig.hours ? (
                                  <div className="space-y-2">
                                    {licenseConfig.licenseType === 'إستئذان طبي' ? (
                                      <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="font-medium">
                                          {licenseConfig.hours === 0.5 && "نصف ساعة طبية"}
                                          {licenseConfig.hours === 1 && "ساعة طبية واحدة"}
                                          {licenseConfig.hours === 1.5 && "ساعة ونصف طبية"}
                                          {licenseConfig.hours === 2 && "ساعتان طبيتان"}
                                          {licenseConfig.hours === 2.5 && "ساعتان ونصف طبية"}
                                          {licenseConfig.hours > 2.5 && `${licenseConfig.hours} ساعات طبية`}
                                        </span>
                                      </div>
                                    ) : licenseConfig.hours > 3 ? (
                                      <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-yellow-700 font-medium">تنبيه: مدة الإستئذان تتجاوز 3 ساعات</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-green-700 font-medium">
                                          {licenseConfig.hours === 0.5 && "نصف ساعة"}
                                          {licenseConfig.hours === 1 && "ساعة واحدة"}
                                          {licenseConfig.hours === 1.5 && "ساعة ونصف"}
                                          {licenseConfig.hours === 2 && "ساعتان"}
                                          {licenseConfig.hours === 2.5 && "ساعتان ونصف"}
                                          {licenseConfig.hours > 2.5 && `${licenseConfig.hours} ساعات`}
                                        </span>
                                      </div>
                                    )}

                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-center h-8">

                                    <span className={`${licenseConfig.licenseType === 'إستئذان طبي' ? 'text-green-700' : 'text-blue-700'}`}>
                                      {licenseConfig.licenseType === 'إستئذان طبي' 
                                        ? 'الرجاء تحديد عدد الساعات الطبية' 
                                        : 'الرجاء تحديد عدد ساعات الإستئذان'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes Input */}
                    <div className={`space-y-3 p-4 rounded-xl ${
                      licenseConfig.licenseType === 'إستئذان طبي' 
                        ? 'bg-green-50 border border-green-100' 
                        : 'bg-gray-50 border border-gray-100'
                    }`}>
                      <label className="block text-sm font-semibold flex items-center">
                        {licenseConfig.licenseType === 'إستئذان طبي' ? (
                          <>
                            <svg className="w-4 h-4 ml-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            ملاحظات (اختياري)
                          </>
                        ) : 'ملاحظات (اختياري)'}
                      </label>
                      <textarea
                        value={licenseConfig.notes || ''}
                        onChange={(e) => setLicenseConfig(prev => ({ ...prev, notes: e.target.value }))}
                        className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 min-h-[100px] ${
                          licenseConfig.licenseType === 'إستئذان طبي'
                            ? 'border-2 border-green-200 focus:border-green-500 focus:ring-green-200 bg-white'
                            : 'border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                        placeholder={
                          licenseConfig.licenseType === 'إستئذان طبي'
                            ? 'أدخل أي ملاحظات إضافية...'
                            : 'أدخل أي ملاحظات إضافية...'
                        }
                      />
                      </div>

                    {/* Duplicate Warning */}
                    {duplicateWarning && duplicateWarning.length > 0 && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 text-red-800 mb-4">
                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">تحذير: رخصة مكررة!</h4>
                            <p className="text-sm"><span className="font-bold">{licenseConfig.selectedEmployee?.rank} / {licenseConfig.selectedEmployee?.full_name}</span> لديه رخصة مسجلة مسبقاً في هذا التاريخ</p>
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
                        {licenseConfig.licenseType === 'يوم كامل' 
                          ? 'رخصة يوم كامل' 
                          : licenseConfig.licenseType === 'إستئذان طبي'
                          ? 'إستئذان طبي'
                          : 'إستئذان قصير'}
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
                        <p className="text-sm"><span className="font-bold">{licenseConfig.selectedEmployee?.rank} / {licenseConfig.selectedEmployee?.full_name}</span> لديه رخصة مسجلة مسبقاً في هذا التاريخ</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <p className="text-red-700 font-medium mb-3">تفاصيل الرخصة الموجودة لـ <span className="font-bold">{licenseConfig.selectedEmployee?.rank} / {licenseConfig.selectedEmployee?.full_name}</span> في تاريخ {licenseConfig.licenseDate?.toLocaleDateString('ar-US', {
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="font-bold text-xl text-gray-800">{calculateEmployeeMonthlyStats.fullDayLicenses}</div>
                            <div className="text-gray-600 font-medium">رخصة يوم كامل</div>
                            <div className="text-xs text-green-600 mt-1">متبقي: {calculateEmployeeMonthlyStats.remainingFullDays} من {MONTHLY_LIMITS.FULL_DAY_LICENSES}</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="font-bold text-xl text-gray-800">{calculateEmployeeMonthlyStats.shortLicenses}</div>
                            <div className="text-gray-600 font-medium">استئذانات قصيرة</div>
                            <div className="text-xs text-green-600 mt-1">متبقي: {calculateEmployeeMonthlyStats.remainingShortLicenses} من {MONTHLY_LIMITS.SHORT_LICENSES}</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="font-bold text-xl text-gray-800">{calculateEmployeeMonthlyStats.totalHours.toFixed(2)}</div>
                            <div className="text-gray-600 font-medium">إجمالي الساعات</div>
                            <div className="text-xs text-green-600 mt-1">متبقي: {calculateEmployeeMonthlyStats.remainingHours} من {MONTHLY_LIMITS.MAX_HOURS_PER_MONTH} ساعة</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="font-bold text-xl text-green-800">{calculateEmployeeMonthlyStats.medicalLicenses}</div>
                            <div className="text-green-600 font-medium">إستئذان طبي</div>
                            <div className="text-xs text-green-600 mt-1">بدون حدود ✓</div>
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
              </div>
            )}
          </div>

          {/* Navigation - Hidden in step 2 */}
          {currentStep < 2 && (
            <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  currentStep === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700 shadow-md'
                }`}
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
                السابق
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleNext}
                  disabled={!licenseConfig.selectedEmployee || !!(duplicateWarning && duplicateWarning.length > 0) || hasCriticalLimitViolation}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg ${
                    licenseConfig.selectedEmployee && !(duplicateWarning && duplicateWarning.length > 0) && !hasCriticalLimitViolation
                      ? monthlyLimitWarning
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  التالي
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 Footer */}
          {currentStep === 2 && (
            <div className="px-8 py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-100 flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-md transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
                السابق
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex items-center gap-3 px-8 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    حفظ الاستئذان
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddLicense;
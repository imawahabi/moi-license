import React, { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle, CheckCircle, X, Calendar } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { EmployeeService } from '../services/employeeService';
import { Employee, License } from '../types';

const AddLicense: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [licenseType, setLicenseType] = useState<'يوم كامل' | 'نصف يوم'>('يوم كامل');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [licenseDate, setLicenseDate] = useState(todayStr);
  const [hours, setHours] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<License[] | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.rank.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.file_number.includes(searchQuery)
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchQuery, employees]);

  useEffect(() => {
    if (!multiSelectMode && selectedEmployee && licenseDate) {
      checkDuplicates();
    } else if (multiSelectMode && selectedEmployees.length > 0 && licenseDate) {
      checkMultipleDuplicates();
    } else {
      setDuplicateWarning(null);
    }
  }, [selectedEmployee, selectedEmployees, licenseDate, multiSelectMode]);

  const loadEmployees = async () => {
    try {
      const data = await EmployeeService.getAll();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (error) {
      console.error('Error loading employees:', error);
      setMessage({ type: 'error', text: 'فشل في تحميل قائمة الموظفين' });
    }
  };

  const checkDuplicates = async () => {
    if (!selectedEmployee || !licenseDate) return;

    try {
      const duplicates = await LicenseService.checkDuplicateDate(selectedEmployee.id, licenseDate);
      setDuplicateWarning(duplicates.length > 0 ? duplicates : null);
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  };

  const checkMultipleDuplicates = async () => {
    if (selectedEmployees.length === 0 || !licenseDate) return;

    try {
      const allDuplicates: License[] = [];
      for (const employee of selectedEmployees) {
        const duplicates = await LicenseService.checkDuplicateDate(employee.id, licenseDate);
        allDuplicates.push(...duplicates);
      }
      setDuplicateWarning(allDuplicates.length > 0 ? allDuplicates : null);
    } catch (error) {
      console.error('Error checking multiple duplicates:', error);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    if (multiSelectMode) {
      if (selectedEmployees.find(emp => emp.id === employee.id)) {
        setSelectedEmployees(selectedEmployees.filter(emp => emp.id !== employee.id));
      } else {
        setSelectedEmployees([...selectedEmployees, employee]);
      }
    } else {
      setSelectedEmployee(employee);
      setSearchQuery('');
    }
  };

  const removeSelectedEmployee = (employeeId: number) => {
    if (multiSelectMode) {
      setSelectedEmployees(selectedEmployees.filter(emp => emp.id !== employeeId));
    } else {
      setSelectedEmployee(null);
    }
  };

  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    setSelectedEmployee(null);
    setSelectedEmployees([]);
    setDuplicateWarning(null);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const employeesToProcess = multiSelectMode ? selectedEmployees : (selectedEmployee ? [selectedEmployee] : []);

    if (employeesToProcess.length === 0 || !licenseDate) {
      setMessage({ type: 'error', text: 'يرجى اختيار موظف واحد على الأقل وتحديد التاريخ' });
      return;
    }

    if (licenseType === 'نصف يوم' && (!hours || parseInt(hours) <= 0)) {
      setMessage({ type: 'error', text: 'يرجى إدخال عدد الساعات' });
      return;
    }

    // Check for duplicates before submission
    if (duplicateWarning && duplicateWarning.length > 0) {
      setMessage({
        type: 'error',
        text: 'لا يمكن إضافة رخص للموظفين المحددين. يوجد رخص مسجلة مسبقاً في نفس التاريخ.'
      });
      return;
    }

    setLoading(true);
    try {
      const date = new Date(licenseDate);
      const successfulLicenses: string[] = [];
      const failedLicenses: string[] = [];

      for (const employee of employeesToProcess) {
        try {
          // Double check for duplicates before creating
          const duplicates = await LicenseService.checkDuplicateDate(employee.id, licenseDate);
          if (duplicates.length > 0) {
            failedLicenses.push(`${employee.full_name} (يوجد رخصة مسبقة)`);
            continue;
          }

          const newLicense = {
            employee_id: employee.id,
            license_type: licenseType,
            license_date: licenseDate,
            hours: licenseType === 'نصف يوم' ? parseInt(hours) : undefined,
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            reason: '',
            approved: true
          };

          await LicenseService.create(newLicense);
          successfulLicenses.push(employee.full_name);
        } catch (error) {
          console.error(`Error creating license for ${employee.full_name}:`, error);
          failedLicenses.push(`${employee.full_name} (خطأ في الإضافة)`);
        }
      }

      // Show results
      if (successfulLicenses.length > 0 && failedLicenses.length === 0) {
        setMessage({
          type: 'success',
          text: `تم إضافة ${successfulLicenses.length} رخصة بنجاح للموظفين: ${successfulLicenses.join(', ')}`
        });
      } else if (successfulLicenses.length > 0 && failedLicenses.length > 0) {
        setMessage({
          type: 'warning',
          text: `تم إضافة ${successfulLicenses.length} رخصة بنجاح. فشل في إضافة ${failedLicenses.length} رخصة للموظفين: ${failedLicenses.join(', ')}`
        });
      } else {
        setMessage({
          type: 'error',
          text: `فشل في إضافة جميع الرخص للموظفين: ${failedLicenses.join(', ')}`
        });
      }

      // Reset form
      setSelectedEmployee(null);
      setSelectedEmployees([]);
      setLicenseDate(todayStr);
      setHours('');
      setSearchQuery('');
      setDuplicateWarning(null);

    } catch (error) {
      console.error('Error creating licenses:', error);
      setMessage({ type: 'error', text: 'فشل في إضافة الرخص' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-KW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">إضافة رخصة جديدة لموظف واحد أو عدة موظفين</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleMultiSelectMode}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                multiSelectMode
                  ? 'bg-white text-blue-600 shadow-lg hover:shadow-xl'
                  : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
              }`}
            >
              {multiSelectMode ? '✓ الوضع المتعدد مفعل' : 'تفعيل الاختيار المتعدد'}
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 space-x-reverse ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {message.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
          {message.type === 'error' && <AlertTriangle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-lg font-semibold text-secondary-800">
                {multiSelectMode ? 'اختيار الموظفين *' : 'اختيار الموظف *'}
              </label>
              {multiSelectMode && (
                <span className="text-sm text-primary-600 font-medium">
                  تم اختيار {selectedEmployees.length} موظف
                </span>
              )}
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-secondary-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث عن موظف (الاسم، الرتبة، رقم الملف)"
                className="input-field pl-10"
              />
            </div>

            {/* Selected Employees Display */}
            {!multiSelectMode && selectedEmployee && (
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-primary-900">{selectedEmployee.full_name}</p>
                    <p className="text-sm text-primary-700">{selectedEmployee.rank} - {selectedEmployee.category}</p>
                    <p className="text-sm text-primary-600">رقم الملف: {selectedEmployee.file_number}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedEmployee(selectedEmployee.id)}
                    className="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Multiple Selected Employees Display */}
            {multiSelectMode && selectedEmployees.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-secondary-700">الموظفين المختارين:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedEmployees.map((employee) => (
                    <div key={employee.id} className="p-3 bg-primary-50 border border-primary-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-primary-900 text-sm">{employee.full_name}</p>
                          <p className="text-xs text-primary-700">{employee.rank}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedEmployee(employee.id)}
                          className="p-1 text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employee List */}
            {searchQuery && filteredEmployees.length > 0 && (
              (!multiSelectMode && !selectedEmployee) || multiSelectMode
            ) && (
              <div className="max-h-80 overflow-y-auto border border-secondary-200 rounded-xl shadow-lg">
                <div className="p-3 bg-secondary-50 border-b border-secondary-200">
                  <p className="text-sm font-medium text-secondary-700">
                    {multiSelectMode ? 'اختر الموظفين (يمكن اختيار أكثر من موظف)' : 'اختر موظف واحد'}
                  </p>
                </div>
                {filteredEmployees.map((employee) => {
                  const isSelected = multiSelectMode
                    ? selectedEmployees.find(emp => emp.id === employee.id)
                    : false;

                  return (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => handleEmployeeSelect(employee)}
                      className={`w-full text-right p-4 hover:bg-secondary-50 border-b border-secondary-100 last:border-b-0 transition-colors ${
                        isSelected ? 'bg-primary-50 border-primary-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-secondary-900">{employee.full_name}</p>
                          <p className="text-sm text-secondary-600">{employee.rank} - {employee.category}</p>
                          <p className="text-sm text-secondary-500">رقم الملف: {employee.file_number}</p>
                        </div>
                        {multiSelectMode && isSelected && (
                          <div className="p-1 bg-primary-600 text-white rounded-full">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!selectedEmployee && searchQuery && filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-secondary-600">
                <Search className="w-12 h-12 mx-auto mb-4 text-secondary-400" />
                <p>لم يتم العثور على موظفين</p>
              </div>
            )}
          </div>
          {/* Duplicate Warning */}
          {duplicateWarning && duplicateWarning.length > 0 && (
            <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl shadow-lg">
              <div className="flex items-center space-x-3 space-x-reverse mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-red-800 text-lg">تحذير: لا يمكن إضافة الرخصة</p>
                  <p className="text-red-700">يوجد رخصة مسجلة مسبقاً لهذا الموظف في نفس التاريخ</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <p className="font-medium text-red-800 mb-2">الرخص الموجودة:</p>
                <div className="space-y-2">
                  {duplicateWarning.map((license) => (
                    <div key={license.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <span className="text-red-700 font-medium">
                        {license.license_type} - {new Date(license.license_date).toLocaleDateString('ar-US', { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' })}
                      </span>
                      {license.hours && (
                        <span className="badge badge-danger">
                          {license.hours} ساعات
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* License Type */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-secondary-700">
              نوع الرخصة *
            </label>
            <div className="flex space-x-4 space-x-reverse">
              <label className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  value="يوم كامل"
                  checked={licenseType === 'يوم كامل'}
                  onChange={(e) => setLicenseType(e.target.value as 'يوم كامل' | 'نصف يوم')}
                  className="w-4 h-4 text-primary-600 border-secondary-300 focus:ring-primary-500"
                />
                <span>يوم كامل</span>
              </label>
              <label className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="radio"
                  value="نصف يوم"
                  checked={licenseType === 'نصف يوم'}
                  onChange={(e) => setLicenseType(e.target.value as 'يوم كامل' | 'نصف يوم')}
                  className="w-4 h-4 text-primary-600 border-secondary-300 focus:ring-primary-500"
                />
                <span>نصف يوم</span>
              </label>
            </div>
          </div>

          {/* License Date */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-secondary-700">
              تاريخ الرخصة
              <span className="text-red-500 mx-1">*</span>
            </label>
            <input
              type="date"
              value={licenseDate}
              onChange={(e) => setLicenseDate(e.target.value)}
              className="input-field text-right"
              required
            />
          </div>

          {/* Hours (if license type is hours) */}
          {licenseType === 'نصف يوم' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary-700">
                عدد الساعات *
              </label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="أدخل عدد الساعات"
                min="1"
                max="24"
                className="input-field"
                required
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 space-x-reverse">
            <button
              type="button"
              onClick={() => {
                setSelectedEmployee(null);
                setLicenseDate(todayStr);
                setHours('');
                setSearchQuery('');
                setMessage(null);
                setDuplicateWarning(null);
              }}
              className="btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                (!multiSelectMode && !selectedEmployee) ||
                (multiSelectMode && selectedEmployees.length === 0) ||
                !licenseDate ||
                Boolean(duplicateWarning && duplicateWarning.length > 0)
              }
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' :
               (duplicateWarning && duplicateWarning.length > 0) ? 'لا يمكن الإضافة - يوجد تكرار' :
               multiSelectMode ? `إضافة رخصة لـ ${selectedEmployees.length} موظف` :
               'إضافة الرخصة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLicense;
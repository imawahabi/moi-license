import React, { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { EmployeeService } from '../services/employeeService';
import { Employee, License } from '../types';

const AddLicense: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
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
    if (selectedEmployee && licenseDate) {
      checkDuplicates();
    } else {
      setDuplicateWarning(null);
    }
  }, [selectedEmployee, licenseDate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee || !licenseDate) {
      setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

        if (licenseType === 'نصف يوم' && (!hours || parseInt(hours) <= 0)) {
      setMessage({ type: 'error', text: 'يرجى إدخال عدد الساعات' });
      return;
    }

    setLoading(true);
    try {
      const date = new Date(licenseDate);
      const newLicense = {
        employee_id: selectedEmployee.id,
        license_type: licenseType,
        license_date: licenseDate,
                hours: licenseType === 'نصف يوم' ? parseInt(hours) : undefined,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      };

      await LicenseService.create(newLicense);
      
      setMessage({ type: 'success', text: 'تم إضافة الرخصة بنجاح' });
      
      // Reset form
      setSelectedEmployee(null);
      setLicenseDate(todayStr);
      setHours('');
      setSearchQuery('');
      setDuplicateWarning(null);
      
    } catch (error) {
      console.error('Error creating license:', error);
      setMessage({ type: 'error', text: 'فشل في إضافة الرخصة' });
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 space-x-reverse">
        <Plus className="w-6 h-6 text-primary-600" />
        <h1 className="text-2xl font-bold text-secondary-900">إضافة رخصة جديدة</h1>
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
          <div className="space-y-3">
            <label className="block text-sm font-medium text-secondary-700">
              اختيار الموظف *
            </label>
            
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

            {/* Selected Employee */}
            {selectedEmployee && (
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary-900">{selectedEmployee.full_name}</p>
                    <p className="text-sm text-primary-600">{selectedEmployee.rank} - {selectedEmployee.category}</p>
                    <p className="text-sm text-primary-600">رقم الملف: {selectedEmployee.file_number}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {/* Employee List */}
            {!selectedEmployee && searchQuery && filteredEmployees.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-secondary-200 rounded-lg">
                {filteredEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => setSelectedEmployee(employee)}
                    className="w-full text-right p-3 hover:bg-secondary-50 border-b border-secondary-100 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-secondary-900">{employee.full_name}</p>
                      <p className="text-sm text-secondary-600">{employee.rank} - {employee.category}</p>
                      <p className="text-sm text-secondary-500">رقم الملف: {employee.file_number}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!selectedEmployee && searchQuery && filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-secondary-600">
                <Search className="w-12 h-12 mx-auto mb-4 text-secondary-400" />
                <p>لم يتم العثور على موظفين</p>
              </div>
            )}
          </div>

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

          {/* Duplicate Warning */}
          {duplicateWarning && duplicateWarning.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <p className="font-medium text-yellow-800">تحذير: يوجد رخص أخرى في نفس التاريخ</p>
              </div>
              <div className="space-y-2">
                {duplicateWarning.map((license) => (
                  <div key={license.id} className="text-sm text-yellow-700">
                    {license.license_type} - {formatDate(license.license_date)}
                    {license.hours && ` (${license.hours} ساعات)`}
                  </div>
                ))}
              </div>
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
              disabled={loading || !selectedEmployee || !licenseDate}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' : 'إضافة الرخصة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLicense;
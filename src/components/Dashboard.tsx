import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, Clock, Users, TrendingUp, Calendar } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { EmployeeService } from '../services/employeeService';
import { LicenseStats, Employee, License } from '../types';
import EmployeeDetailsModal from './EmployeeDetailsModal';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentLicenses, setRecentLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeLicenses, setEmployeeLicenses] = useState<License[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, employeesData, licensesData] = await Promise.all([
        LicenseService.getStats(),
        EmployeeService.getAll(),
        LicenseService.getAll()
      ]);

      setStats(statsData);
      setEmployees(employeesData);
      setRecentLicenses(licensesData.slice(0, 10));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('حدث خطأ أثناء تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

    const handleViewDetails = async (employee: Employee | undefined) => {
    if (!employee) return;
    try {
      const licenses = await LicenseService.getByEmployee(employee.id);
      setSelectedEmployee(employee);
      setEmployeeLicenses(licenses);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading employee licenses:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // حساب عدد رخص الشهر الحالي
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const licensesThisMonth = recentLicenses.filter(l => l.month === currentMonth && l.year === currentYear);

  // أكثر موظف حصل على رخص خلال الشهر الحالي
  const licenseCountByEmployeeMonth = licensesThisMonth.reduce((acc, l) => {
    if (!l.employee) return acc;
    acc[l.employee.full_name] = (acc[l.employee.full_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostLicensesEmployeeMonth = Object.entries(licenseCountByEmployeeMonth).sort((a, b) => b[1] - a[1])[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg p-8">
          <p className="text-red-600 font-semibold text-lg">{error}</p>
          <button onClick={loadData} className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">لوحة التحكم</h1>
        <div className="flex items-center space-x-2 space-x-reverse text-secondary-600">
          <Calendar className="w-5 h-5" />
          <span>{formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-white border border-secondary-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600 font-medium">إجمالي الرخص</p>
              <p className="text-3xl font-bold text-secondary-900">{(stats?.total_licenses || 0).toLocaleString('en')}</p>
            </div>
            <div className="p-3 bg-primary-600 rounded-full">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card bg-white border border-secondary-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600 font-medium">رخص اليوم الكامل</p>
              <p className="text-3xl font-bold text-secondary-900">{(stats?.full_day_licenses || 0).toLocaleString('en')}</p>
            </div>
            <div className="p-3 bg-blue-600 rounded-full">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card bg-white border border-secondary-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600 font-medium">رخص الساعات</p>
              <p className="text-3xl font-bold text-secondary-900">{(stats?.hours_licenses || 0).toLocaleString('en')}</p>
            </div>
            <div className="p-3 bg-gray-600 rounded-full">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card bg-white border border-secondary-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-600 font-medium">إجمالي الساعات</p>
              <p className="text-3xl font-bold text-secondary-900">{(stats?.total_hours || 0).toLocaleString('en')}</p>
            </div>
            <div className="p-3 bg-secondary-700 rounded-full">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">معلومات إضافية</h3>
            <BarChart3 className="w-5 h-5 text-primary-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-secondary-100">
              <span className="text-secondary-600">إجمالي موظفي الإدارة</span>
              <span className="font-semibold text-secondary-900">{employees.length.toLocaleString('en')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-secondary-100">
              <span className="text-secondary-600">عدد رخص الشهر الحالي</span>
              <span className="font-semibold text-secondary-900">{licensesThisMonth.length.toLocaleString('en')}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-secondary-600">أكثر موظف حصل على رخص هذا الشهر</span>
              <span className="font-semibold text-secondary-900 flex items-center gap-2">
                {mostLicensesEmployeeMonth ? (
                  <>
                    {mostLicensesEmployeeMonth[0]}
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-900 text-white ml-1">
                      {mostLicensesEmployeeMonth[1]}
                    </span>
                  </>
                ) : 'لا يوجد'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">توزيع الموظفين</h3>
            <Users className="w-5 h-5 text-primary-500" />
          </div>
          <div className="space-y-3">
            {['ضابط', 'ضابط صف', 'مهني', 'مدني'].map((category) => {
              const count = employees.filter(emp => emp.category === category).length;
              const percentage = employees.length > 0 ? (count / employees.length) * 100 : 0;
              
              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary-600">{category}</span>
                    <span className="text-sm font-semibold text-secondary-900">{count.toLocaleString('en')}</span>
                  </div>
                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Licenses */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900">آخر الرخص المسجلة</h3>
          <FileText className="w-5 h-5 text-primary-500" />
        </div>
        
        {recentLicenses.length > 0 ? (
          <div className="table-container">
            <table className="table-unified">
              <thead>
                <tr>
                  <th>م</th>
                  <th>الرتبة</th>
                  <th>اسم الموظف</th>
                  <th>نوع الرخصة</th>
                  <th>تاريخ الرخصة</th>
                  <th>الساعات</th>
                </tr>
              </thead>
              <tbody>
                {recentLicenses.map((license, index) => (
                  <tr key={license.id}>
                    <td>{index + 1}</td>
                    <td>{license.employee?.rank}</td>
                                        <td className="font-medium">
                      <button onClick={() => handleViewDetails(license.employee)} className="text-primary-600 hover:text-primary-800 hover:underline focus:outline-none font-medium">
                        {license.employee?.full_name}
                      </button>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        license.license_type === 'يوم كامل'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {license.license_type}
                      </span>
                    </td>
                    <td>{formatDate(license.license_date)}</td>
                    <td>{license.hours ? license.hours.toLocaleString('en') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600">لا توجد رخص مسجلة حالياً</p>
          </div>
        )}
      </div>

      {showDetailsModal && selectedEmployee && (
        <EmployeeDetailsModal 
          employee={selectedEmployee} 
          licenses={employeeLicenses} 
          onClose={() => setShowDetailsModal(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
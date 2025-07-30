import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, Clock, Users, TrendingUp, Calendar, Award, History, UserCheck, Eye } from 'lucide-react';
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
  const [currentMonthStats, setCurrentMonthStats] = useState({ total: 0, fullDay: 0, hourly: 0 });
  const [lastMonthStats, setLastMonthStats] = useState({ total: 0, fullDay: 0, hourly: 0 });
  const [latestLicense, setLatestLicense] = useState<License | null>(null);
  const [employeeCategories, setEmployeeCategories] = useState({ officers: 0, ncos: 0, professionals: 0, civilians: 0 });
  const [employeeLicenses, setEmployeeLicenses] = useState<License[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const calculateEnhancedStats = (licenses: License[], employees: Employee[]) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Current month stats
    const currentMonthLicenses = licenses.filter(l => l.month === currentMonth && l.year === currentYear);
    const currentMonthFullDay = currentMonthLicenses.filter(l => l.license_type === 'يوم كامل').length;
    const currentMonthHourly = currentMonthLicenses.filter(l => l.license_type === 'نصف يوم').length;

    // Last month stats
    const lastMonthLicenses = licenses.filter(l => l.month === lastMonth && l.year === lastMonthYear);
    const lastMonthFullDay = lastMonthLicenses.filter(l => l.license_type === 'يوم كامل').length;
    const lastMonthHourlyCount = lastMonthLicenses.filter(l => l.license_type === 'نصف يوم').length;

    // Latest license (by creation date, not license date)
    const sortedLicenses = licenses.sort((a, b) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime());
    const latest = sortedLicenses[0] || null;

    // Employee categories
    const categories = {
      officers: employees.filter(e => e.category === 'ضابط').length,
      ncos: employees.filter(e => e.category === 'ضابط صف').length,
      professionals: employees.filter(e => e.category === 'مهني').length,
      civilians: employees.filter(e => e.category === 'مدني').length
    };

    setCurrentMonthStats({ total: currentMonthLicenses.length, fullDay: currentMonthFullDay, hourly: currentMonthHourly });
    setLastMonthStats({ total: lastMonthLicenses.length, fullDay: lastMonthFullDay, hourly: lastMonthHourlyCount });
    setLatestLicense(latest);
    setEmployeeCategories(categories);
  };

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

      // Calculate enhanced stats
      calculateEnhancedStats(licensesData, employeesData);

      // Get recent licenses (last 10) - sorted by creation date (when added to system)
      const sortedLicenses = licensesData
        .sort((a: License, b: License) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime())
        .slice(0, 10);
      setRecentLicenses(sortedLicenses);
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
      const licenses = await LicenseService.getByEmployee(String(employee.id));
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

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();

    const minutes = Math.floor(diffInMs / (1000 * 60));
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    if (weeks < 4) return `منذ ${weeks} أسبوع`;
    if (months < 12) return `منذ ${months} شهر`;

    const years = Math.floor(days / 365);
    return `منذ ${years} سنة`;
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

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 animate-pulse">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">جاري تحميل البيانات...</h2>
          <p className="text-gray-600">يرجى الانتظار</p>
        </div>
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
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Current Month Stats */}
        <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-blue-200 hover:border-blue-300 hover:-translate-y-2">
          <div className="absolute top-4 right-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pt-4">
            <div className="text-4xl font-bold text-blue-900 mb-2">{currentMonthStats.total.toLocaleString('en')}</div>
            <div className="text-lg font-semibold text-blue-700 mb-4">رخص الشهر الحالي</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-blue-600">يوم كامل</span>
                <span className="text-sm font-bold text-green-600">{currentMonthStats.fullDay}</span>
              </div>
              <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-blue-600">رخص الساعات المحددة</span>
                <span className="text-sm font-bold text-orange-600">{currentMonthStats.hourly}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Month Stats */}
        <div className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200 hover:border-gray-300 hover:-translate-y-2">
          <div className="absolute top-4 right-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <History className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pt-4">
            <div className="text-4xl font-bold text-gray-900 mb-2">{lastMonthStats.total.toLocaleString('en')}</div>
            <div className="text-lg font-semibold text-gray-700 mb-4">رخص الشهر الماضي</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-600">يوم كامل</span>
                <span className="text-sm font-bold text-green-600">{lastMonthStats.fullDay}</span>
              </div>
              <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-600">رخص الساعات المحددة</span>
                <span className="text-sm font-bold text-orange-600">{lastMonthStats.hourly}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Latest License */}
        <div className="group relative bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-green-200 hover:border-green-300 hover:-translate-y-2">
          <div className="absolute top-4 right-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Award className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pt-20">
            <div className="text-sm font-semibold text-green-700 mb-2">آخر رخصة مسجلة</div>
            {latestLicense ? (
              <>
                <div className="text-base font-bold text-green-900 mb-2 leading-tight">
                  {latestLicense.employee?.rank}
                </div>
                <div className="text-base font-semibold text-green-800 mb-3">
                  {latestLicense.employee?.full_name}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    latestLicense.license_type === 'يوم كامل'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-orange-200 text-orange-800'
                  }`}>
                    {latestLicense.license_type}
                  </span>
                  {latestLicense.hours && (
                    <span className="text-xs font-medium text-green-600">
                      {latestLicense.hours} ساعات
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-green-600">لا توجد رخص</div>
            )}
          </div>
        </div>

        {/* Total Employees */}
        <div className="group relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-orange-200 hover:border-orange-300 hover:-translate-y-2">
          <div className="absolute top-4 right-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <UserCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pt-4">
            <div className="text-4xl font-bold text-blue-900 mb-2">{employees.length.toLocaleString('en')}</div>
            <div className="text-lg font-semibold text-orange-700 mb-4">إجمالي الموظفين</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/60 rounded-lg px-2 py-1 text-center">
                <div className="text-xs font-medium text-orange-600">الضباط</div>
                <div className="text-sm font-bold text-orange-600">{employeeCategories.officers}</div>
              </div>
              <div className="bg-white/60 rounded-lg px-2 py-1 text-center">
                <div className="text-xs font-medium text-orange-600">ضباط الصف</div>
                <div className="text-sm font-bold text-orange-600">{employeeCategories.ncos}</div>
              </div>
              <div className="bg-white/60 rounded-lg px-2 py-1 text-center">
                <div className="text-xs font-medium text-orange-600">المهنيين</div>
                <div className="text-sm font-bold text-orange-600">{employeeCategories.professionals}</div>
              </div>
              <div className="bg-white/60 rounded-lg px-2 py-1 text-center">
                <div className="text-xs font-medium text-orange-600">المدنيين</div>
                <div className="text-sm font-bold text-orange-600">{employeeCategories.civilians}</div>
              </div>
            </div>
          </div>
        </div>

      </div>



      {/* Recent Licenses */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-500">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">آخر الرخص المسجلة</h3>
                <p className="text-blue-100 text-sm mt-1">عرض أحدث 10 رخص حسب تاريخ الإضافة للنظام</p>
              </div>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-xl">
              <span className="text-white font-bold text-lg">{recentLicenses.length}</span>
              <span className="text-blue-100 text-sm mr-1">رخصة</span>
            </div>
          </div>
        </div>

        {recentLicenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">م</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">الرتبة</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">اسم الموظف</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">نوع الرخصة</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">تاريخ الرخصة</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">الساعات</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">سجلت منذ</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLicenses.map((license, index) => (
                  <tr key={license.id} className="hover:bg-blue-50 transition-colors duration-200 group">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 group-hover:bg-blue-200">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold group-hover:bg-gray-200">
                        {license.employee?.category === 'ضابط' || license.employee?.category === 'ضابط صف'
                          ? license.employee?.rank
                          : license.employee?.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {license.employee?.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm ${
                        license.license_type === 'يوم كامل'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}>
                        {license.license_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-bold">
                      {formatDate(license.license_date)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {license.hours ? (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                          {license.hours.toLocaleString('en')} ساعات
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">يوم كامل</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                        {getTimeAgo((license as any).created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewDetails(license.employee)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 group/btn"
                        title="عرض تفاصيل الموظف"
                      >
                        <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-700 mb-2">لا توجد رخص مسجلة</h4>
            <p className="text-gray-500">لم يتم تسجيل أي رخص في النظام حتى الآن</p>
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
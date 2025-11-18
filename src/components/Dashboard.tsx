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
  const [allLicenses, setAllLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentMonthStats, setCurrentMonthStats] = useState({ total: 0, fullDay: 0, hourly: 0, medical: 0 });
  const [lastMonthStats, setLastMonthStats] = useState({ total: 0, fullDay: 0, hourly: 0, medical: 0 });
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

    // Debug: Check all licenses by type
    const allFullDay = licenses.filter(l => l.license_type === 'يوم كامل').length;
    const allShort = licenses.filter(l => l.license_type === 'إستئذان قصير').length;
    const allMedical = licenses.filter(l => l.license_type === 'إستئذان طبي').length;
    console.log('All licenses by type:', { fullDay: allFullDay, short: allShort, medical: allMedical, total: licenses.length });

    // Current month stats
    const currentMonthLicenses = licenses.filter(l => l.month === currentMonth && l.year === currentYear);
    const currentMonthFullDay = currentMonthLicenses.filter(l => l.license_type === 'يوم كامل').length;
    const currentMonthHourly = currentMonthLicenses.filter(l => l.license_type === 'إستئذان قصير').length;
    const currentMonthMedical = currentMonthLicenses.filter(l => l.license_type === 'إستئذان طبي').length;

    // Last month stats
    const lastMonthLicenses = licenses.filter(l => l.month === lastMonth && l.year === lastMonthYear);
    const lastMonthFullDay = lastMonthLicenses.filter(l => l.license_type === 'يوم كامل').length;
    const lastMonthHourlyCount = lastMonthLicenses.filter(l => l.license_type === 'إستئذان قصير').length;
    const lastMonthMedical = lastMonthLicenses.filter(l => l.license_type === 'إستئذان طبي').length;

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

    setCurrentMonthStats({ total: currentMonthLicenses.length, fullDay: currentMonthFullDay, hourly: currentMonthHourly, medical: currentMonthMedical });
    setLastMonthStats({ total: lastMonthLicenses.length, fullDay: lastMonthFullDay, hourly: lastMonthHourlyCount, medical: lastMonthMedical });
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
      setAllLicenses(licensesData);

      // Calculate enhanced stats from all licenses
      calculateEnhancedStats(licensesData, employeesData);

      // Get recent licenses (last 10) - sorted by creation date (when added to system)
      const sortedLicenses = [...licensesData]
        .sort((a: License, b: License) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime())
        .slice(0, 10);
      setRecentLicenses(sortedLicenses);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('حدث خطأ أثناء تحميل بيانات اللوحة الرئيسية. يرجى المحاولة مرة أخرى.');
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

  // حساب عدد استئذانات الشهر الحالي
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const licensesThisMonth = allLicenses.filter(l => l.month === currentMonth && l.year === currentYear);

  // أكثر موظف حصل على استئذانات خلال الشهر الحالي
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
    <div className="space-y-8">
      {/* Premium Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Current Month Stats */}
        <div className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md hover:shadow-xl transition-shadow duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5 pointer-events-none" />
          <div className="relative p-6 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-600 uppercase tracking-wide">الشهر الحالي</p>
                <h3 className="text-lg font-bold text-slate-900">إجمالي الاستئذانات</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
            <div className="pt-2">
              <div className="text-7xl font-black text-slate-900 leading-tight">
                {currentMonthStats.total.toLocaleString('en')}
              </div>
              <p className="text-xs text-slate-500 mt-14">استئذان خلال هذا الشهر</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">يوم كامل</div>
                  <div className="text-lg font-bold text-green-600">{currentMonthStats.fullDay}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">قصيرة</div>
                  <div className="text-lg font-bold text-orange-600">{currentMonthStats.hourly}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">طبية</div>
                  <div className="text-lg font-bold text-purple-600">{currentMonthStats.medical}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Month Stats */}
        <div className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md hover:shadow-xl transition-shadow duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-slate-600/5 pointer-events-none" />
          <div className="relative p-6 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-600 uppercase tracking-wide">الشهر الماضي</p>
                <h3 className="text-lg font-bold text-slate-900">إجمالي الاستئذانات</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <History className="w-6 h-6" />
              </div>
            </div>
            <div className="pt-2">
              <div className="text-7xl font-black text-slate-900 leading-tight">
                {lastMonthStats.total.toLocaleString('en')}
              </div>
              <p className="text-xs text-slate-500 mt-14">استئذان خلال الشهر السابق</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">يوم كامل</div>
                  <div className="text-lg font-bold text-green-600">{lastMonthStats.fullDay}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">قصيرة</div>
                  <div className="text-lg font-bold text-orange-600">{lastMonthStats.hourly}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">طبية</div>
                  <div className="text-lg font-bold text-purple-600">{lastMonthStats.medical}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Latest License */}
        <div className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md hover:shadow-xl transition-shadow duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-600/5 pointer-events-none" />
          <div className="relative p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">آخر استئذان</p>
                <h3 className="text-lg font-bold text-slate-900">مسجّل في النظام</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Award className="w-6 h-6" />
              </div>
            </div>
            {latestLicense ? (
              <div className="space-y-20">
                <div className="pt-10">
                  <div className="text-md font-bold text-slate-500 leading-snug">
                    {latestLicense.employee?.rank}
                  </div>
                  <div className="text-lg font-bold text-red-800 mt-1">
                    {latestLicense.employee?.full_name}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      latestLicense.license_type === 'يوم كامل'
                        ? 'bg-green-100 text-green-800'
                        : latestLicense.license_type === 'إستئذان طبي'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {latestLicense.license_type === 'يوم كامل'
                      ? 'رخصة يوم كامل'
                      : latestLicense.license_type === 'إستئذان طبي'
                      ? 'إستئذان طبي'
                      : 'استئذان قصير'}
                  </span>
                  <div className="text-xs text-slate-600">
                    {formatDate(latestLicense.license_date)}
                    {latestLicense.hours && ` • ${latestLicense.hours} ساعات`}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 pt-2">لا توجد استئذانات مسجلة.</p>
            )}
          </div>
        </div>

        {/* Total Employees */}
        <div className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md hover:shadow-xl transition-shadow duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-600/5 pointer-events-none" />
          <div className="relative p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">قوة إدارة السجل العام</p>
                <h3 className="text-sm font-bold text-slate-900">إجمالي الموظفين</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="pt-2">
              <div className="text-4xl font-black text-slate-900 leading-tight">
                {employees.length.toLocaleString('en')}
              </div>
              <p className="text-xs text-slate-500 mt-2">موظف مسجل في النظام</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">الضباط</div>
                  <div className="text-lg font-bold text-orange-600">{employeeCategories.officers}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">ضباط الصف</div>
                  <div className="text-lg font-bold text-orange-600">{employeeCategories.ncos}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">المهنيين</div>
                  <div className="text-lg font-bold text-orange-600">{employeeCategories.professionals}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-600 mb-1">المدنيين</div>
                  <div className="text-lg font-bold text-orange-600">{employeeCategories.civilians}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Licenses */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-shadow duration-500">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">الاستئذانات المسجلة حديثاً</h2>
                <p className="text-blue-100 text-sm mt-1">عرض أحدث 10 استئذانات حسب تاريخ الإضافة للنظام</p>
              </div>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-xl">
              <span className="text-white font-bold text-lg">{recentLicenses.length}</span>
              <span className="text-blue-100 text-sm mr-1">استئذان</span>
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
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">نوع الاستئذان</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">تاريخ الاستئذان</th>
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
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {license.employee?.category === 'ضابط' || license.employee?.category === 'ضابط صف'
                        ? license.employee?.rank
                        : license.employee?.category}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {license.employee?.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm ${
                          license.license_type === 'يوم كامل'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : license.license_type === 'إستئذان طبي'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}
                      >
                        {license.license_type === 'يوم كامل'
                          ? 'رخصة يوم كامل'
                          : license.license_type === 'إستئذان طبي'
                          ? 'إستئذان طبي'
                          : 'إستئذان قصير'}
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
                        <span className="text-gray-500 font-medium">
                          {license.license_type === 'يوم كامل'
                            ? 'رخصة يوم كامل'
                            : license.license_type === 'إستئذان طبي'
                            ? 'إستئذان طبي'
                            : 'بدون ساعات'}
                        </span>
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
            <h4 className="text-lg font-semibold text-gray-700 mb-2">لا توجد استئذانات مسجلة</h4>
            <p className="text-gray-500">لم يتم تسجيل أي استئذانات في النظام حتى الآن</p>
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
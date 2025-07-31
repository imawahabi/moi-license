import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import SultanBold from '../assets/fonts/Sultan-bold-normal.js';
import TimesBold from '../assets/fonts/Times-New-Roman-bold.js';
import { Printer, FileText, X, BarChart3 } from 'lucide-react';
import { Employee, License } from '../types';

interface EmployeeDetailsModalProps {
  employee: Employee;
  licenses: License[];
  onClose: () => void;
}

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ employee, licenses, onClose }) => {
  // Calculate current month licenses
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthLicenses = licenses.filter(l => l.month === currentMonth && l.year === currentYear);
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        // Using 'en-US' locale to force English numerals
        return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return 'تاريخ غير صالح';
    }
  };

  const getTimeSince = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMs = now.getTime() - created.getTime();

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

  const handlePrint = () => {
    const doc = new jsPDF();

    // Add fonts
    doc.addFileToVFS('Sultan-bold-normal.ttf', SultanBold);
    doc.addFont('Sultan-bold-normal.ttf', 'Sultan-bold', 'normal');

    doc.addFileToVFS('Times-New-Roman-bold.ttf', TimesBold);
    doc.addFont('Times-New-Roman-bold.ttf', 'Times-bold', 'normal');
    doc.setFont('Sultan-bold');
    doc.setFontSize(16);
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const currentMonthName = monthNames[currentMonth - 1];
    doc.text(`تقرير إستئذانات الموظف - ${currentMonthName} ${currentYear}`, 105, 20, { align: 'center' });

    // Employee Details
    doc.setFontSize(12);
    doc.text(`:الاسم`, 190, 40, { align: 'right' });
    doc.text(employee.full_name, 160, 40, { align: 'right' });

    doc.text(`:الرتبة`, 190, 50, { align: 'right' });
    doc.text(employee.rank, 160, 50, { align: 'right' });

    doc.text(`:رقم الملف`, 80, 40, { align: 'right' });
    doc.text(employee.file_number, 60, 40, { align: 'right' });

    doc.text(`:الفئة`, 80, 50, { align: 'right' });
    doc.text(employee.category, 60, 50, { align: 'right' });

    // Table
    const tableColumn = ["م", "نوع الاستئذان", "تاريخ الاستئذان", "عدد الساعات", "سُجلت منذ"];
    // Sort current month licenses by creation date (most recent first)
    const sortedCurrentMonthLicenses = currentMonthLicenses.sort((a: any, b: any) => {
      const createdAtA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.license_date).getTime();
      const createdAtB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.license_date).getTime();
      return createdAtB - createdAtA;
    });

    const tableRows: any[] = [];

    sortedCurrentMonthLicenses.forEach((license: any, index) => {
      const licenseData = [
        index + 1,
        license.license_type === 'يوم كامل' ? 'إستئذان طويل' : 'إستئذان قصير',
        formatDate(license.license_date),
        license.hours || '-',
        getTimeSince(license.created_at || license.license_date)
      ];
      tableRows.push(licenseData);
    });

    (doc as any).autoTable(tableColumn, tableRows, {
      startY: 60,
      theme: 'grid',
      styles: { font: 'Times-bold', halign: 'center' },
      headStyles: { fillColor: [22, 160, 133], font: 'Sultan-bold' },
      didParseCell: (data: any) => {
        if (data.column.index === 1) { // License Type column
          data.cell.styles.font = 'Sultan-bold';
        }
      }
    });

    doc.output('dataurlnewwindow');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[100vh] overflow-y-auto relative animate-fade-in-down">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">تفاصيل إستئذانات الموظف</h2>
                  <p className="text-yellow-300 text-xl font-bold mt-1 mr-2">{employee.rank} / {employee.full_name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 rounded-xl p-2"
                aria-label="إغلاق"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-gray-50">

          {/* Current Month Statistics */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl shadow-sm border border-blue-200 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-bold text-lg text-gray-800">إحصائيات الشهر الحالي</h4>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600 mb-1">{currentMonthLicenses.length}</div>
                <div className="text-xs font-medium text-gray-700">إجمالي الإستئذانات</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600 mb-1">
                  {currentMonthLicenses.filter(l => l.license_type === 'يوم كامل').length}
                </div>
                <div className="text-xs font-medium text-gray-700">إستئذانات طويلة</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-orange-600 mb-1">
                  {currentMonthLicenses.filter(l => l.license_type === 'نصف يوم').length}
                </div>
                <div className="text-xs font-medium text-gray-700">إستئذانات قصيرة</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-600 mb-1">
                  {currentMonthLicenses.reduce((sum, l) => sum + (l.hours || 0), 0)}
                </div>
                <div className="text-xs font-medium text-gray-700">ساعات الإستئذانات القصيرة</div>
              </div>
            </div>
          </div>

          {/* Current Month Licenses History */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="font-bold text-xl text-gray-800">سجل استئذانات الشهر الحالي</h4>
              </div>
              <div className="bg-indigo-100 px-3 py-1 rounded-lg">
                <span className="text-indigo-700 font-bold text-sm">{currentMonthLicenses.length} استئذان</span>
              </div>
            </div>

            {currentMonthLicenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">م</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">نوع الاستئذان</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">تاريخ الاستئذان</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">عدد الساعات</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">سُجلت منذ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentMonthLicenses
                      .sort((a: any, b: any) => {
                        // Sort by creation date (most recent first), fallback to license_date if created_at is not available
                        const createdAtA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.license_date).getTime();
                        const createdAtB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.license_date).getTime();
                        return createdAtB - createdAtA;
                      })
                      .map((license: any, index) => (
                      <tr key={license.id} className="hover:bg-blue-50 transition-colors duration-200 group">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 group-hover:bg-blue-200">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm ${
                            license.license_type === 'يوم كامل'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-orange-100 text-orange-800 border border-orange-200'
                          }`}>
                            {license.license_type === 'يوم كامل' ? 'إستئذان طويل' : 'إستئذان قصير'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-bold">
                          {formatDate(license.license_date)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {license.hours ? (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                              {license.hours} ساعات
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium">إستئذان طويل</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                            {getTimeSince((license as any).created_at || license.license_date)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد استئذانات في الشهر الحالي</h3>
                  <p className="text-gray-500 mb-4">لم يتم تسجيل أي استئذانات لهذا الموظف في الشهر الحالي</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailsModal;
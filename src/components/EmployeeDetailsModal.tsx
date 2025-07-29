import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import SultanBold from '../assets/fonts/Sultan-bold-normal.js';
import TimesBold from '../assets/fonts/Times-New-Roman-bold.js';
import { Printer } from 'lucide-react';
import { FileText, X } from 'lucide-react';
import { Employee, License } from '../types';

interface EmployeeDetailsModalProps {
  employee: Employee;
  licenses: License[];
  onClose: () => void;
}

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ employee, licenses, onClose }) => {
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

  const handlePrint = () => {
    const doc = new jsPDF();

    // Add fonts
    doc.addFileToVFS('Sultan-bold-normal.ttf', SultanBold);
    doc.addFont('Sultan-bold-normal.ttf', 'Sultan-bold', 'normal');

    doc.addFileToVFS('Times-New-Roman-bold.ttf', TimesBold);
    doc.addFont('Times-New-Roman-bold.ttf', 'Times-bold', 'normal');
    doc.setFont('Sultan-bold');
    doc.setFontSize(16);
    doc.text(`تقرير رخص الموظف`, 105, 20, { align: 'center' });

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
    const tableColumn = ["م", "نوع الرخصة", "تاريخ الرخصة", "عدد الساعات"];
    const tableRows: any[] = [];

    licenses.forEach((license, index) => {
      const licenseData = [
        index + 1,
        license.license_type,
        formatDate(license.license_date),
        license.hours || '-',
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
      <div className="bg-gray-50 rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-fade-in-down">
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 flex items-center justify-center rounded-full ml-4">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">تفاصيل رخص الموظف</h2>
              <p className="text-gray-500">عرض شامل لسجل الرخص والإحصائيات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-secondary p-2 inline-flex items-center gap-2">
                <Printer size={18} />
                <span>طباعة</span>
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-800 transition-colors rounded-full p-1 bg-gray-100 hover:bg-gray-200"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Employee Info & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <h4 className="font-bold text-lg text-gray-700 mb-4">المعلومات الشخصية</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">الاسم الكامل:</span>
                <span className="font-semibold text-gray-800">{employee.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الرتبة:</span>
                <span className="font-semibold text-gray-800">{employee.rank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">رقم الملف:</span>
                <span className="font-semibold text-gray-800">{employee.file_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الفئة:</span>
                <span className="font-semibold text-gray-800">{employee.category}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <h4 className="font-bold text-lg text-gray-700 mb-4">إحصائيات الرخص</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">إجمالي الرخص:</span>
                <span className="font-semibold text-gray-800">{licenses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">رخص اليوم الكامل:</span>
                <span className="font-semibold text-gray-800">{licenses.filter(l => l.license_type === 'يوم كامل').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">رخص نصف يوم:</span>
                <span className="font-semibold text-gray-800">{licenses.filter(l => l.license_type === 'نصف يوم').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">إجمالي الساعات:</span>
                <span className="font-semibold text-gray-800">{licenses.reduce((sum, l) => sum + (l.hours || 0), 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Licenses History */}
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <h4 className="font-bold text-lg text-gray-700 mb-4">سجل الرخص</h4>
          {licenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table-unified">
                <thead>
                  <tr>
                    <th>م</th>
                    <th>نوع الرخصة</th>
                    <th>تاريخ الرخصة</th>
                    <th>الساعات</th>
                    <th>الشهر</th>
                    <th>السنة</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license, index) => (
                    <tr key={license.id}>
                      <td>{index + 1}</td>
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
                      <td>{license.hours || '-'}</td>
                      <td>{license.month}</td>
                      <td>{license.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد رخص مسجلة لهذا الموظف</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailsModal;
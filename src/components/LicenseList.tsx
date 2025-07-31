import React, { useState, useEffect, useMemo } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, AlignmentType, ShadingType, BorderStyle, WidthType, VerticalAlign, HeightRule, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import SultanBold from '../assets/fonts/Sultan-bold-normal.js';
import { Search, Filter, Edit, Trash2, FileText, Download, X, FileEdit } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { EmployeeService } from '../services/employeeService';
import { License, Employee, FilterOptions } from '../types';
import DatePicker from './DatePicker';
import { CATEGORY_ORDER, OFFICER_RANK_ORDER, NCO_RANK_ORDER } from '../utils/sorting';

// Helper function to calculate time since registration
const getTimeSince = (createdAt: string) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInMs = now.getTime() - created.getTime();

  const hours = Math.floor(diffInMs / (1000 * 60 * 60));
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} سنة`;
  if (months > 0) return `${months} شهر`;
  if (weeks > 0) return `${weeks} أسبوع`;
  if (days > 0) return `${days} يوم`;
  if (hours > 0) return `${hours} ساعة`;
  return 'منذ قليل';
};


interface EditLicenseModalProps {
  license: License | null;
  employees: Employee[];
  onUpdate: (updatedLicense: Partial<License>) => void;
  onClose: () => void;
}

const EditLicenseModal: React.FC<EditLicenseModalProps> = ({ license, employees, onUpdate, onClose }) => {
  const [formData, setFormData] = useState<Partial<License>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeList, setShowEmployeeList] = useState(false);

  useEffect(() => {
    if (license) {
      setFormData({
        ...license,
        license_date: license.license_date.split('T')[0] // Format for input[type=date]
      });
      // Find and set the selected employee
      const employee = employees.find(emp => emp.id === license.employee_id);
      if (employee) {
        setSelectedEmployee(employee);
        setSearchQuery(employee.full_name);
      }
    } else {
      setFormData({});
      setSelectedEmployee(null);
      setSearchQuery('');
    }
  }, [license, employees]);

  if (!license) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSearchQuery(employee.full_name);
    setFormData(prev => ({ ...prev, employee_id: employee.id }));
    setShowEmployeeList(false);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.rank.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.file_number.toString().includes(searchQuery)
  );

  return (
    <div className="modal-overlay animate-fade-in" dir="rtl">
      <div className="modal-container animate-fade-in-down">
        <div className="modal-header">
          <h2 className="modal-title">
            <FileEdit className="w-6 h-6 text-primary-600" />
            تعديل الرخصة
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-secondary-600" />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-medium text-secondary-700 mb-2">الموظف *</label>

              {/* Selected Employee Display */}
              {selectedEmployee && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">{selectedEmployee.full_name}</p>
                      <p className="text-sm text-blue-700">{selectedEmployee.rank} - {selectedEmployee.category}</p>
                      <p className="text-sm text-blue-600">رقم الملف: {selectedEmployee.file_number}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(null);
                        setSearchQuery('');
                        setShowEmployeeList(true);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الرتبة، أو رقم الملف..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowEmployeeList(true);
                  }}
                  onFocus={() => setShowEmployeeList(true)}
                  className="input-field pl-10"
                />
              </div>

              {/* Employee List */}
              {showEmployeeList && searchQuery && filteredEmployees.length > 0 && (
                <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto border border-secondary-200 rounded-lg bg-white shadow-lg">
                  <div className="p-2 bg-secondary-50 border-b border-secondary-200">
                    <p className="text-sm font-medium text-secondary-700">اختر موظف</p>
                  </div>
                  {filteredEmployees.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => handleEmployeeSelect(employee)}
                      className="w-full text-right p-3 hover:bg-secondary-50 border-b border-secondary-100 last:border-b-0 transition-colors"
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
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">نوع الرخصة</label>
              <select
                name="license_type"
                value={formData.license_type || ''}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="يوم كامل">يوم كامل</option>
                <option value="نصف يوم">نصف يوم</option>
              </select>
            </div>
            {formData.license_type === 'نصف يوم' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">الساعات</label>
                <input
                  type="number"
                  name="hours"
                  value={formData.hours || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            )}
            <div>
              <DatePicker
                label="تاريخ الرخصة"
                value={formData.license_date || ''}
                onChange={(date) => setFormData(prev => ({ ...prev, license_date: date }))}
                placeholder="اختر التاريخ"
                required
              />
            </div>
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">
                إلغاء
              </button>
              <button type="submit" className="btn-primary">
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const LicenseList: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);

  const employeesWithLicenses = useMemo(() => {
    const licensedEmployeeIds = new Set(licenses.map(l => l.employee_id));
    return employees.filter(emp => licensedEmployeeIds.has(emp.id));
  }, [licenses, employees]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [licensesData, employeesData] = await Promise.all([
        LicenseService.getAll(),
        EmployeeService.getAll()
      ]);
      setLicenses(licensesData);
      setEmployees(employeesData);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const sortedAndFilteredLicenses = useMemo(() => {

    return licenses.filter(license => {
      const employee = license.employee;
      const searchLower = searchQuery.toLowerCase();

      const matchesSearch = !searchQuery ||
        employee?.full_name.toLowerCase().includes(searchLower) ||
        employee?.rank.toLowerCase().includes(searchLower) ||
        employee?.file_number.toLowerCase().includes(searchLower);

      const matchesFilters = 
        (!filters.employee_id || String(employee?.id) === String(filters.employee_id)) &&
        (!filters.license_type || license.license_type === filters.license_type) &&
        (!filters.month || license.month === Number(filters.month)) &&
        (!filters.year || license.year === Number(filters.year));

      return matchesSearch && matchesFilters;
    }).sort((a, b) => {
      const getRankOrder = (rank: string, category: string) => {
        if (category === 'ضابط') return OFFICER_RANK_ORDER[rank] ?? 99;
        if (category === 'ضابط صف') return NCO_RANK_ORDER[rank] ?? 99;
        return 99;
      };

      const categoryA = a.employee?.category || '';
      const categoryB = b.employee?.category || '';
      const categoryComparison = (CATEGORY_ORDER[categoryA] ?? 99) - (CATEGORY_ORDER[categoryB] ?? 99);
      if (categoryComparison !== 0) return categoryComparison;

      const rankA = a.employee?.rank || '';
      const rankB = b.employee?.rank || '';
      const rankComparison = getRankOrder(rankA, categoryA) - getRankOrder(rankB, categoryB);
      if (rankComparison !== 0) return rankComparison;

      return new Date(b.license_date).getTime() - new Date(a.license_date).getTime();
    });
  }, [licenses, searchQuery, filters]);

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الرخصة؟')) {
      try {
        await LicenseService.delete(id);
        setMessage({ text: 'تم حذف الرخصة بنجاح', type: 'success' });
        loadData();
      } catch (error) {
        console.error('Failed to delete license:', error);
        setMessage({ text: 'فشل حذف الرخصة', type: 'error' });
      }
    }
  };

  const handleEdit = (license: License) => {
    setSelectedLicense(license);
    setShowEditModal(true);
  };

  const handleUpdate = async (updatedLicense: Partial<License>) => {
    if (!selectedLicense) return;
    try {
      await LicenseService.update(String(selectedLicense.id), updatedLicense);
      setMessage({ text: 'تم تحديث الرخصة بنجاح', type: 'success' });
      setShowEditModal(false);
      setSelectedLicense(null);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to update license:', error);
      setMessage({ text: 'فشل تحديث الرخصة', type: 'error' });
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  };

  const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleDateString('ar-US', { month: 'long' });
  };

  const exportToWord = () => {
    if (sortedAndFilteredLicenses.length === 0) {
      setMessage({ text: 'لا توجد بيانات لتصديرها.', type: 'error' });
      return;
    }
    const title = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: "نظام رخص السجل العام",
        font: "Sultan bold",
        size: 42, // 21pt
        bold: false,
        underline: { type: UnderlineType.SINGLE, color: "000000" },
        rightToLeft: true,
      })],
      spacing: { after: 400 },
    });

    const createCell = (text: string, isHeader: boolean) => new TableCell({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text,
          font: isHeader ? "Sultan bold" : "Times New Roman",
          size: 26, // 13pt
          bold: !isHeader,
          rightToLeft: true,
        })],
      })],
      verticalAlign: VerticalAlign.CENTER,
      shading: isHeader ? { type: ShadingType.SOLID, color: 'E5E7EB', fill: 'E5E7EB' } : undefined,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      },
    });

    const tableHeader = new TableRow({
      children: ['م', 'الرتبة', 'اسم الموظف', 'رقم الملف', 'نوع الرخصة', 'تاريخ الرخصة', 'السنة'].map(text => createCell(text, true)),
      height: { value: 567, rule: HeightRule.EXACT }, // 1cm
    });

    const tableRows = sortedAndFilteredLicenses.map((license, index) => new TableRow({
      children: [
        createCell(String(index + 1), false),
        createCell(license.employee?.category === 'ضابط' || license.employee?.category === 'ضابط صف'
          ? license.employee?.rank || ''
          : license.employee?.category || '', false),
        createCell(license.employee?.full_name || '', false),
        createCell(license.employee?.file_number || '', false),
        createCell(license.license_type, false),
        createCell(formatDate(license.license_date), false),
        createCell(String(license.year), false),
      ],
      height: { value: 567, rule: HeightRule.EXACT }, // 1cm
    }));

    const table = new Table({
      rows: [tableHeader, ...tableRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720, // 0.5 inch
              bottom: 720, // 0.5 inch
              left: 720, // 0.5 inch
            },
          },
        },
        children: [title, table],
      }],
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const arabicMonths = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const currentMonthName = arabicMonths[month];
    const fileName = `نظام رخص السجل العام - ${currentMonthName} - ${year}.docx`;
    Packer.toBlob(doc).then(blob => {
      saveAs(blob, fileName);
    }).catch(err => {
      console.error('Word export error:', err);
      setMessage({ text: 'فشل تصدير ملف Word. تحقق من الكونسول لمزيد من التفاصيل.', type: 'error' });
    });
  };

  const exportToPDF = () => {
    console.log('LicenseList SultanBold Font Object:', SultanBold);
    if (sortedAndFilteredLicenses.length === 0) {
      setMessage({ text: 'لا توجد بيانات لتصديرها.', type: 'error' });
      return;
    }
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      doc.addFileToVFS('Sultan-bold-normal.ttf', SultanBold);
      doc.addFont('Sultan-bold-normal.ttf', 'Sultan-bold', 'normal');
      doc.setFont('Sultan-bold');
      doc.setR2L(true);

      const head = [['التاريخ', 'نوع الرخصة', 'رقم الملف', 'الاسم', 'الرتبة', 'م']];
      const body = sortedAndFilteredLicenses.map((license, index) => [
        formatDate(license.license_date),
        license.license_type,
        license.employee?.file_number || '',
        license.employee?.full_name || '',
        license.employee?.category === 'ضابط' || license.employee?.category === 'ضابط صف'
          ? license.employee?.rank || ''
          : license.employee?.category || '',
        index + 1
      ]);

      doc.setFontSize(18);
      doc.text('كشف الرخص', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

      (doc as any).autoTable({
        head,
        body,
        startY: 60,
        theme: 'grid',
        headStyles: { font: 'Sultan-bold', halign: 'center', fillColor: [217, 234, 211] },
        styles: { font: 'Sultan-bold', halign: 'center' },
        columnStyles: {
          3: { halign: 'right' }, // Align employee name to the right
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 3) {
            data.cell.text = [data.cell.text[0].split(' ').reverse().join('  ')];
          }
        },
      });

      doc.save('licenses_report.pdf');
    } catch (err) {
      console.error('PDF export error:', err);
      setMessage({ text: 'فشل تصدير ملف PDF. تحقق من الكونسول لمزيد من التفاصيل.', type: 'error' });
    }
  };

  const exportData = () => {
    if (sortedAndFilteredLicenses.length === 0) {
      setMessage({ text: 'لا توجد بيانات لتصديرها.', type: 'error' });
      return;
    }
    let csvContent = "\uFEFF"; // BOM for UTF-8
    csvContent += "م,الرتبة,اسم الموظف,رقم الملف,نوع الرخصة,تاريخ الرخصة,الساعات,الشهر,السنة\r\n";
    sortedAndFilteredLicenses.forEach((license, index) => {
      const row = [
        index + 1,
        license.employee?.rank || '',
        `"${license.employee?.full_name || ''}"`,
        `"${license.employee?.file_number || ''}"`,
        license.license_type,
        formatDate(license.license_date),
        license.hours || '',
        license.month,
        license.year
      ].join(',');
      csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "licenses.csv");
  };

    // Show loading state
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 animate-pulse">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">جاري تحميل البيانات...</h2>
            <p className="text-gray-600">يرجى الانتظار</p>
          </div>
        </div>
      );
    }

  if (error) {
    return <div className="flex justify-center items-center h-screen"><div className="text-red-500">{error}</div></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {message && (
        <div className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white z-50 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {message.text}
        </div>
      )}

        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-4">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">البحث السريع</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث بالاسم أو الرتبة أو رقم الملف..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-right"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Search className="w-4 h-4" />
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {searchQuery && (
                    <div className="mt-2 text-sm text-blue-600">
                      البحث عن: "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium ${
                    showFilters
                      ? 'bg-blue-100 text-blue-700 shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden md:block text-sm">الفلاتر</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {showFilters && (
        <div className="mt-4 animate-slide-up">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Filter className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">خيارات الفلترة</h3>
                <p className="text-xs text-gray-600">اختر الموظف ونوع الرخصة والتاريخ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الموظف</label>
                <select
                  value={filters.employee_id || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setFilters(prev => ({ ...prev, employee_id: value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                >
                  <option value="">جميع الموظفين</option>
                  {employeesWithLicenses.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} - {emp.rank}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الرخصة</label>
                <select
                  value={filters.license_type || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, license_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                >
                  <option value="">جميع الأنواع</option>
                  {[...new Set(licenses.map(l => l.license_type))].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الشهر</label>
                <select
                  value={filters.month || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                >
                  <option value="">جميع الشهور</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{getMonthName(Number(m))}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السنة</label>
                <select
                  value={filters.year || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                >
                  <option value="">جميع السنوات</option>
                  {[...new Set(licenses.map(l => l.year))].sort((a,b) => b-a).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={clearFilters}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg text-sm"
              >
                <X className="w-3.5 h-3.5" />
                مسح جميع الفلاتر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* License List */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-500">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">قائمة الرخص</h2>
                  <p className="text-blue-100 text-sm mt-1">إجمالي {sortedAndFilteredLicenses.length} رخصة من أصل {licenses.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-4 py-2 rounded-xl">
                  <span className="text-white font-bold text-lg">{sortedAndFilteredLicenses.length}</span>
                  <span className="text-blue-100 text-sm mr-1">رخصة</span>
                </div>
                <button
                  onClick={exportToPDF}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors duration-200 flex items-center gap-2"
                >
                  <FileText size={16} />
                  PDF
                </button>
                <button
                  onClick={exportToWord}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-semibold transition-colors duration-200 flex items-center gap-2"
                >
                  <Download size={16} />
                  Word
                </button>
                <button
                  onClick={exportData}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-semibold transition-colors duration-200 flex items-center gap-2"
                >
                  <Download size={16} />
                  CSV
                </button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-semibold text-lg">{error}</p>
              <button onClick={loadData} className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">م</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">الرتبة</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">اسم الموظف</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">رقم الملف</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">نوع الرخصة</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">تاريخ الرخصة</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">الساعات</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b-2 border-gray-200">سُجلت منذ</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedAndFilteredLicenses.length > 0 ? (
                    sortedAndFilteredLicenses.map((license, index) => (
                      <tr key={license.id} className="hover:bg-blue-50 transition-colors duration-200 group">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 group-hover:bg-blue-200">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">
                          <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold group-hover:bg-gray-200">
                            {license.employee?.category === 'ضابط' || license.employee?.category === 'ضابط صف'
                              ? license.employee?.rank
                              : license.employee?.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{license.employee?.full_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{license.employee?.file_number}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm ${
                            license.license_type === 'يوم كامل'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-orange-100 text-orange-800 border border-orange-200'
                          }`}>
                            {license.license_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">{formatDate(license.license_date)}</td>
                        <td className="px-6 py-4 text-sm">
                          {license.hours ? (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                              {license.hours} ساعات
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium">يوم كامل</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                            {getTimeSince(license.license_date)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(license)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 group/btn"
                              title="تعديل الرخصة"
                            >
                              <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                            </button>
                            <button
                              onClick={() => handleDelete(String(license.id))}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 group/btn"
                              title="حذف الرخصة"
                            >
                              <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد رخص</h3>
                          <p className="text-gray-500 mb-4">لم يتم العثور على أي رخص تطابق معايير البحث</p>
                          <div className="flex gap-3">
                            <button
                              onClick={clearFilters}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            >
                              مسح الفلاتر
                            </button>
                            <button
                              onClick={() => setSearchQuery('')}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            >
                              مسح البحث
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {showEditModal && (
        <EditLicenseModal
          license={selectedLicense}
          employees={employees}
          onUpdate={handleUpdate}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default LicenseList;
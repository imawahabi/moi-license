import React, { useState, useEffect, useMemo } from 'react';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, AlignmentType, ShadingType, BorderStyle, WidthType, VerticalAlign, HeightRule, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import SultanBold from '../assets/fonts/Sultan-bold-normal.js';
import { Search, Filter, Edit, Trash2, FileText, Download, X } from 'lucide-react';
import { LicenseService } from '../services/licenseService';
import { EmployeeService } from '../services/employeeService';
import { License, Employee, FilterOptions } from '../types';
import { CATEGORY_ORDER, OFFICER_RANK_ORDER, NCO_RANK_ORDER } from '../utils/sorting';


interface EditLicenseModalProps {
  license: License | null;
  employees: Employee[];
  onUpdate: (updatedLicense: Partial<License>) => void;
  onClose: () => void;
}

const EditLicenseModal: React.FC<EditLicenseModalProps> = ({ license, employees, onUpdate, onClose }) => {
  const [formData, setFormData] = useState<Partial<License>>({});

  useEffect(() => {
    if (license) {
      setFormData({
        ...license,
        license_date: license.license_date.split('T')[0] // Format for input[type=date]
      });
    } else {
      setFormData({});
    }
  }, [license]);

  if (!license) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-3 left-3 text-gray-500 hover:text-gray-800">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">تعديل الرخصة</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">الموظف</label>
            <select name="employee_id" value={formData.employee_id || ''} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">نوع الرخصة</label>
            <select name="license_type" value={formData.license_type || ''} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              <option value="يوم كامل">يوم كامل</option>
              <option value="نصف يوم">نصف يوم</option>
            </select>
          </div>
          {formData.license_type === 'نصف يوم' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">الساعات</label>
              <input type="number" name="hours" value={formData.hours || ''} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">تاريخ الرخصة</label>
            <input type="date" name="license_date" value={formData.license_date || ''} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">حفظ التغييرات</button>
          </div>
        </form>
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
  const [showFilters, setShowFilters] = useState(true);
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
      await LicenseService.update(selectedLicense.id, updatedLicense);
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
    return date.toLocaleDateString('ar-EG', { month: 'long' });
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
      children: ['م', 'الرتبة/المسمى', 'اسم الموظف', 'رقم الملف', 'نوع الرخصة', 'تاريخ الرخصة', 'السنة'].map(text => createCell(text, true)),
      height: { value: 567, rule: HeightRule.EXACT }, // 1cm
    });

    const tableRows = sortedAndFilteredLicenses.map((license, index) => new TableRow({
      children: [
        createCell(String(index + 1), false),
        createCell(license.employee?.rank || '', false),
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
        license.employee?.rank || '',
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

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div>جار التحميل...</div></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen"><div className="text-red-500">{error}</div></div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {message && (
          <div className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {message.text}
          </div>
        )}
        <div className="mb-6 p-4 bg-white rounded-xl shadow-md border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <input type="text" placeholder="ابحث بالاسم، الرتبة، أو رقم الملف..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-full transition-colors duration-200 ${showFilters ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Filter size={20} /></button>
            </div>
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 mt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                <select value={filters.employee_id || ''} onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  setFilters(prev => ({ ...prev, employee_id: value }));
                }} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  <option value="">الكل</option>
                  {employeesWithLicenses.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الرخصة</label>
                <select value={filters.license_type || ''} onChange={(e) => setFilters(prev => ({ ...prev, license_type: e.target.value }))} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  <option value="">الكل</option>
                  {[...new Set(licenses.map(l => l.license_type))].map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                <select value={filters.month || ''} onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  <option value="">الكل</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{getMonthName(Number(m))}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                <select value={filters.year || ''} onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  <option value="">الكل</option>
                  {[...new Set(licenses.map(l => l.year))].sort((a,b) => b-a).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={clearFilters} className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 w-full">مسح الفلتر</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">قائمة الرخص<span className="inline-block bg-primary-100 text-primary-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded-full">{sortedAndFilteredLicenses.length}</span></h2>
            <div className="flex items-center space-x-2 space-x-reverse">
              <button onClick={exportToPDF} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transform hover:scale-105 transition-transform duration-200"><FileText size={16} className="ml-2"/>PDF</button>
              <button onClick={exportToWord} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-transform duration-200"><FileText size={16} className="ml-2"/>Word</button>
              <button onClick={exportData} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform hover:scale-105 transition-transform duration-200"><Download size={16} className="ml-2"/>CSV</button>
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
            <div className="table-container">
              <table className="table-unified">
                <thead>
                  <tr>
                    <th>م</th>
                    <th>الرتبة</th>
                    <th>اسم الموظف</th>
                    <th>رقم الملف</th>
                    <th>نوع الرخصة</th>
                    <th>تاريخ الرخصة</th>
                    <th>الساعات</th>
                    <th>الشهر</th>
                    <th>السنة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredLicenses.length > 0 ? (
                    sortedAndFilteredLicenses.map((license, index) => (
                      <tr key={license.id}>
                        <td>{index + 1}</td>
                        <td>{license.employee?.rank}</td>
                        <td className="font-medium">{license.employee?.full_name}</td>
                        <td>{license.employee?.file_number}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${license.license_type === 'يوم كامل' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                            {license.license_type}
                          </span>
                        </td>
                        <td>{formatDate(license.license_date)}</td>
                        <td>{license.hours ? `${license.hours} ساعات` : 'يوم كامل'}</td>
                        <td>{getMonthName(license.month + 1)}</td>
                        <td>{license.year}</td>
                        <td>
                          <div className="flex items-center justify-center space-x-2 space-x-reverse">
                            <button onClick={() => handleEdit(license)} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(String(license.id))} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center py-10">لا توجد بيانات لعرضها.</td>
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
    </div>
  );
};

export default LicenseList;
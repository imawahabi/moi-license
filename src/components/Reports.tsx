import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Packer, Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, VerticalAlign, UnderlineType, ShadingType, HeightRule } from 'docx';
import { saveAs } from 'file-saver';
import { Search, Filter, FileText, Printer } from 'lucide-react';

import SultanBold from '../assets/fonts/Sultan-bold-normal.js';
import TimesBold from '../assets/fonts/Times-New-Roman-bold.js';

import { LicenseService } from '../services/licenseService';
import { EmployeeService } from '../services/employeeService';
import { Employee, License, FilterOptions, EmployeeLicenseStats } from '../types';
import { CATEGORY_ORDER, OFFICER_RANK_ORDER, NCO_RANK_ORDER } from '../utils/sorting';

const getMonthName = (monthIndex: number) => {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return months[monthIndex];
};

const Reports: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rank' | 'total' | 'name'>('rank');
  const [filters, setFilters] = useState<FilterOptions>(() => {
    const today = new Date();
    return {
      year: today.getFullYear().toString(),
      month: (today.getMonth() + 1).toString(),
    };
  });
  const [showFilters, setShowFilters] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesData, licensesData] = await Promise.all([
        EmployeeService.getAll(),
        LicenseService.getAll()
      ]);
      setEmployees(employeesData);
      setLicenses(licensesData);
    } catch (err) {
      console.error("Failed to load report data:", err);
      setError("حدث خطأ أثناء تحميل بيانات التقارير. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const allYears = Array.from(new Set(licenses.map(l => new Date(l.license_date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));

  const availableRanks = React.useMemo(() => {
    if (!filters.category) return [];
    if (filters.category === 'ضابط') return Object.keys(OFFICER_RANK_ORDER);
    if (filters.category === 'ضابط صف') return Object.keys(NCO_RANK_ORDER);
    return [];
  }, [filters.category]);

  const filteredLicenses = React.useMemo(() => {
    return licenses.filter(license => {
      if (!license.employee) return false;
      const licenseDate = new Date(license.license_date);
      const year = licenseDate.getFullYear().toString();
      const month = (licenseDate.getMonth() + 1).toString();

      const yearMatch = !filters.year || year === filters.year;
      const monthMatch = !filters.month || month === filters.month;
      const categoryMatch = !filters.category || license.employee.category === filters.category;
      const rankMatch = !filters.rank || license.employee.rank === filters.rank;
      const licenseTypeMatch = !filters.license_type || license.license_type === filters.license_type;

      return yearMatch && monthMatch && categoryMatch && rankMatch && licenseTypeMatch;
    });
  }, [licenses, filters]);

  const statsByEmployeeAndMonth = useMemo(() => {
    const stats: Record<string, EmployeeLicenseStats> = {};
    filteredLicenses.forEach((license) => {
      if (!license.employee) return;
      const licenseDate = new Date(license.license_date);
      const year = licenseDate.getFullYear();
      const month = licenseDate.getMonth();
      const monthName = getMonthName(month);
      const key = `${license.employee_id}-${year}-${month}`;

      if (!stats[key]) {
        stats[key] = {
          employee: license.employee,
          total: 0,
          fullDay: 0,
          halfDay: 0,
          totalHours: 0,
          month: monthName,
          year: year
        };
      }
      stats[key].total += 1;
      if (license.license_type === 'يوم كامل') {
        stats[key].fullDay += 1;
      } else if (license.license_type === 'نصف يوم') {
        stats[key].halfDay += 1;
        stats[key].totalHours += license.hours || 0;
      }
    });
    return Object.values(stats);
  }, [filteredLicenses]);

  const selectableEmployees = useMemo(() => {
    const employeesWithLicensesInFilter = new Set(filteredLicenses.map(l => l.employee_id));
    return employees
      .filter(emp => employeesWithLicensesInFilter.has(emp.id))
      .map(emp => ({ value: emp.id, label: emp.full_name }));
  }, [employees, filteredLicenses]);

  const sortedStats = useMemo(() => {
    let statsToSort = [...statsByEmployeeAndMonth];

    if (selectedEmployees.length > 0) {
      const selectedIds = new Set(selectedEmployees.map(s => s.value));
      statsToSort = statsToSort.filter(stat => selectedIds.has(stat.employee.id));
    }

    if (search) {
      statsToSort = statsToSort.filter(stat => 
        stat.employee.full_name.toLowerCase().includes(search.toLowerCase()) ||
        stat.employee.file_number.includes(search)
      );
    }

    const getRankOrder = (rank: string, category: string) => {
      if (category === 'ضابط') return OFFICER_RANK_ORDER[rank] ?? 99;
      if (category === 'ضابط صف') return NCO_RANK_ORDER[rank] ?? 99;
      return 99;
    };

    statsToSort.sort((a, b) => {
      switch (sortBy) {
        case 'rank':
          const categoryComparison = (CATEGORY_ORDER[a.employee.category] ?? 99) - (CATEGORY_ORDER[b.employee.category] ?? 99);
          if (categoryComparison !== 0) return categoryComparison;
          return getRankOrder(a.employee.rank, a.employee.category) - getRankOrder(b.employee.rank, b.employee.category);
        case 'total':
          return b.total - a.total;
        case 'name':
          return a.employee.full_name.localeCompare(b.employee.full_name);
        default:
          return 0;
      }
    });

    return statsToSort;
  }, [statsByEmployeeAndMonth, sortBy, search, selectedEmployees]);

  const clearFilters = () => {
    setFilters({});
    setSearch('');
    setSelectedEmployees([]);
  };

  const generatePdfDocument = (action: 'save' | 'print') => {
    console.log('SultanBold Font Object:', SultanBold);
    console.log('TimesBold Font Object:', TimesBold);
    if (sortedStats.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.addFileToVFS('Sultan-bold-normal.ttf', SultanBold.default);
    doc.addFont('Sultan-bold-normal.ttf', 'Sultan-bold', 'normal');
    doc.addFileToVFS('Times-New-Roman-bold.ttf', TimesBold.default);
    doc.addFont('Times-New-Roman-bold.ttf', 'Times-bold', 'normal');

    doc.setFont('Sultan-bold');
    doc.setFontSize(16);
    const reportTitle = `تقرير الرخص لـ ${filters.month ? getMonthName(parseInt(filters.month, 10) - 1) : ''} ${filters.year}`;
    doc.text(reportTitle, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

    const tableColumn = ["م", "الرتبة/المسمى", "اسم الموظف", "إجمالي الرخص", "رخص يوم كامل", "رخص نصف يوم", "إجمالي الساعات", "الشهر", "السنة"];
    const tableRows = sortedStats.map((stat, index) => ([
      index + 1,
      stat.employee.rank,
      stat.employee.full_name,
      stat.total,
      stat.fullDay,
      stat.halfDay,
      stat.totalHours,
      stat.month,
      stat.year,
    ]));

    (doc as any).autoTable({
      head: [tableColumn.reverse()],
      body: tableRows.map(row => row.reverse()),
      startY: 25,
      theme: 'grid',
      styles: { font: 'Times-bold', halign: 'center', cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], font: 'Sultan-bold', halign: 'center' },
      columnStyles: {
        5: { font: 'Sultan-bold', halign: 'right' }, // Employee Name (after reverse)
        6: { font: 'Sultan-bold', halign: 'right' }, // Rank (after reverse)
      },
    });

    if (action === 'print') {
      doc.output('dataurlnewwindow');
    } else {
      doc.save(`report_${filters.year}_${filters.month || 'all'}.pdf`);
    }
  };

  const exportToWord = () => {
    if (sortedStats.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
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

    const createCell = (text: string | number, isHeader: boolean) => new TableCell({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: String(text),
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
      children: [
        createCell('م', true),
        createCell('الرتبة/المسمى', true),
        createCell('اسم الموظف', true),
        createCell('إجمالي الرخص', true),
        createCell('رخص يوم كامل', true),
        createCell('رخص نصف يوم', true),
        createCell('إجمالي الساعات', true),
        createCell('الشهر', true),
        createCell('السنة', true),
      ],
      height: { value: 567, rule: HeightRule.EXACT }, // 1cm
    });

    const dataRows = sortedStats.map((stat, index) => new TableRow({
      children: [
        createCell(index + 1, false),
        createCell(stat.employee.rank, false),
        createCell(stat.employee.full_name, false),
        createCell(stat.total, false),
        createCell(stat.fullDay, false),
        createCell(stat.halfDay, false),
        createCell(stat.totalHours, false),
        createCell(stat.month, false),
        createCell(stat.year, false),
      ],
      height: { value: 567, rule: HeightRule.EXACT }, // 1cm
    }));

    const table = new Table({
      rows: [tableHeader, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720, right: 720, bottom: 720, left: 720, // 0.5 inch
            },
          },
        },
        children: [title, table],
      }],
    });

    const now = new Date();
    const year = filters.year || now.getFullYear();
    const month = filters.month ? parseInt(filters.month, 10) - 1 : now.getMonth();
    const monthName = getMonthName(month);
    const fileName = `تقرير رخص ${monthName} ${year}.docx`;

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, fileName);
    });
  };

  const exportToPDF = () => generatePdfDocument('save');
  const handlePrint = () => generatePdfDocument('print');

  const customStyles = {
    control: (base: any) => ({ 
      ...base, 
      textAlign: 'right', 
      minHeight: '38px', 
      borderRadius: '0.5rem', // rounded-lg
      borderColor: '#D1D5DB', // gray-300
    }),
    menu: (base: any) => ({ 
      ...base, 
      textAlign: 'right', 
      zIndex: 50, 
      borderRadius: '0.5rem' // rounded-lg
    }),
  };

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
    <div className="p-6 bg-gray-50 min-h-screen font-sans" dir="rtl">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">تقرير الرخص السنوي</h1>

      <div className="mb-6 p-4 bg-white rounded-xl shadow-md border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="ابحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg transition-colors duration-200 ${showFilters ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Filter size={20} /></button>
          </div>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 pt-4 mt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
              <select value={filters.year || ''} onChange={(e) => handleFilterChange('year', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                <option value="">الكل</option>
                {allYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
              <select value={filters.month || ''} onChange={(e) => handleFilterChange('month', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                <option value="">الكل</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{getMonthName(m - 1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
              <select value={filters.category || ''} onChange={(e) => handleFilterChange('category', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                <option value="">الكل</option>
                {Object.keys(CATEGORY_ORDER).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الرتبة</label>
              <select value={filters.rank || ''} onChange={(e) => handleFilterChange('rank', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" disabled={!filters.category}>
                <option value="">الكل</option>
                {availableRanks.map(rank => <option key={rank} value={rank}>{rank}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الرخصة</label>
              <select value={filters.license_type || ''} onChange={(e) => handleFilterChange('license_type', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                <option value="">الكل</option>
                <option value="يوم كامل">يوم كامل</option>
                <option value="نصف يوم">نصف يوم</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">الموظفين</label>
              <Select
                isMulti
                options={selectableEmployees}
                value={selectedEmployees}
                onChange={(newValue) => setSelectedEmployees(newValue as any[])}
                placeholder="اختيار موظفين..."
                classNamePrefix="react-select"
                styles={customStyles}
              />
            </div>
            <div className="flex items-end">
              <button onClick={clearFilters} className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 w-full">مسح الفلتر</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <p className="text-lg font-semibold text-gray-700">عرض {sortedStats.length} سجلًا</p>
          <div className="flex items-center gap-2">
            <label className="font-semibold text-gray-700">فرز حسب:</label>
            <button type="button" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === 'rank' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-200 text-gray-800'}`} onClick={() => setSortBy('rank')}>الرتبة</button>
            <button type="button" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === 'total' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-200 text-gray-800'}`} onClick={() => setSortBy('total')}>الإجمالي</button>
            <button type="button" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === 'name' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-200 text-gray-800'}`} onClick={() => setSortBy('name')}>الاسم</button>
          </div>
        </div>
        <div className="flex gap-2 justify-start md:justify-end w-full md:w-auto mt-4 md:mt-0">
          <button type="button" className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500" onClick={handlePrint}><Printer size={18} /> طباعة</button>
          <button type="button" className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" onClick={exportToPDF}><FileText size={18} /> PDF</button>
          <button type="button" className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" onClick={exportToWord}><FileText size={18} /> Word</button>
        </div>
      </div>

      <div className="table-container">
        <table className="table-unified">
          <thead>
            <tr>
              <th>م</th>
              <th>الرتبة/المسمى</th>
              <th>اسم الموظف</th>
              <th>إجمالي الرخص</th>
              <th>رخص يوم كامل</th>
              <th>رخص نصف يوم</th>
              <th>إجمالي الساعات</th>
              <th>الشهر</th>
              <th>السنة</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stat, index) => (
              <tr key={`${stat.employee.id}-${stat.year}-${stat.month}`}>
                <td>{index + 1}</td>
                <td>{stat.employee.rank}</td>
                <td>{stat.employee.full_name}</td>
                <td className="text-center font-bold">{stat.total}</td>
                <td className="text-center font-bold">{stat.fullDay}</td>
                <td className="text-center font-bold">{stat.halfDay}</td>
                <td className="text-center font-bold">{stat.totalHours}</td>
                <td className="text-center">{stat.month}</td>
                <td className="text-center">{stat.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;

import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Packer, Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, VerticalAlign, UnderlineType, ShadingType, HeightRule } from 'docx';
import { saveAs } from 'file-saver';
import { Search, Filter, FileText, Printer, Calendar } from 'lucide-react';

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
  // Smart default filters - show all data initially, but with current month date range
  const getCurrentMonthDefaults = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const firstDay = new Date(year, now.getMonth(), 1);
    const today = now;

    return {
      year: year.toString(),
      months: [month],
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  const defaults = getCurrentMonthDefaults();
  // Start with minimal filters to show data
  const [filters, setFilters] = useState<FilterOptions>({});
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Smart date range handler with improved logic
  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    console.log(`=== DATE RANGE CHANGE ===`);
    console.log(`Setting ${field} to:`, value);

    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);

    // When date range is set, clear conflicting filters
    if (value && (newDateRange.startDate || newDateRange.endDate)) {
      console.log('Clearing conflicting filters due to date range');
      setFilters(prev => ({
        ...prev,
        months: undefined,
        year: undefined
      } as any));
    }

    console.log('New date range:', newDateRange);
    console.log(`=== END DATE RANGE CHANGE ===`);
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

      // Set initial load flag
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (err) {
      console.error("Failed to load report data:", err);
      setError("حدث خطأ أثناء تحميل بيانات التقارير. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const allYears = Array.from(new Set(licenses.map(l => new Date(l.license_date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));

  // Define applyDateRangeFilter function before useMemo
  const applyDateRangeFilter = (stats: EmployeeLicenseStats[]) => {
    if (!dateRange.startDate && !dateRange.endDate) return stats;

    return stats.filter(stat => {
      const statDate = new Date(stat.year, stat.month - 1);
      const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const end = dateRange.endDate ? new Date(dateRange.endDate) : null;

      if (start && end) {
        return statDate >= start && statDate <= end;
      } else if (start) {
        return statDate >= start;
      } else if (end) {
        return statDate <= end;
      }
      return true;
    });
  };

  const availableRanks = React.useMemo(() => {
    if (!filters.category) return [];
    if (filters.category === 'ضابط') return Object.keys(OFFICER_RANK_ORDER);
    if (filters.category === 'ضابط صف') return Object.keys(NCO_RANK_ORDER);
    return [];
  }, [filters.category]);

  // Smart filtering logic - completely rewritten
  const filteredLicenses = React.useMemo(() => {
    console.log('=== FILTERING DEBUG ===');
    console.log('Total licenses:', licenses.length);
    console.log('Current filters:', filters);
    console.log('Date range:', dateRange);

    if (licenses.length === 0) {
      console.log('No licenses to filter');
      return [];
    }

    const filtered = licenses.filter(license => {
      if (!license.employee) {
        console.log('License without employee, skipping');
        return false;
      }

      const licenseDate = new Date(license.license_date);

      // Date range filter (PRIMARY - most important)
      let dateRangeMatch = true;
      if (dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
        dateRangeMatch = licenseDate >= startDate && licenseDate <= endDate;

        if (!dateRangeMatch) {
          console.log(`Date filter failed for ${license.employee.full_name}: ${licenseDate.toDateString()} not between ${startDate.toDateString()} and ${endDate.toDateString()}`);
        }
      } else if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate);
        dateRangeMatch = licenseDate >= startDate;
      } else if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateRangeMatch = licenseDate <= endDate;
      }

      // Year filter
      const licenseYear = licenseDate.getFullYear().toString();
      const yearMatch = !filters.year || licenseYear === filters.year;

      // Month filter (only if no date range is specified)
      let monthMatch = true;
      if (!dateRange.startDate && !dateRange.endDate) {
        const licenseMonth = licenseDate.getMonth() + 1;
        const monthsFilter = (filters as any).months;
        monthMatch = !monthsFilter || monthsFilter.length === 0 || monthsFilter.includes(licenseMonth);
      }

      // Category filter
      const categoriesFilter = (filters as any).categories;
      const categoryMatch = !categoriesFilter || categoriesFilter.length === 0 ||
        categoriesFilter.includes(license.employee.category);

      // License type filter
      const licenseTypeMatch = !filters.license_type || license.license_type === filters.license_type;

      const finalMatch = dateRangeMatch && yearMatch && monthMatch && categoryMatch && licenseTypeMatch;

      if (!finalMatch) {
        console.log(`Filter failed for ${license.employee.full_name}:`, {
          dateRangeMatch,
          yearMatch,
          monthMatch,
          categoryMatch,
          licenseTypeMatch
        });
      }

      return finalMatch;
    });

    console.log('Filtered result:', filtered.length, 'licenses');
    console.log('=== END FILTERING DEBUG ===');

    return filtered;
  }, [licenses, filters, dateRange]);

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

  // Professional report data matching the document format
  const professionalReportData = React.useMemo(() => {
    console.log('=== GENERATING PROFESSIONAL REPORT ===');
    console.log('Filtered licenses count:', filteredLicenses.length);

    const employeeMap = new Map();

    filteredLicenses.forEach(license => {
      const employeeId = license.employee.id;
      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employee: license.employee,
          fullDays: 0,
          halfDays: 0,
          totalHours: 0,
          licenses: []
        });
      }

      const data = employeeMap.get(employeeId);
      data.licenses.push(license);

      if (license.license_type === 'يوم كامل') {
        data.fullDays += 1;
        data.totalHours += 8;
      } else if (license.license_type === 'نصف يوم') {
        data.halfDays += 1;
        data.totalHours += 4;
      }
    });

    const result = Array.from(employeeMap.values()).sort((a, b) => {
      // Professional sorting: Category first, then rank within category
      const categoryOrder = { 'ضابط': 1, 'ضابط صف': 2, 'عريف': 3 };
      const aCategoryOrder = categoryOrder[a.employee.category as keyof typeof categoryOrder] || 4;
      const bCategoryOrder = categoryOrder[b.employee.category as keyof typeof categoryOrder] || 4;

      if (aCategoryOrder !== bCategoryOrder) {
        return aCategoryOrder - bCategoryOrder;
      }

      // Sort by rank within category (higher ranks first)
      if (a.employee.category === 'ضابط') {
        return (OFFICER_RANK_ORDER[a.employee.rank] || 999) - (OFFICER_RANK_ORDER[b.employee.rank] || 999);
      } else if (a.employee.category === 'ضابط صف') {
        return (NCO_RANK_ORDER[a.employee.rank] || 999) - (NCO_RANK_ORDER[b.employee.rank] || 999);
      }

      return a.employee.full_name.localeCompare(b.employee.full_name, 'ar');
    });

    console.log('Generated professional report:', result.length, 'employees');
    console.log('=== END PROFESSIONAL REPORT ===');

    return result;
  }, [filteredLicenses]);

  const selectableEmployees = useMemo(() => {
    const employeesWithLicensesInFilter = new Set(filteredLicenses.map(l => l.employee_id));
    return employees
      .filter(emp => employeesWithLicensesInFilter.has(emp.id))
      .map(emp => ({ value: emp.id, label: emp.full_name }));
  }, [employees, filteredLicenses]);

  const sortedStats = useMemo(() => {
    let statsToSort = [...statsByEmployeeAndMonth];

    // Apply date range filter
    statsToSort = applyDateRangeFilter(statsToSort);

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
  }, [statsByEmployeeAndMonth, sortBy, search, selectedEmployees, dateRange, applyDateRangeFilter]);

  const applyCurrentMonthFilter = () => {
    const defaults = getCurrentMonthDefaults();
    setFilters({
      year: defaults.year,
      months: defaults.months
    } as any);
    setSearch('');
    setSelectedEmployees([]);
    setDateRange({
      startDate: defaults.startDate,
      endDate: defaults.endDate
    });
  };

  const clearFilters = () => {
    setFilters({});
    setSearch('');
    setSelectedEmployees([]);
    setDateRange({
      startDate: '',
      endDate: ''
    });
  };

  // Generate professional report title matching the document
  const generateReportTitle = () => {
    const currentYear = new Date().getFullYear();
    let year = currentYear.toString();
    let dateRangeText = '';
    let categoryText = '';

    // Determine year from filters or date range
    if (filters.year) {
      year = filters.year;
    } else if (dateRange.startDate) {
      year = new Date(dateRange.startDate).getFullYear().toString();
    }

    // Generate date range text
    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      dateRangeText = `من تاريخ ${startDate.toLocaleDateString('en-US')} إلى تاريخ ${endDate.toLocaleDateString('en-US')}`;
    } else if ((filters as any).months && (filters as any).months.length > 0) {
      const monthNames = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                         'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const selectedMonths = (filters as any).months.map((m: number) => monthNames[m]).join(' - ');
      dateRangeText = `شهر ${selectedMonths}`;
    }

    // Generate category text
    if ((filters as any).categories && (filters as any).categories.length > 0) {
      categoryText = `( ${(filters as any).categories.join(' / ')} )`;
    }

    return {
      title: `تقرير متابعة موظفي إدارة السجل العام لسنة ${year}`,
      dateRange: dateRangeText,
      categories: categoryText
    };
  };

  const exportData = () => {
    if (professionalReportData.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }

    const reportTitle = generateReportTitle();
    const csvContent = [
      // Report title
      [reportTitle.title].join(','),
      [reportTitle.dateRange].join(','),
      [reportTitle.categories].join(','),
      [''].join(','), // Empty line
      // Headers
      ['م', 'الرتبة', 'اسم الموظف', 'يوم كامل', 'نصف يوم'].join(','),
      // Data
      ...professionalReportData.map((data, index) => [
        index + 1,
        data.employee.category === 'ضابط' || data.employee.category === 'ضابط صف'
          ? data.employee.rank
          : data.employee.category,
        data.employee.full_name,
        data.fullDays || 0,
        data.halfDays || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_متابعة_الموظفين_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePdfDocument = (action: 'save' | 'print') => {
    console.log('SultanBold Font Object:', SultanBold);
    console.log('TimesBold Font Object:', TimesBold);
    if (professionalReportData.length === 0) {
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

    const reportTitleData = generateReportTitle();

    // Add title
    doc.text(reportTitleData.title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

    // Add date range if available
    if (reportTitleData.dateRange) {
      doc.setFontSize(12);
      doc.text(reportTitleData.dateRange, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    }

    // Add categories if available
    if (reportTitleData.categories) {
      doc.setFontSize(14);
      doc.text(reportTitleData.categories, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
    }

    const tableColumn = ["م", "الرتبة", "اسم الموظف", "يوم كامل", "نصف يوم"];
    const tableRows = professionalReportData.map((data, index) => ([
      index + 1,
      data.employee.category === 'ضابط' || data.employee.category === 'ضابط صف'
        ? data.employee.rank
        : data.employee.category,
      data.employee.full_name,
      data.fullDays || 0,
      data.halfDays || 0
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
    if (professionalReportData.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }

    const reportTitleData = generateReportTitle();

    const title = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: reportTitleData.title,
        font: "Sultan bold",
        size: 42, // 21pt
        bold: false,
        underline: { type: UnderlineType.SINGLE, color: "000000" },
        rightToLeft: true,
      })],
      spacing: { after: 200 },
    });

    const dateRangeParagraph = reportTitleData.dateRange ? new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: reportTitleData.dateRange,
        font: "Sultan bold",
        size: 32, // 16pt
        bold: false,
        rightToLeft: true,
      })],
      spacing: { after: 200 },
    }) : null;

    const categoriesParagraph = reportTitleData.categories ? new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: reportTitleData.categories,
        font: "Sultan bold",
        size: 36, // 18pt
        bold: true,
        rightToLeft: true,
      })],
      spacing: { after: 400 },
    }) : null;

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
        createCell('الرتبة', true),
        createCell('اسم الموظف', true),
        createCell('يوم كامل', true),
        createCell('نصف يوم', true),
      ],
      height: { value: 567, rule: HeightRule.EXACT }, // 1cm
    });

    const dataRows = professionalReportData.map((data, index) => new TableRow({
      children: [
        createCell(index + 1, false),
        createCell(data.employee.category === 'ضابط' || data.employee.category === 'ضابط صف'
          ? data.employee.rank
          : data.employee.category, false),
        createCell(data.employee.full_name, false),
        createCell(data.fullDays || 0, false),
        createCell(data.halfDays || 0, false),
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
        children: [
          title,
          ...(dateRangeParagraph ? [dateRangeParagraph] : []),
          ...(categoriesParagraph ? [categoriesParagraph] : []),
          table
        ],
      }],
    });

    const reportTitleForFile = generateReportTitle();
    const fileName = `${reportTitleForFile.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;

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
      borderRadius: '0.5rem',
      borderColor: '#D1D5DB',
    }),
    menu: (base: any) => ({
      ...base,
      textAlign: 'right',
      zIndex: 9999,
      borderRadius: '0.5rem',
      position: 'absolute'
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999
    }),
    placeholder: (base: any) => ({
      ...base,
      textAlign: 'right',
      direction: 'rtl'
    }),
    singleValue: (base: any) => ({
      ...base,
      textAlign: 'right',
      direction: 'rtl'
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: '#E5E7EB',
      direction: 'rtl'
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      direction: 'rtl',
      textAlign: 'right'
    }),
    option: (base: any) => ({
      ...base,
      textAlign: 'right',
      direction: 'rtl'
    })
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
    <div className="space-y-6">

      {/* Search and Filters Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">البحث والفلترة</h3>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                showFilters
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Filter className="w-4 h-4 inline-block ml-2" />
              {showFilters ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search Bar */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="ابحث بالاسم أو رقم الملف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          {/* Filters */}
          {showFilters && (
            <div className="space-y-6">
              {/* Date Range Filter - Prominent */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  فلترة بالتاريخ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">من تاريخ</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">إلى تاريخ</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Other Filters */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4">فلاتر إضافية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">السنة</label>
                    <select
                      value={filters.year || ''}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className="w-full h-12 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="">جميع السنوات</option>
                      {allYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الشهور</label>
                    <div className="h-12">
                      <Select
                        isMulti
                        options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i) }))}
                        value={(filters as any).months ? (filters as any).months.map((m: number) => ({ value: m, label: getMonthName(m - 1) })) : []}
                        onChange={(newValue) => handleFilterChange('months', newValue ? newValue.map(v => v.value) : [])}
                        placeholder="اختيار الشهور..."
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          ...customStyles,
                          control: (base: any) => ({
                            ...customStyles.control(base),
                            minHeight: '48px',
                            height: '48px'
                          })
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الفئات</label>
                    <div className="h-12">
                      <Select
                        isMulti
                        options={Object.keys(CATEGORY_ORDER).map(cat => ({ value: cat, label: cat }))}
                        value={(filters as any).categories ? (filters as any).categories.map((cat: string) => ({ value: cat, label: cat })) : []}
                        onChange={(newValue) => handleFilterChange('categories', newValue ? newValue.map(v => v.value) : [])}
                        placeholder="اختيار الفئات..."
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          ...customStyles,
                          control: (base: any) => ({
                            ...customStyles.control(base),
                            minHeight: '48px',
                            height: '48px'
                          })
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الرخصة</label>
                    <select
                      value={filters.license_type || ''}
                      onChange={(e) => handleFilterChange('license_type', e.target.value)}
                      className="w-full h-12 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="">جميع الأنواع</option>
                      <option value="يوم كامل">يوم كامل</option>
                      <option value="نصف يوم">نصف يوم</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الموظفين</label>
                    <div className="h-12">
                      <Select
                        isMulti
                        options={selectableEmployees}
                        value={selectedEmployees}
                        onChange={(newValue) => setSelectedEmployees(newValue as any[])}
                        placeholder="اختيار موظفين محددين..."
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          ...customStyles,
                          control: (base: any) => ({
                            ...customStyles.control(base),
                            minHeight: '48px',
                            height: '48px'
                          })
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={applyCurrentMonthFilter}
                    className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    الشهر الحالي
                  </button>
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    مسح الفلاتر
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Professional Results Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">نتائج التقرير</h3>
                <p className="text-green-100 text-sm">عرض {professionalReportData.length} موظف</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 px-3 py-1 rounded-lg">
                <span className="text-white font-bold">{professionalReportData.length}</span>
                <span className="text-green-100 text-sm mr-1">موظف</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-white text-sm font-medium">فرز:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'rank' | 'total' | 'name')}
                  className="px-3 py-1 rounded-lg text-sm bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="rank" className="text-gray-800">الرتبة</option>
                  <option value="total" className="text-gray-800">الإجمالي</option>
                  <option value="name" className="text-gray-800">الاسم</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  onClick={exportData}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  onClick={exportToWord}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Word
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  onClick={exportToPDF}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  onClick={handlePrint}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  طباعة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Report Title */}
        {professionalReportData.length > 0 && (
          <div className="px-6 py-6 bg-gray-50 border-b border-gray-200">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {generateReportTitle().title}
              </h2>
              {generateReportTitle().dateRange && (
                <p className="text-gray-600 mb-1">
                  {generateReportTitle().dateRange}
                </p>
              )}
              {generateReportTitle().categories && (
                <p className="text-blue-600 font-semibold">
                  {generateReportTitle().categories}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">م</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">الرتبة</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">اسم الموظف</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">يوم كامل</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-gray-200">نصف يوم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {professionalReportData.length > 0 ? professionalReportData.map((data, index) => (
                <tr key={data.employee.id} className="hover:bg-green-50 transition-colors duration-200 group">
                  <td className="px-6 py-4 text-center text-sm text-gray-900">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600 group-hover:bg-green-200 mx-auto">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold group-hover:bg-gray-200">
                      {data.employee.category === 'ضابط' || data.employee.category === 'ضابط صف'
                        ? data.employee.rank
                        : data.employee.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">{data.employee.full_name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                      {data.fullDays || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                      {data.halfDays || '-'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-16 h-16 text-gray-300" />
                      <p className="text-lg font-medium">لا توجد بيانات</p>
                      <p className="text-sm">جرب تغيير الفلاتر للحصول على نتائج</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;

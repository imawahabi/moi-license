import { Employee } from '../types';

/**
 * أداة لاستيراد بيانات الموظفين من ملف SQL
 */
export class SQLImporter {
  /**
   * تحليل INSERT statement وإرجاع بيانات الموظفين
   */
  static parseEmployeesFromSQL(sqlContent: string): Employee[] {
    const employees: Employee[] = [];
    
    // البحث عن INSERT statements للموظفين
    const insertRegex = /INSERT INTO `employees`.*?VALUES\s*(.*?);/gis;
    const matches = sqlContent.match(insertRegex);
    
    if (!matches) {
      console.warn('لم يتم العثور على بيانات الموظفين في ملف SQL');
      return employees;
    }
    
    matches.forEach(match => {
      // استخراج القيم من VALUES
      const valuesMatch = match.match(/VALUES\s*(.*?);/is);
      if (!valuesMatch) return;
      
      const valuesString = valuesMatch[1];
      
      // تحليل كل صف من البيانات
      const rowRegex = /\(([^)]+)\)/g;
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(valuesString)) !== null) {
        const values = this.parseRowValues(rowMatch[1]);
        
        if (values.length >= 6) {
          const employee: Employee = {
            id: values[0].toString(),
            full_name: values[1],
            rank: values[2],
            file_number: values[3],
            category: values[4] as 'ضابط' | 'ضابط صف' | 'مهني' | 'مدني',
            created_at: values[5],
            updated_at: values[6]
          };
          
          employees.push(employee);
        }
      }
    });
    
    return employees;
  }
  
  /**
   * تحليل قيم الصف الواحد
   */
  private static parseRowValues(rowString: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < rowString.length; i++) {
      const char = rowString[i];
      
      if (!inQuotes && (char === "'" || char === '"')) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        // تحقق من escape character
        if (i + 1 < rowString.length && rowString[i + 1] === quoteChar) {
          current += char;
          i++; // تخطي الحرف التالي
        } else {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (!inQuotes && char === ',') {
        values.push(current.trim());
        current = '';
      } else if (char !== "'" && char !== '"' || inQuotes) {
        current += char;
      }
    }
    
    // إضافة القيمة الأخيرة
    if (current.trim()) {
      values.push(current.trim());
    }
    
    return values;
  }
  
  /**
   * تحويل بيانات الموظفين إلى تنسيق JSON
   */
  static employeesToJSON(employees: Employee[]): string {
    return JSON.stringify(employees, null, 2);
  }
  
  /**
   * تحويل بيانات الموظفين إلى تنسيق TypeScript
   */
  static employeesToTypeScript(employees: Employee[]): string {
    const employeesCode = employees.map(emp => {
      return `  { id: '${emp.id}', full_name: '${emp.full_name}', rank: '${emp.rank}', file_number: '${emp.file_number}', category: '${emp.category}' as const, created_at: '${emp.created_at}', updated_at: '${emp.updated_at}' }`;
    }).join(',\n');
    
    return `const mockEmployees = [\n${employeesCode}\n];`;
  }
  
  /**
   * تصفية الموظفين حسب الفئة
   */
  static filterByCategory(employees: Employee[], category: string): Employee[] {
    return employees.filter(emp => emp.category === category);
  }
  
  /**
   * إحصائيات الموظفين
   */
  static getEmployeeStats(employees: Employee[]) {
    const stats = {
      total: employees.length,
      officers: employees.filter(emp => emp.category === 'ضابط').length,
      nonCommissioned: employees.filter(emp => emp.category === 'ضابط صف').length,
      professional: employees.filter(emp => emp.category === 'مهني').length,
      civilian: employees.filter(emp => emp.category === 'مدني').length
    };
    
    return stats;
  }
}

/**
 * مثال على الاستخدام:
 * 
 * const sqlContent = `INSERT INTO employees ...`;
 * const employees = SQLImporter.parseEmployeesFromSQL(sqlContent);
 * const stats = SQLImporter.getEmployeeStats(employees);
 * const tsCode = SQLImporter.employeesToTypeScript(employees);
 */

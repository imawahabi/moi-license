import { License, FilterOptions, LicenseStats } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

// Mock data for development - Real employees from database
const mockEmployees = [
  { id: '9', full_name: 'مشاري سامي الوهيب', rank: 'رائد حقوقي', file_number: '612154', category: 'ضابط', created_at: '2025-07-16 06:19:50', updated_at: '2025-07-29 06:44:44' },
  { id: '10', full_name: 'خالد طارق بن شعبان', rank: 'ملازم أول', file_number: '743542', category: 'ضابط', created_at: '2025-07-16 06:20:18', updated_at: '2025-07-16 06:20:18' },
  { id: '11', full_name: 'محمد إبراهيم الحميدي', rank: 'ملازم أول حقوقي', file_number: '887981', category: 'ضابط', created_at: '2025-07-16 06:20:32', updated_at: '2025-07-16 06:20:32' },
  { id: '12', full_name: 'أحمد محمد ملا علي', rank: 'ملازم أول', file_number: '458325', category: 'ضابط', created_at: '2025-07-16 06:20:47', updated_at: '2025-07-16 06:20:47' },
  { id: '13', full_name: 'عمر صبحي الهندي', rank: 'و.أ.ضابط', file_number: '457515', category: 'ضابط', created_at: '2025-07-16 06:21:00', updated_at: '2025-07-16 06:21:00' },
  { id: '14', full_name: 'عقاب ميسر العياف', rank: 'و.أ.ضابط', file_number: '744212', category: 'ضابط صف', created_at: '2025-07-16 06:21:11', updated_at: '2025-07-16 06:21:17' },
  { id: '15', full_name: 'محمد مناحي القحطاني', rank: 'و.أ.ضابط', file_number: '237388', category: 'ضابط صف', created_at: '2025-07-16 06:21:30', updated_at: '2025-07-16 06:21:30' },
  { id: '16', full_name: 'حمود ناجي الجمعه', rank: 'و.أ.ضابط', file_number: '805521', category: 'ضابط صف', created_at: '2025-07-16 06:21:45', updated_at: '2025-07-16 06:21:45' },
  { id: '17', full_name: 'مساعد غصاب الفضلي', rank: 'و.أ.ضابط', file_number: '290947', category: 'ضابط صف', created_at: '2025-07-16 06:22:02', updated_at: '2025-07-16 06:22:02' },
  { id: '18', full_name: 'أنور علي النجار', rank: 'و.أ.ضابط', file_number: '289531', category: 'ضابط صف', created_at: '2025-07-16 06:22:17', updated_at: '2025-07-16 06:22:17' },
  { id: '34', full_name: 'عبدالمطلب محمد فوزي حجاج', rank: 'باحث قانوني', file_number: '882885', category: 'مهني', created_at: '2025-07-16 06:25:40', updated_at: '2025-07-16 06:26:08' },
  { id: '35', full_name: 'أحمد يسري ابو العلا', rank: 'طباع', file_number: '637998', category: 'مهني', created_at: '2025-07-16 06:25:51', updated_at: '2025-07-16 06:25:51' },
  { id: '73', full_name: 'محمد محمد قاسم أحمد', rank: 'رئيس قسم', file_number: '273112300976', category: 'مدني', created_at: '2025-07-24 07:14:30', updated_at: '2025-07-24 07:17:46' },
  { id: '76', full_name: 'حميده سعيد التحو', rank: 'رئيس قسم', file_number: '283072601334', category: 'مدني', created_at: '2025-07-24 07:18:18', updated_at: '2025-07-24 07:18:18' },
  { id: '80', full_name: 'عائشة صلاح محمد العميري', rank: 'سكرتيرة', file_number: '298050600105', category: 'مدني', created_at: '2025-07-24 07:19:40', updated_at: '2025-07-24 07:19:40' }
];

let mockLicenses: any[] = [];
let useMockData = false;

export class LicenseService {
  private static async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = 'حدث خطأ في الطلب';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // إذا فشل في تحليل JSON، استخدم رسالة افتراضية
          errorMessage = `خطأ ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      // إذا كان خطأ شبكة، استخدم البيانات الوهمية
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Using mock data due to server connection failure');
        useMockData = true;
        return this.handleMockRequest(endpoint, options);
      }
      throw error;
    }
  }

  private static handleMockRequest(endpoint: string, options: RequestInit = {}): any {
    const method = options.method || 'GET';

    if (endpoint === '/employees' && method === 'GET') {
      return mockEmployees;
    }

    if (endpoint === '/licenses' && method === 'GET') {
      return mockLicenses.map(license => {
        const employee = mockEmployees.find(emp => emp.id === license.employee_id);
        return {
          ...license,
          full_name: employee?.full_name || '',
          rank: employee?.rank || '',
          file_number: employee?.file_number || '',
          category: employee?.category || ''
        };
      });
    }

    if (endpoint === '/licenses' && method === 'POST') {
      const data = JSON.parse(options.body as string);
      const { employee_id, license_type, license_date, hours } = data;

      const employee = mockEmployees.find(emp => emp.id === employee_id);
      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      const date = new Date(license_date);
      const newLicense = {
        id: 'lic-' + Date.now(),
        employee_id,
        license_type,
        license_date,
        hours: hours || null,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        full_name: employee.full_name,
        rank: employee.rank,
        file_number: employee.file_number,
        category: employee.category
      };

      mockLicenses.push(newLicense);
      return newLicense;
    }

    if (endpoint.startsWith('/licenses/check-duplicate/')) {
      return []; // No duplicates in mock data
    }

    throw new Error('Mock endpoint not implemented: ' + endpoint);
  }

  static async getAll(): Promise<License[]> {
    const licenses = await this.request('/licenses');
    return licenses.map((license: any) => ({
      ...license,
      employee: {
        id: license.employee_id,
        full_name: license.full_name,
        rank: license.rank,
        file_number: license.file_number,
        category: license.category,
        created_at: '',
        updated_at: ''
      }
    }));
  }

  static async getById(id: string): Promise<License | null> {
    const license = await this.request(`/licenses/${id}`);
    return {
      ...license,
      employee: {
        id: license.employee_id,
        full_name: license.full_name,
        rank: license.rank,
        file_number: license.file_number,
        category: license.category,
        created_at: '',
        updated_at: ''
      }
    };
  }

  static async create(license: Omit<License, 'id' | 'created_at' | 'updated_at' | 'employee'>): Promise<License> {
    const newLicense = await this.request('/licenses', {
      method: 'POST',
      body: JSON.stringify(license),
    });
    
    return {
      ...newLicense,
      employee: {
        id: newLicense.employee_id,
        full_name: newLicense.full_name,
        rank: newLicense.rank,
        file_number: newLicense.file_number,
        category: newLicense.category,
        created_at: '',
        updated_at: ''
      }
    };
  }

  static async update(id: string, license: Partial<License>): Promise<License> {
    const updatedLicense = await this.request(`/licenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(license),
    });
    
    return {
      ...updatedLicense,
      employee: {
        id: updatedLicense.employee_id,
        full_name: updatedLicense.full_name,
        rank: updatedLicense.rank,
        file_number: updatedLicense.file_number,
        category: updatedLicense.category,
        created_at: '',
        updated_at: ''
      }
    };
  }

  static async delete(id: string): Promise<void> {
    return this.request(`/licenses/${id}`, {
      method: 'DELETE',
    });
  }

  static async getByEmployee(employeeId: string): Promise<License[]> {
    const licenses = await this.request(`/licenses/employee/${employeeId}`);
    return licenses.map((license: any) => ({
      ...license,
      employee: {
        id: license.employee_id,
        full_name: license.full_name,
        rank: license.rank,
        file_number: license.file_number,
        category: license.category,
        created_at: '',
        updated_at: ''
      }
    }));
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<License[]> {
    const allLicenses = await this.getAll();
    return allLicenses.filter(license => 
      license.license_date >= startDate && license.license_date <= endDate
    );
  }

  static async getByMonth(month: number, year: number): Promise<License[]> {
    const allLicenses = await this.getAll();
    return allLicenses.filter(license => 
      license.month === month && license.year === year
    );
  }

  static async getWithFilters(filters: FilterOptions): Promise<License[]> {
    let licenses = await this.getAll();

    if (filters.employee_id) {
      licenses = licenses.filter(license => license.employee_id === filters.employee_id);
    }

    if (filters.license_type) {
      licenses = licenses.filter(license => license.license_type === filters.license_type);
    }

    if (filters.month) {
      licenses = licenses.filter(license => license.month === filters.month);
    }

    if (filters.year) {
      licenses = licenses.filter(license => license.year === filters.year);
    }

    if (filters.date_from) {
      licenses = licenses.filter(license => license.license_date >= filters.date_from!);
    }

    if (filters.date_to) {
      licenses = licenses.filter(license => license.license_date <= filters.date_to!);
    }

    return licenses;
  }

  static async getStats(): Promise<LicenseStats> {
    return this.request('/stats');
  }

  static async checkDuplicateDate(employeeId: string, date: string, excludeId?: string): Promise<License[]> {
    const duplicates = await this.request(`/licenses/check-duplicate/${employeeId}/${date}`);
    let result = duplicates.map((license: any) => ({
      ...license,
      employee: {
        id: license.employee_id,
        full_name: license.full_name,
        rank: license.rank,
        file_number: license.file_number,
        category: license.category,
        created_at: '',
        updated_at: ''
      }
    }));

    if (excludeId) {
      result = result.filter((license: License) => license.id !== excludeId);
    }

    return result;
  }
}
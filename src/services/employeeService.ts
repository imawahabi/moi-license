import { Employee } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

// Mock data for development - Real employees from database
const mockEmployees = [
  { id: '9', full_name: 'مشاري سامي الوهيب', rank: 'رائد حقوقي', file_number: '612154', category: 'ضابط' as const, created_at: '2025-07-16 06:19:50', updated_at: '2025-07-29 06:44:44' },
  { id: '10', full_name: 'خالد طارق بن شعبان', rank: 'ملازم أول', file_number: '743542', category: 'ضابط' as const, created_at: '2025-07-16 06:20:18', updated_at: '2025-07-16 06:20:18' },
  { id: '11', full_name: 'محمد إبراهيم الحميدي', rank: 'ملازم أول حقوقي', file_number: '887981', category: 'ضابط' as const, created_at: '2025-07-16 06:20:32', updated_at: '2025-07-16 06:20:32' },
  { id: '12', full_name: 'أحمد محمد ملا علي', rank: 'ملازم أول', file_number: '458325', category: 'ضابط' as const, created_at: '2025-07-16 06:20:47', updated_at: '2025-07-16 06:20:47' },
  { id: '13', full_name: 'عمر صبحي الهندي', rank: 'و.أ.ضابط', file_number: '457515', category: 'ضابط' as const, created_at: '2025-07-16 06:21:00', updated_at: '2025-07-16 06:21:00' },
  { id: '14', full_name: 'عقاب ميسر العياف', rank: 'و.أ.ضابط', file_number: '744212', category: 'ضابط صف' as const, created_at: '2025-07-16 06:21:11', updated_at: '2025-07-16 06:21:17' },
  { id: '15', full_name: 'محمد مناحي القحطاني', rank: 'و.أ.ضابط', file_number: '237388', category: 'ضابط صف' as const, created_at: '2025-07-16 06:21:30', updated_at: '2025-07-16 06:21:30' },
  { id: '16', full_name: 'حمود ناجي الجمعه', rank: 'و.أ.ضابط', file_number: '805521', category: 'ضابط صف' as const, created_at: '2025-07-16 06:21:45', updated_at: '2025-07-16 06:21:45' },
  { id: '17', full_name: 'مساعد غصاب الفضلي', rank: 'و.أ.ضابط', file_number: '290947', category: 'ضابط صف' as const, created_at: '2025-07-16 06:22:02', updated_at: '2025-07-16 06:22:02' },
  { id: '18', full_name: 'أنور علي النجار', rank: 'و.أ.ضابط', file_number: '289531', category: 'ضابط صف' as const, created_at: '2025-07-16 06:22:17', updated_at: '2025-07-16 06:22:17' },
  { id: '34', full_name: 'عبدالمطلب محمد فوزي حجاج', rank: 'باحث قانوني', file_number: '882885', category: 'مهني' as const, created_at: '2025-07-16 06:25:40', updated_at: '2025-07-16 06:26:08' },
  { id: '35', full_name: 'أحمد يسري ابو العلا', rank: 'طباع', file_number: '637998', category: 'مهني' as const, created_at: '2025-07-16 06:25:51', updated_at: '2025-07-16 06:25:51' },
  { id: '73', full_name: 'محمد محمد قاسم أحمد', rank: 'رئيس قسم', file_number: '273112300976', category: 'مدني' as const, created_at: '2025-07-24 07:14:30', updated_at: '2025-07-24 07:17:46' },
  { id: '76', full_name: 'حميده سعيد التحو', rank: 'رئيس قسم', file_number: '283072601334', category: 'مدني' as const, created_at: '2025-07-24 07:18:18', updated_at: '2025-07-24 07:18:18' },
  { id: '80', full_name: 'عائشة صلاح محمد العميري', rank: 'سكرتيرة', file_number: '298050600105', category: 'مدني' as const, created_at: '2025-07-24 07:19:40', updated_at: '2025-07-24 07:19:40' }
];

let useMockData = false;

export class EmployeeService {
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
        const error = await response.json();
        throw new Error(error.error || 'حدث خطأ في الطلب');
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
      return [...mockEmployees];
    }

    if (endpoint.startsWith('/employees/') && method === 'GET') {
      const id = endpoint.split('/')[2];
      return mockEmployees.find(emp => emp.id === id) || null;
    }

    if (endpoint === '/employees' && method === 'POST') {
      const data = JSON.parse(options.body as string);
      const newEmployee = {
        id: 'emp-' + Date.now(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockEmployees.push(newEmployee);
      return newEmployee;
    }

    if (endpoint === '/employees/bulk' && method === 'POST') {
      const data = JSON.parse(options.body as string);
      const { employees } = data;

      const results = {
        success: [],
        errors: []
      };

      for (const empData of employees) {
        // التحقق من عدم تكرار رقم الملف
        if (mockEmployees.some(emp => emp.file_number === empData.file_number)) {
          results.errors.push({
            employee: empData,
            error: 'رقم الملف موجود مسبقاً'
          });
          continue;
        }

        const newEmployee = {
          id: 'emp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          ...empData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockEmployees.push(newEmployee);
        results.success.push(newEmployee);
      }

      return {
        message: `تم إضافة ${results.success.length} موظف بنجاح`,
        success_count: results.success.length,
        error_count: results.errors.length,
        results
      };
    }

    throw new Error('Mock endpoint not implemented: ' + endpoint);
  }

  static async getAll(): Promise<Employee[]> {
    return this.request('/employees');
  }

  static async getById(id: string): Promise<Employee | null> {
    return this.request(`/employees/${id}`);
  }

  static async create(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  static async createBulk(employees: Omit<Employee, 'id' | 'created_at' | 'updated_at'>[]): Promise<any> {
    return this.request('/employees/bulk', {
      method: 'POST',
      body: JSON.stringify({ employees }),
    });
  }

  static async update(id: string, employee: Partial<Employee>): Promise<Employee> {
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
  }

  static async delete(id: string): Promise<void> {
    return this.request(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  static async search(query: string): Promise<Employee[]> {
    const employees = await this.getAll();
    return employees.filter(emp =>
      emp.full_name.toLowerCase().includes(query.toLowerCase()) ||
      emp.rank.toLowerCase().includes(query.toLowerCase()) ||
      emp.file_number.includes(query)
    );
  }

  static async getByCategory(category: string): Promise<Employee[]> {
    const employees = await this.getAll();
    return employees.filter(emp => emp.category === category);
  }
}
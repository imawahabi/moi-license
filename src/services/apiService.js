// خدمة API للتواصل مع الخادم المحلي
const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  // دالة مساعدة للطلبات
  static async request(endpoint, options = {}) {
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
      throw error;
    }
  }

  // خدمات الموظفين
  static async getEmployees() {
    return this.request('/employees');
  }

  static async getEmployee(id) {
    return this.request(`/employees/${id}`);
  }

  static async createEmployee(employee) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  static async updateEmployee(id, employee) {
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
  }

  static async deleteEmployee(id) {
    return this.request(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // خدمات الرخص
  static async getLicenses() {
    return this.request('/licenses');
  }

  static async getEmployeeLicenses(employeeId) {
    return this.request(`/licenses/employee/${employeeId}`);
  }

  static async createLicense(license) {
    return this.request('/licenses', {
      method: 'POST',
      body: JSON.stringify(license),
    });
  }

  static async updateLicense(id, license) {
    return this.request(`/licenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(license),
    });
  }

  static async deleteLicense(id) {
    return this.request(`/licenses/${id}`, {
      method: 'DELETE',
    });
  }

  static async checkDuplicateLicense(employeeId, date) {
    return this.request(`/licenses/check-duplicate/${employeeId}/${date}`);
  }

  // الإحصائيات
  static async getStats() {
    return this.request('/stats');
  }
}

export default ApiService;
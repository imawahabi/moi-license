export interface Employee {
  id: string;
  full_name: string;
  rank: string;
  file_number: string;
  category: 'ضابط' | 'ضابط صف' | 'مهني' | 'مدني';
  created_at: string;
  updated_at: string;
}

export interface License {
  id: string;
  employee_id: string;
  employee?: Employee;
  license_type: 'يوم كامل' | 'نصف يوم';
  license_date: string;
  hours?: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface LicenseStats {
  total_licenses: number;
  full_day_licenses: number;
  hours_licenses: number;
  total_hours: number;
  most_active_month: string;
  most_active_employee: string;
}

export interface FilterOptions {
  employee_id?: string;
  employee_name?: string;
  rank?: string;
  category?: string;
  categories?: string[];
  license_type?: string;
  month?: number;
  months?: number[];
  year?: number;
  date_from?: string;
  date_to?: string;
}

export interface EmployeeLicenseStats {
  employee: Employee;
  total: number;
  fullDay: number;
  halfDay: number;
  totalHours: number;
  month: string;
  year: number;
}
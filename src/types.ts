export interface Employee {
  id: number;
  full_name: string;
  category: 'ضابط' | 'ضابط صف' | 'مدني' | 'مهني';
  rank: string;
  file_number: string;
}

export interface License {
  id: number;
  employee_id: number;
  employee?: Employee;
  license_type: 'يوم كامل' | 'نصف يوم';
  license_date: string;
  reason: string;
  approved: boolean;
  hours?: number;
  month: number;
  year: number;
}

export interface FilterOptions {
  year?: string;
  month?: string;
  category?: string;
  rank?: string;
  license_type?: string;
  search?: string;
  status?: string;
  employee_id?: number;
}

-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS kuwait_police_licenses CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE kuwait_police_licenses;

-- جدول الموظفين
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(255) NOT NULL,
  rank VARCHAR(100) NOT NULL,
  file_number VARCHAR(50) UNIQUE NOT NULL,
  category ENUM('ضابط', 'ضابط صف', 'مهني', 'مدني') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_full_name (full_name),
  INDEX idx_file_number (file_number),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول الرخص
CREATE TABLE IF NOT EXISTS licenses (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id VARCHAR(36) NOT NULL,
  license_type ENUM('يوم كامل', 'نصف يوم') NOT NULL,
  license_date DATE NOT NULL,
  hours INT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_id (employee_id),
  INDEX idx_license_date (license_date),
  INDEX idx_month_year (month, year),
  INDEX idx_license_type (license_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إدراج بيانات تجريبية للموظفين
INSERT IGNORE INTO employees (id, full_name, rank, file_number, category) VALUES
('emp-001', 'أحمد محمد الكندري', 'رائد', '12345', 'ضابط'),
('emp-002', 'فاطمة علي العتيبي', 'نقيب', '12346', 'ضابط'),
('emp-003', 'محمد سالم المطيري', 'رقيب أول', '12347', 'ضابط صف'),
('emp-004', 'نورا خالد الرشيد', 'عريف', '12348', 'ضابط صف'),
('emp-005', 'عبدالله يوسف الصباح', 'فني أول', '12349', 'مهني');

-- إدراج بيانات تجريبية للرخص
INSERT IGNORE INTO licenses (id, employee_id, license_type, license_date, hours, month, year) VALUES
('lic-001', 'emp-001', 'يوم كامل', '2024-01-15', NULL, 1, 2024),
('lic-002', 'emp-002', 'نصف يوم', '2024-01-20', 4, 1, 2024),
('lic-003', 'emp-003', 'يوم كامل', '2024-02-10', NULL, 2, 2024);

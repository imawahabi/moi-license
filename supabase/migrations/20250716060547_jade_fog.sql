-- قاعدة بيانات نظام رخص إدارة السجل العام
-- وزارة الداخلية الكويتية
-- تاريخ الإنشاء: 2024

-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS kuwait_police_licenses 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE kuwait_police_licenses;

-- جدول الموظفين
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL COMMENT 'الاسم الكامل',
    rank VARCHAR(100) NOT NULL COMMENT 'الرتبة',
    file_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'رقم الملف',
    category ENUM('ضابط', 'ضابط صف', 'مهني', 'مدني') NOT NULL COMMENT 'الفئة',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_full_name (full_name),
    INDEX idx_rank (rank),
    INDEX idx_file_number (file_number),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول الرخص
CREATE TABLE licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    license_type ENUM('يوم كامل', 'ساعات محددة') NOT NULL COMMENT 'نوع الرخصة',
    license_date DATE NOT NULL COMMENT 'تاريخ الرخصة',
    hours INT NULL COMMENT 'عدد الساعات (للرخص المحددة بالساعات)',
    month INT NOT NULL COMMENT 'الشهر (محسوب تلقائياً)',
    year INT NOT NULL COMMENT 'السنة (محسوب تلقائياً)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    
    INDEX idx_employee_id (employee_id),
    INDEX idx_license_date (license_date),
    INDEX idx_license_type (license_type),
    INDEX idx_month_year (month, year),
    
    -- قيود للتأكد من صحة البيانات
    CONSTRAINT chk_hours CHECK (
        (license_type = 'يوم كامل' AND hours IS NULL) OR 
        (license_type = 'ساعات محددة' AND hours > 0 AND hours <= 24)
    ),
    CONSTRAINT chk_month CHECK (month >= 1 AND month <= 12),
    CONSTRAINT chk_year CHECK (year >= 2020 AND year <= 2050)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إدراج بيانات تجريبية للموظفين
INSERT INTO employees (full_name, rank, file_number, category) VALUES
('أحمد محمد الكندري', 'رائد', 'K001', 'ضابط'),
('فاطمة علي الصباح', 'نقيب', 'K002', 'ضابط'),
('محمد سالم العتيبي', 'ملازم أول', 'K003', 'ضابط'),
('نورا خالد الرشيد', 'رقيب أول', 'K004', 'ضابط صف'),
('عبدالله يوسف المطيري', 'رقيب', 'K005', 'ضابط صف'),
('سارة أحمد الأنصاري', 'عريف', 'K006', 'ضابط صف'),
('خالد عبدالرحمن الدوسري', 'فني أول', 'K007', 'مهني'),
('مريم سعد الهاجري', 'كاتب', 'K008', 'مدني');

-- إدراج بيانات تجريبية للرخص
INSERT INTO licenses (employee_id, license_type, license_date, hours, month, year) VALUES
-- رخص أحمد الكندري
(1, 'يوم كامل', '2024-01-15', NULL, 1, 2024),
(1, 'ساعات محددة', '2024-02-10', 4, 2, 2024),
(1, 'يوم كامل', '2024-03-05', NULL, 3, 2024),

-- رخص فاطمة الصباح
(2, 'يوم كامل', '2024-01-20', NULL, 1, 2024),
(2, 'يوم كامل', '2024-02-15', NULL, 2, 2024),
(2, 'ساعات محددة', '2024-03-10', 6, 3, 2024),

-- رخص محمد العتيبي
(3, 'ساعات محددة', '2024-01-25', 3, 1, 2024),
(3, 'يوم كامل', '2024-02-20', NULL, 2, 2024),
(3, 'ساعات محددة', '2024-03-15', 5, 3, 2024),

-- رخص نورا الرشيد
(4, 'يوم كامل', '2024-01-30', NULL, 1, 2024),
(4, 'ساعات محددة', '2024-02-25', 2, 2, 2024),
(4, 'يوم كامل', '2024-03-20', NULL, 3, 2024),

-- رخص عبدالله المطيري
(5, 'ساعات محددة', '2024-01-12', 4, 1, 2024),
(5, 'يوم كامل', '2024-02-18', NULL, 2, 2024),
(5, 'ساعات محددة', '2024-03-25', 3, 3, 2024),

-- رخص سارة الأنصاري
(6, 'يوم كامل', '2024-01-18', NULL, 1, 2024),
(6, 'ساعات محددة', '2024-02-22', 5, 2, 2024),
(6, 'يوم كامل', '2024-03-28', NULL, 3, 2024),

-- رخص خالد الدوسري
(7, 'ساعات محددة', '2024-01-22', 6, 1, 2024),
(7, 'يوم كامل', '2024-02-28', NULL, 2, 2024),
(7, 'ساعات محددة', '2024-03-12', 4, 3, 2024),

-- رخص مريم الهاجري
(8, 'يوم كامل', '2024-01-28', NULL, 1, 2024),
(8, 'ساعات محددة', '2024-02-12', 3, 2, 2024),
(8, 'يوم كامل', '2024-03-18', NULL, 3, 2024);

-- إنشاء Views مفيدة للتقارير
CREATE VIEW licenses_with_employee_details AS
SELECT 
    l.id,
    l.employee_id,
    e.full_name,
    e.rank,
    e.file_number,
    e.category,
    l.license_type,
    l.license_date,
    l.hours,
    l.month,
    l.year,
    l.created_at,
    l.updated_at
FROM licenses l
JOIN employees e ON l.employee_id = e.id
ORDER BY l.license_date DESC;

-- View للإحصائيات الشهرية
CREATE VIEW monthly_license_stats AS
SELECT 
    year,
    month,
    COUNT(*) as total_licenses,
    SUM(CASE WHEN license_type = 'يوم كامل' THEN 1 ELSE 0 END) as full_day_licenses,
    SUM(CASE WHEN license_type = 'ساعات محددة' THEN 1 ELSE 0 END) as hours_licenses,
    SUM(COALESCE(hours, 0)) as total_hours
FROM licenses
GROUP BY year, month
ORDER BY year DESC, month DESC;

-- View لملخص رخص الموظفين
CREATE VIEW employee_license_summary AS
SELECT 
    e.id,
    e.full_name,
    e.rank,
    e.file_number,
    e.category,
    COUNT(l.id) as total_licenses,
    SUM(CASE WHEN l.license_type = 'يوم كامل' THEN 1 ELSE 0 END) as full_day_licenses,
    SUM(CASE WHEN l.license_type = 'ساعات محددة' THEN 1 ELSE 0 END) as hours_licenses,
    SUM(COALESCE(l.hours, 0)) as total_hours
FROM employees e
LEFT JOIN licenses l ON e.id = l.employee_id
GROUP BY e.id, e.full_name, e.rank, e.file_number, e.category
ORDER BY e.full_name;

-- إنشاء مستخدم للتطبيق (اختياري)
-- CREATE USER 'kuwait_app'@'localhost' IDENTIFIED BY 'secure_password_123';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON kuwait_police_licenses.* TO 'kuwait_app'@'localhost';
-- FLUSH PRIVILEGES;

-- عرض معلومات قاعدة البيانات
SELECT 'تم إنشاء قاعدة البيانات بنجاح!' as status;
SELECT COUNT(*) as total_employees FROM employees;
SELECT COUNT(*) as total_licenses FROM licenses;
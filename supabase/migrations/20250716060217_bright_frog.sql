/*
  # إنشاء Views والدوال المساعدة

  1. Views
    - `licenses_with_employee_details` - عرض الرخص مع تفاصيل الموظفين
    - `monthly_license_stats` - إحصائيات الرخص الشهرية
    - `employee_license_summary` - ملخص رخص كل موظف

  2. الدوال
    - `get_license_stats()` - دالة لحساب الإحصائيات العامة
    - `get_monthly_report()` - دالة لتقرير شهري
    - `search_employees()` - دالة البحث في الموظفين

  3. الأمان
    - تطبيق نفس سياسات الأمان على Views
*/

-- إنشاء view للرخص مع تفاصيل الموظفين
CREATE OR REPLACE VIEW licenses_with_employee_details AS
SELECT 
  l.id,
  l.employee_id,
  l.license_type,
  l.license_date,
  l.hours,
  l.month,
  l.year,
  l.created_at,
  l.updated_at,
  e.full_name,
  e.rank,
  e.file_number,
  e.category
FROM licenses l
JOIN employees e ON l.employee_id = e.id;

-- إنشاء view للإحصائيات الشهرية
CREATE OR REPLACE VIEW monthly_license_stats AS
SELECT 
  year,
  month,
  COUNT(*) as total_licenses,
  COUNT(CASE WHEN license_type = 'يوم كامل' THEN 1 END) as full_day_licenses,
  COUNT(CASE WHEN license_type = 'ساعات محددة' THEN 1 END) as hourly_licenses,
  COALESCE(SUM(hours), 0) as total_hours,
  COUNT(DISTINCT employee_id) as unique_employees
FROM licenses
GROUP BY year, month
ORDER BY year DESC, month DESC;

-- إنشاء view لملخص رخص الموظفين
CREATE OR REPLACE VIEW employee_license_summary AS
SELECT 
  e.id,
  e.full_name,
  e.rank,
  e.file_number,
  e.category,
  COUNT(l.id) as total_licenses,
  COUNT(CASE WHEN l.license_type = 'يوم كامل' THEN 1 END) as full_day_licenses,
  COUNT(CASE WHEN l.license_type = 'ساعات محددة' THEN 1 END) as hourly_licenses,
  COALESCE(SUM(l.hours), 0) as total_hours,
  MAX(l.license_date) as last_license_date
FROM employees e
LEFT JOIN licenses l ON e.id = l.employee_id
GROUP BY e.id, e.full_name, e.rank, e.file_number, e.category
ORDER BY e.full_name;

-- دالة لحساب الإحصائيات العامة
CREATE OR REPLACE FUNCTION get_license_stats()
RETURNS TABLE (
  total_licenses bigint,
  full_day_licenses bigint,
  hourly_licenses bigint,
  total_hours numeric,
  total_employees bigint,
  most_active_month text,
  most_active_employee text
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total_lic,
      COUNT(CASE WHEN license_type = 'يوم كامل' THEN 1 END) as full_day_lic,
      COUNT(CASE WHEN license_type = 'ساعات محددة' THEN 1 END) as hourly_lic,
      COALESCE(SUM(hours), 0) as total_hrs
    FROM licenses
  ),
  employee_count AS (
    SELECT COUNT(*) as emp_count FROM employees
  ),
  most_active_month_calc AS (
    SELECT 
      month || '/' || year as month_year,
      COUNT(*) as license_count
    FROM licenses
    GROUP BY month, year
    ORDER BY license_count DESC
    LIMIT 1
  ),
  most_active_employee_calc AS (
    SELECT 
      e.full_name,
      COUNT(l.id) as license_count
    FROM employees e
    LEFT JOIN licenses l ON e.id = l.employee_id
    GROUP BY e.id, e.full_name
    ORDER BY license_count DESC
    LIMIT 1
  )
  SELECT 
    s.total_lic,
    s.full_day_lic,
    s.hourly_lic,
    s.total_hrs,
    ec.emp_count,
    COALESCE(mam.month_year, ''),
    COALESCE(mae.full_name, '')
  FROM stats s
  CROSS JOIN employee_count ec
  LEFT JOIN most_active_month_calc mam ON true
  LEFT JOIN most_active_employee_calc mae ON true;
END;
$$ LANGUAGE plpgsql;

-- دالة للبحث في الموظفين
CREATE OR REPLACE FUNCTION search_employees(search_term text)
RETURNS TABLE (
  id uuid,
  full_name text,
  rank text,
  file_number text,
  category text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.full_name,
    e.rank,
    e.file_number,
    e.category,
    e.created_at,
    e.updated_at
  FROM employees e
  WHERE 
    e.full_name ILIKE '%' || search_term || '%' OR
    e.rank ILIKE '%' || search_term || '%' OR
    e.file_number ILIKE '%' || search_term || '%'
  ORDER BY e.full_name;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على تقرير شهري
CREATE OR REPLACE FUNCTION get_monthly_report(report_month integer, report_year integer)
RETURNS TABLE (
  employee_name text,
  employee_rank text,
  file_number text,
  category text,
  license_type text,
  license_date date,
  hours integer,
  total_employee_licenses bigint,
  total_employee_hours numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.full_name,
    e.rank,
    e.file_number,
    e.category,
    l.license_type,
    l.license_date,
    l.hours,
    COUNT(l2.id) OVER (PARTITION BY e.id) as total_employee_licenses,
    COALESCE(SUM(l2.hours) OVER (PARTITION BY e.id), 0) as total_employee_hours
  FROM licenses l
  JOIN employees e ON l.employee_id = e.id
  LEFT JOIN licenses l2 ON l2.employee_id = e.id AND l2.month = report_month AND l2.year = report_year
  WHERE l.month = report_month AND l.year = report_year
  ORDER BY e.full_name, l.license_date;
END;
$$ LANGUAGE plpgsql;

-- إنشاء فهرس للبحث النصي المتقدم
CREATE INDEX IF NOT EXISTS idx_employees_search 
ON employees 
USING gin(to_tsvector('arabic', full_name || ' ' || rank || ' ' || file_number));

-- إضافة تعليقات على الجداول والأعمدة
COMMENT ON TABLE employees IS 'جدول الموظفين في الإدارة العامة لمكتب وكيل الوزارة';
COMMENT ON COLUMN employees.full_name IS 'الاسم الكامل للموظف';
COMMENT ON COLUMN employees.rank IS 'الرتبة الوظيفية';
COMMENT ON COLUMN employees.file_number IS 'رقم الملف أو الرقم المدني';
COMMENT ON COLUMN employees.category IS 'فئة الموظف: ضابط، ضابط صف، مهني، مدني';

COMMENT ON TABLE licenses IS 'جدول رخص الموظفين';
COMMENT ON COLUMN licenses.license_type IS 'نوع الرخصة: يوم كامل أو ساعات محددة';
COMMENT ON COLUMN licenses.license_date IS 'تاريخ الرخصة';
COMMENT ON COLUMN licenses.hours IS 'عدد الساعات (للرخص بالساعات فقط)';
COMMENT ON COLUMN licenses.month IS 'الشهر (محسوب تلقائياً من التاريخ)';
COMMENT ON COLUMN licenses.year IS 'السنة (محسوب تلقائياً من التاريخ)';
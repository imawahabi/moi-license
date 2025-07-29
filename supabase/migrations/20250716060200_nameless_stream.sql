/*
  # إنشاء جدول الرخص

  1. الجداول الجديدة
    - `licenses`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `license_type` (text, نوع الرخصة: يوم كامل / ساعات محددة)
      - `license_date` (date, تاريخ الرخصة)
      - `hours` (integer, عدد الساعات - اختياري)
      - `month` (integer, الشهر - محسوب تلقائياً)
      - `year` (integer, السنة - محسوب تلقائياً)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على جدول `licenses`
    - إضافة سياسة للقراءة والكتابة للجميع (نظام داخلي)

  3. القيود والفهارس
    - قيد foreign key مع employees
    - فهارس للبحث والفلترة السريعة
    - قيود على البيانات
*/

-- إنشاء جدول الرخص
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  license_type text NOT NULL CHECK (license_type IN ('يوم كامل', 'ساعات محددة')),
  license_date date NOT NULL,
  hours integer CHECK (hours > 0 AND hours <= 24),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2050),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل Row Level Security
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الأمان (نظام داخلي - الوصول للجميع)
CREATE POLICY "Allow all operations on licenses"
  ON licenses
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_licenses_employee_id ON licenses (employee_id);
CREATE INDEX IF NOT EXISTS idx_licenses_date ON licenses (license_date);
CREATE INDEX IF NOT EXISTS idx_licenses_month_year ON licenses (month, year);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON licenses (license_type);
CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON licenses (created_at);

-- إضافة trigger لتحديث updated_at تلقائياً
CREATE TRIGGER update_licenses_updated_at 
    BEFORE UPDATE ON licenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- إضافة trigger لحساب الشهر والسنة تلقائياً من التاريخ
CREATE OR REPLACE FUNCTION calculate_month_year()
RETURNS TRIGGER AS $$
BEGIN
    NEW.month = EXTRACT(MONTH FROM NEW.license_date);
    NEW.year = EXTRACT(YEAR FROM NEW.license_date);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_licenses_month_year
    BEFORE INSERT OR UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_month_year();

-- إضافة قيد للتأكد من وجود الساعات عند اختيار "ساعات محددة"
ALTER TABLE licenses ADD CONSTRAINT check_hours_for_hourly_license 
CHECK (
  (license_type = 'يوم كامل' AND hours IS NULL) OR 
  (license_type = 'ساعات محددة' AND hours IS NOT NULL)
);

-- إدراج بيانات تجريبية للرخص
INSERT INTO licenses (employee_id, license_type, license_date, hours) 
SELECT 
  e.id,
  CASE 
    WHEN random() > 0.6 THEN 'يوم كامل'
    ELSE 'ساعات محددة'
  END as license_type,
  CURRENT_DATE - (random() * 90)::integer as license_date,
  CASE 
    WHEN random() > 0.6 THEN NULL
    ELSE (2 + random() * 6)::integer
  END as hours
FROM employees e
CROSS JOIN generate_series(1, 3) -- 3 رخص لكل موظف
ON CONFLICT DO NOTHING;
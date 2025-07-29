/*
  # إنشاء جدول الموظفين

  1. الجداول الجديدة
    - `employees`
      - `id` (uuid, primary key)
      - `full_name` (text, الاسم الكامل)
      - `rank` (text, الرتبة)
      - `file_number` (text, رقم الملف)
      - `category` (text, الفئة: ضابط، ضابط صف، مهني، مدني)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على جدول `employees`
    - إضافة سياسة للقراءة والكتابة للجميع (نظام داخلي)

  3. الفهارس
    - فهرس على `full_name` للبحث السريع
    - فهرس على `file_number` للبحث بالرقم
    - فهرس على `category` للفلترة
*/

-- إنشاء جدول الموظفين
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  rank text NOT NULL,
  file_number text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('ضابط', 'ضابط صف', 'مهني', 'مدني')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الأمان (نظام داخلي - الوصول للجميع)
CREATE POLICY "Allow all operations on employees"
  ON employees
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON employees USING gin(to_tsvector('arabic', full_name));
CREATE INDEX IF NOT EXISTS idx_employees_file_number ON employees (file_number);
CREATE INDEX IF NOT EXISTS idx_employees_category ON employees (category);
CREATE INDEX IF NOT EXISTS idx_employees_rank ON employees (rank);

-- إضافة trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- إدراج بيانات تجريبية للموظفين
INSERT INTO employees (full_name, rank, file_number, category) VALUES
('أحمد محمد الكندري', 'رائد', '12345', 'ضابط'),
('فاطمة علي الرشيد', 'نقيب', '12346', 'ضابط'),
('محمد سالم العتيبي', 'رقيب أول', '12347', 'ضابط صف'),
('نورا خالد المطيري', 'رقيب', '12348', 'ضابط صف'),
('عبدالله يوسف الصباح', 'فني أول', '12349', 'مهني'),
('مريم أحمد الأنصاري', 'فني', '12350', 'مهني'),
('سعد عبدالرحمن الدوسري', 'كاتب', '12351', 'مدني'),
('هند محمد العجمي', 'محاسب', '12352', 'مدني')
ON CONFLICT (file_number) DO NOTHING;
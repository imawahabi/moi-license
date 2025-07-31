const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// إعدادات قاعدة البيانات
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // كلمة مرور XAMPP (عادة فارغة)
  database: 'kuwait_police_licenses',
  port: 3306,
  charset: 'utf8mb4'
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// إنشاء اتصال قاعدة البيانات
let db;
async function connectDB() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('✅ تم الاتصال بقاعدة البيانات MySQL بنجاح');

    // اختبار الاتصال
    await db.execute('SELECT 1');
    console.log('✅ تم اختبار الاتصال بقاعدة البيانات بنجاح');

  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error);
    console.error('تأكد من تشغيل XAMPP وإنشاء قاعدة البيانات kuwait_police_licenses');
    process.exit(1);
  }
}

// API Routes

// 📋 الموظفين
// جلب جميع الموظفين
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM employees ORDER BY full_name');
    res.json(rows);
  } catch (error) {
    console.error('خطأ في جلب الموظفين:', error);
    res.status(500).json({ error: 'فشل في جلب الموظفين' });
  }
});

// جلب موظف واحد
app.get('/api/employees/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('خطأ في جلب الموظف:', error);
    res.status(500).json({ error: 'فشل في جلب الموظف' });
  }
});

// إضافة موظف جديد
app.post('/api/employees', async (req, res) => {
  const { full_name, rank, file_number, category } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO employees (full_name, rank, file_number, category) VALUES (?, ?, ?, ?)',
      [full_name, rank, file_number, category]
    );
    
    const [newEmployee] = await db.execute('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    res.status(201).json(newEmployee[0]);
  } catch (error) {
    console.error('خطأ في إضافة الموظف:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'رقم الملف موجود مسبقاً' });
    } else {
      res.status(500).json({ error: 'فشل في إضافة الموظف' });
    }
  }
});

// تحديث موظف
app.put('/api/employees/:id', async (req, res) => {
  const { full_name, rank, file_number, category } = req.body;
  try {
    await db.execute(
      'UPDATE employees SET full_name = ?, rank = ?, file_number = ?, category = ? WHERE id = ?',
      [full_name, rank, file_number, category, req.params.id]
    );
    
    const [updatedEmployee] = await db.execute('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    res.json(updatedEmployee[0]);
  } catch (error) {
    console.error('خطأ في تحديث الموظف:', error);
    res.status(500).json({ error: 'فشل في تحديث الموظف' });
  }
});

// حذف موظف
app.delete('/api/employees/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف الموظف:', error);
    res.status(500).json({ error: 'فشل في حذف الموظف' });
  }
});

// 📄 الرخص
// جلب جميع الرخص مع بيانات الموظفين
app.get('/api/licenses', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT l.*, e.full_name, e.rank, e.file_number, e.category
      FROM licenses l
      JOIN employees e ON l.employee_id = e.id
      ORDER BY l.created_at DESC, l.license_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('خطأ في جلب الرخص:', error);
    res.status(500).json({ error: 'فشل في جلب الرخص' });
  }
});

// جلب رخص موظف معين
app.get('/api/licenses/employee/:employeeId', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT l.*, e.full_name, e.rank, e.file_number, e.category
      FROM licenses l
      JOIN employees e ON l.employee_id = e.id
      WHERE l.employee_id = ?
      ORDER BY l.created_at DESC, l.license_date DESC
    `, [req.params.employeeId]);
    res.json(rows);
  } catch (error) {
    console.error('خطأ في جلب رخص الموظف:', error);
    res.status(500).json({ error: 'فشل في جلب رخص الموظف' });
  }
});

// إضافة رخصة جديدة
app.post('/api/licenses', async (req, res) => {
  const { employee_id, license_type, license_date, hours } = req.body;

  // التحقق من البيانات المطلوبة
  if (!employee_id || !license_type || !license_date) {
    return res.status(400).json({ error: 'البيانات المطلوبة مفقودة' });
  }

  // التحقق من صحة نوع الرخصة
  if (!['يوم كامل', 'نصف يوم'].includes(license_type)) {
    return res.status(400).json({ error: 'نوع الرخصة غير صحيح' });
  }

  // التحقق من وجود الموظف
  try {
    const [employeeCheck] = await db.execute('SELECT id FROM employees WHERE id = ?', [employee_id]);
    if (employeeCheck.length === 0) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
  } catch (error) {
    console.error('خطأ في التحقق من الموظف:', error);
    return res.status(500).json({ error: 'خطأ في التحقق من الموظف' });
  }

  // حساب الشهر والسنة من التاريخ
  const date = new Date(license_date);
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: 'تاريخ غير صحيح' });
  }

  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  try {
    const [result] = await db.execute(
      'INSERT INTO licenses (employee_id, license_type, license_date, hours, month, year) VALUES (?, ?, ?, ?, ?, ?)',
      [employee_id, license_type, license_date, hours || null, month, year]
    );

    const [newLicense] = await db.execute(`
      SELECT l.*, e.full_name, e.rank, e.file_number, e.category
      FROM licenses l
      JOIN employees e ON l.employee_id = e.id
      WHERE l.id = ?
    `, [result.insertId]);

    res.status(201).json(newLicense[0]);
  } catch (error) {
    console.error('خطأ في إضافة الرخصة:', error);
    res.status(500).json({ error: 'فشل في إضافة الرخصة: ' + error.message });
  }
});

// تحديث رخصة
app.put('/api/licenses/:id', async (req, res) => {
  const { employee_id, license_type, license_date, hours } = req.body;
  
  const date = new Date(license_date);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  try {
    await db.execute(
      'UPDATE licenses SET employee_id = ?, license_type = ?, license_date = ?, hours = ?, month = ?, year = ? WHERE id = ?',
      [employee_id, license_type, license_date, hours, month, year, req.params.id]
    );
    
    const [updatedLicense] = await db.execute(`
      SELECT l.*, e.full_name, e.rank, e.file_number, e.category 
      FROM licenses l 
      JOIN employees e ON l.employee_id = e.id 
      WHERE l.id = ?
    `, [req.params.id]);
    
    res.json(updatedLicense[0]);
  } catch (error) {
    console.error('خطأ في تحديث الرخصة:', error);
    res.status(500).json({ error: 'فشل في تحديث الرخصة' });
  }
});

// حذف رخصة
app.delete('/api/licenses/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM licenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'تم حذف الرخصة بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف الرخصة:', error);
    res.status(500).json({ error: 'فشل في حذف الرخصة' });
  }
});

// التحقق من الرخص المتكررة
app.get('/api/licenses/check-duplicate/:employeeId/:date', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT l.*, e.full_name 
      FROM licenses l 
      JOIN employees e ON l.employee_id = e.id 
      WHERE l.employee_id = ? AND l.license_date = ?
    `, [req.params.employeeId, req.params.date]);
    res.json(rows);
  } catch (error) {
    console.error('خطأ في التحقق من التكرار:', error);
    res.status(500).json({ error: 'فشل في التحقق من التكرار' });
  }
});

// 📊 الإحصائيات
app.get('/api/stats', async (req, res) => {
  try {
    // إجمالي الرخص
    const [totalLicenses] = await db.execute('SELECT COUNT(*) as count FROM licenses');
    
    // رخص اليوم الكامل
    const [fullDayLicenses] = await db.execute("SELECT COUNT(*) as count FROM licenses WHERE license_type = 'يوم كامل'");
    
    // رخص الساعات
    const [hoursLicenses] = await db.execute("SELECT COUNT(*) as count FROM licenses WHERE license_type = 'ساعات محددة'");
    
    // إجمالي الساعات
    const [totalHours] = await db.execute('SELECT SUM(COALESCE(hours, 0)) as total FROM licenses');
    
    // الشهر الأكثر نشاطاً
    const [mostActiveMonth] = await db.execute(`
      SELECT CONCAT(month, '/', year) as month_year, COUNT(*) as count 
      FROM licenses 
      GROUP BY year, month 
      ORDER BY count DESC 
      LIMIT 1
    `);
    
    // الموظف الأكثر نشاطاً
    const [mostActiveEmployee] = await db.execute(`
      SELECT e.full_name, COUNT(l.id) as count 
      FROM employees e 
      LEFT JOIN licenses l ON e.id = l.employee_id 
      GROUP BY e.id, e.full_name 
      ORDER BY count DESC 
      LIMIT 1
    `);
    
    res.json({
      total_licenses: totalLicenses[0].count,
      full_day_licenses: fullDayLicenses[0].count,
      hours_licenses: hoursLicenses[0].count,
      total_hours: totalHours[0].total || 0,
      most_active_month: mostActiveMonth[0]?.month_year || '',
      most_active_employee: mostActiveEmployee[0]?.full_name || ''
    });
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
    res.status(500).json({ error: 'فشل في جلب الإحصائيات' });
  }
});

// تشغيل الخادم

// Route يمسك جميع الطلبات غير المعرفة ويعيد index.html (دعم SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 الرابط: http://localhost:${PORT}`);
  });
});
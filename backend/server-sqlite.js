const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// إنشاء اتصال قاعدة البيانات SQLite
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// إنشاء الجداول
db.serialize(() => {
  // جدول الموظفين
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    rank TEXT NOT NULL,
    file_number TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('ضابط', 'ضابط صف', 'مهني', 'مدني')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // جدول الرخص
  db.run(`CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    license_type TEXT NOT NULL CHECK (license_type IN ('يوم كامل', 'نصف يوم')),
    license_date DATE NOT NULL,
    hours INTEGER,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  )`);

  // إدراج بيانات تجريبية
  const employees = [
    ['emp-001', 'أحمد محمد الكندري', 'رائد', '12345', 'ضابط'],
    ['emp-002', 'فاطمة علي العتيبي', 'نقيب', '12346', 'ضابط'],
    ['emp-003', 'محمد سالم المطيري', 'رقيب أول', '12347', 'ضابط صف'],
    ['emp-004', 'نورا خالد الرشيد', 'عريف', '12348', 'ضابط صف'],
    ['emp-005', 'عبدالله يوسف الصباح', 'فني أول', '12349', 'مهني']
  ];

  employees.forEach(emp => {
    db.run(`INSERT OR IGNORE INTO employees (id, full_name, rank, file_number, category) 
            VALUES (?, ?, ?, ?, ?)`, emp);
  });

  console.log('✅ تم إعداد قاعدة البيانات SQLite بنجاح');
});

// دالة مساعدة لتحويل callback إلى Promise
const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// دالة لتوليد UUID بسيط
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// API Routes

// 📋 الموظفين
// جلب جميع الموظفين
app.get('/api/employees', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM employees ORDER BY full_name');
    res.json(rows);
  } catch (error) {
    console.error('خطأ في جلب الموظفين:', error);
    res.status(500).json({ error: 'فشل في جلب الموظفين' });
  }
});

// إضافة موظف جديد
app.post('/api/employees', async (req, res) => {
  const { full_name, rank, file_number, category } = req.body;
  
  if (!full_name || !rank || !file_number || !category) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  
  try {
    const id = generateUUID();
    await dbRun(
      'INSERT INTO employees (id, full_name, rank, file_number, category) VALUES (?, ?, ?, ?, ?)',
      [id, full_name, rank, file_number, category]
    );
    
    const newEmployee = await dbGet('SELECT * FROM employees WHERE id = ?', [id]);
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error('خطأ في إضافة الموظف:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
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
    await dbRun(
      'UPDATE employees SET full_name = ?, rank = ?, file_number = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [full_name, rank, file_number, category, req.params.id]
    );
    
    const updatedEmployee = await dbGet('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    res.json(updatedEmployee);
  } catch (error) {
    console.error('خطأ في تحديث الموظف:', error);
    res.status(500).json({ error: 'فشل في تحديث الموظف' });
  }
});

// حذف موظف
app.delete('/api/employees/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM employees WHERE id = ?', [req.params.id]);
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
    const rows = await dbAll(`
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
    const rows = await dbAll(`
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
    const employee = await dbGet('SELECT id FROM employees WHERE id = ?', [employee_id]);
    if (!employee) {
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
    const id = generateUUID();
    await dbRun(
      'INSERT INTO licenses (id, employee_id, license_type, license_date, hours, month, year) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, employee_id, license_type, license_date, hours || null, month, year]
    );
    
    const newLicense = await dbGet(`
      SELECT l.*, e.full_name, e.rank, e.file_number, e.category 
      FROM licenses l 
      JOIN employees e ON l.employee_id = e.id 
      WHERE l.id = ?
    `, [id]);
    
    res.status(201).json(newLicense);
  } catch (error) {
    console.error('خطأ في إضافة الرخصة:', error);
    res.status(500).json({ error: 'فشل في إضافة الرخصة: ' + error.message });
  }
});

// Route يمسك جميع الطلبات غير المعرفة ويعيد index.html (دعم SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 الرابط: http://localhost:${PORT}`);
  console.log('📁 قاعدة البيانات: SQLite');
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// مسار ملف قاعدة البيانات JSON
const dbPath = path.join(__dirname, 'database.json');

// دالة لتوليد UUID بسيط
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// دالة لقراءة قاعدة البيانات
async function readDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // إذا لم يكن الملف موجوداً، أنشئ قاعدة بيانات افتراضية
    const defaultDB = {
      employees: [
        {
          id: 'emp-001',
          full_name: 'أحمد محمد الكندري',
          rank: 'رائد',
          file_number: '12345',
          category: 'ضابط',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'emp-002',
          full_name: 'فاطمة علي العتيبي',
          rank: 'نقيب',
          file_number: '12346',
          category: 'ضابط',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'emp-003',
          full_name: 'محمد سالم المطيري',
          rank: 'رقيب أول',
          file_number: '12347',
          category: 'ضابط صف',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      licenses: [
        {
          id: 'lic-001',
          employee_id: 'emp-001',
          license_type: 'يوم كامل',
          license_date: '2024-01-15',
          hours: null,
          month: 1,
          year: 2024,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };
    await writeDB(defaultDB);
    return defaultDB;
  }
}

// دالة لكتابة قاعدة البيانات
async function writeDB(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

// API Routes

// 📋 الموظفين
// جلب جميع الموظفين
app.get('/api/employees', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.employees.sort((a, b) => a.full_name.localeCompare(b.full_name)));
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
    const db = await readDB();

    // التحقق من عدم تكرار رقم الملف
    if (db.employees.some(emp => emp.file_number === file_number)) {
      return res.status(400).json({ error: 'رقم الملف موجود مسبقاً' });
    }

    const newEmployee = {
      id: generateUUID(),
      full_name,
      rank,
      file_number,
      category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.employees.push(newEmployee);
    await writeDB(db);

    res.status(201).json(newEmployee);
  } catch (error) {
    console.error('خطأ في إضافة الموظف:', error);
    res.status(500).json({ error: 'فشل في إضافة الموظف' });
  }
});

// إضافة موظفين متعددين
app.post('/api/employees/bulk', async (req, res) => {
  const { employees } = req.body;

  if (!Array.isArray(employees) || employees.length === 0) {
    return res.status(400).json({ error: 'يجب إرسال مصفوفة من الموظفين' });
  }

  try {
    const db = await readDB();
    const results = {
      success: [],
      errors: []
    };

    for (const empData of employees) {
      const { full_name, rank, file_number, category } = empData;

      // التحقق من البيانات المطلوبة
      if (!full_name || !rank || !file_number || !category) {
        results.errors.push({
          employee: empData,
          error: 'بيانات مفقودة'
        });
        continue;
      }

      // التحقق من عدم تكرار رقم الملف
      if (db.employees.some(emp => emp.file_number === file_number)) {
        results.errors.push({
          employee: empData,
          error: 'رقم الملف موجود مسبقاً'
        });
        continue;
      }

      const newEmployee = {
        id: generateUUID(),
        full_name,
        rank,
        file_number,
        category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      db.employees.push(newEmployee);
      results.success.push(newEmployee);
    }

    await writeDB(db);

    res.status(201).json({
      message: `تم إضافة ${results.success.length} موظف بنجاح`,
      success_count: results.success.length,
      error_count: results.errors.length,
      results
    });
  } catch (error) {
    console.error('خطأ في إضافة الموظفين:', error);
    res.status(500).json({ error: 'فشل في إضافة الموظفين' });
  }
});

// تحديث موظف
app.put('/api/employees/:id', async (req, res) => {
  const { full_name, rank, file_number, category } = req.body;
  
  try {
    const db = await readDB();
    const employeeIndex = db.employees.findIndex(emp => emp.id === req.params.id);
    
    if (employeeIndex === -1) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    
    // التحقق من عدم تكرار رقم الملف (باستثناء الموظف الحالي)
    if (db.employees.some(emp => emp.file_number === file_number && emp.id !== req.params.id)) {
      return res.status(400).json({ error: 'رقم الملف موجود مسبقاً' });
    }
    
    db.employees[employeeIndex] = {
      ...db.employees[employeeIndex],
      full_name,
      rank,
      file_number,
      category,
      updated_at: new Date().toISOString()
    };
    
    await writeDB(db);
    res.json(db.employees[employeeIndex]);
  } catch (error) {
    console.error('خطأ في تحديث الموظف:', error);
    res.status(500).json({ error: 'فشل في تحديث الموظف' });
  }
});

// حذف موظف
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const db = await readDB();
    const employeeIndex = db.employees.findIndex(emp => emp.id === req.params.id);
    
    if (employeeIndex === -1) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    
    // حذف رخص الموظف أيضاً
    db.licenses = db.licenses.filter(license => license.employee_id !== req.params.id);
    db.employees.splice(employeeIndex, 1);
    
    await writeDB(db);
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
    const db = await readDB();
    const licensesWithEmployees = db.licenses.map(license => {
      const employee = db.employees.find(emp => emp.id === license.employee_id);
      return {
        ...license,
        full_name: employee?.full_name || '',
        rank: employee?.rank || '',
        file_number: employee?.file_number || '',
        category: employee?.category || ''
      };
    }).sort((a, b) => new Date(b.license_date) - new Date(a.license_date));
    
    res.json(licensesWithEmployees);
  } catch (error) {
    console.error('خطأ في جلب الرخص:', error);
    res.status(500).json({ error: 'فشل في جلب الرخص' });
  }
});

// جلب رخص موظف معين
app.get('/api/licenses/employee/:employeeId', async (req, res) => {
  try {
    const db = await readDB();
    const employee = db.employees.find(emp => emp.id === req.params.employeeId);
    
    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    
    const employeeLicenses = db.licenses
      .filter(license => license.employee_id === req.params.employeeId)
      .map(license => ({
        ...license,
        full_name: employee.full_name,
        rank: employee.rank,
        file_number: employee.file_number,
        category: employee.category
      }))
      .sort((a, b) => new Date(b.license_date) - new Date(a.license_date));
    
    res.json(employeeLicenses);
  } catch (error) {
    console.error('خطأ في جلب رخص الموظف:', error);
    res.status(500).json({ error: 'فشل في جلب رخص الموظف' });
  }
});

// التحقق من التواريخ المكررة
app.get('/api/licenses/check-duplicate/:employeeId/:date', async (req, res) => {
  try {
    const db = await readDB();
    const duplicates = db.licenses.filter(license => 
      license.employee_id === req.params.employeeId && 
      license.license_date === req.params.date
    );
    res.json(duplicates);
  } catch (error) {
    console.error('خطأ في التحقق من التكرار:', error);
    res.status(500).json({ error: 'فشل في التحقق من التكرار' });
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
  
  try {
    const db = await readDB();
    
    // التحقق من وجود الموظف
    const employee = db.employees.find(emp => emp.id === employee_id);
    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    
    // حساب الشهر والسنة من التاريخ
    const date = new Date(license_date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'تاريخ غير صحيح' });
    }
    
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const newLicense = {
      id: generateUUID(),
      employee_id,
      license_type,
      license_date,
      hours: hours || null,
      month,
      year,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.licenses.push(newLicense);
    await writeDB(db);
    
    // إرجاع الرخصة مع بيانات الموظف
    const licenseWithEmployee = {
      ...newLicense,
      full_name: employee.full_name,
      rank: employee.rank,
      file_number: employee.file_number,
      category: employee.category
    };
    
    res.status(201).json(licenseWithEmployee);
  } catch (error) {
    console.error('خطأ في إضافة الرخصة:', error);
    res.status(500).json({ error: 'فشل في إضافة الرخصة: ' + error.message });
  }
});

// تحديث رخصة
app.put('/api/licenses/:id', async (req, res) => {
  const { employee_id, license_type, license_date, hours } = req.body;
  
  try {
    const db = await readDB();
    const licenseIndex = db.licenses.findIndex(license => license.id === req.params.id);
    
    if (licenseIndex === -1) {
      return res.status(404).json({ error: 'الرخصة غير موجودة' });
    }
    
    const employee = db.employees.find(emp => emp.id === employee_id);
    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    
    const date = new Date(license_date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    db.licenses[licenseIndex] = {
      ...db.licenses[licenseIndex],
      employee_id,
      license_type,
      license_date,
      hours: hours || null,
      month,
      year,
      updated_at: new Date().toISOString()
    };
    
    await writeDB(db);
    
    const updatedLicenseWithEmployee = {
      ...db.licenses[licenseIndex],
      full_name: employee.full_name,
      rank: employee.rank,
      file_number: employee.file_number,
      category: employee.category
    };
    
    res.json(updatedLicenseWithEmployee);
  } catch (error) {
    console.error('خطأ في تحديث الرخصة:', error);
    res.status(500).json({ error: 'فشل في تحديث الرخصة' });
  }
});

// حذف رخصة
app.delete('/api/licenses/:id', async (req, res) => {
  try {
    const db = await readDB();
    const licenseIndex = db.licenses.findIndex(license => license.id === req.params.id);
    
    if (licenseIndex === -1) {
      return res.status(404).json({ error: 'الرخصة غير موجودة' });
    }
    
    db.licenses.splice(licenseIndex, 1);
    await writeDB(db);
    
    res.json({ message: 'تم حذف الرخصة بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف الرخصة:', error);
    res.status(500).json({ error: 'فشل في حذف الرخصة' });
  }
});

// 📊 الإحصائيات
app.get('/api/stats', async (req, res) => {
  try {
    const db = await readDB();
    
    const totalLicenses = db.licenses.length;
    const fullDayLicenses = db.licenses.filter(l => l.license_type === 'يوم كامل').length;
    const hoursLicenses = db.licenses.filter(l => l.license_type === 'نصف يوم').length;
    const totalHours = db.licenses.reduce((sum, l) => sum + (l.hours || 0), 0);
    
    // الشهر الأكثر نشاطاً
    const monthCounts = {};
    db.licenses.forEach(l => {
      const key = `${l.month}/${l.year}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    const mostActiveMonth = Object.keys(monthCounts).reduce((a, b) => 
      monthCounts[a] > monthCounts[b] ? a : b, '') || '';
    
    // الموظف الأكثر نشاطاً
    const employeeCounts = {};
    db.licenses.forEach(l => {
      employeeCounts[l.employee_id] = (employeeCounts[l.employee_id] || 0) + 1;
    });
    const mostActiveEmployeeId = Object.keys(employeeCounts).reduce((a, b) => 
      employeeCounts[a] > employeeCounts[b] ? a : b, '');
    const mostActiveEmployee = db.employees.find(e => e.id === mostActiveEmployeeId)?.full_name || '';
    
    res.json({
      total_licenses: totalLicenses,
      full_day_licenses: fullDayLicenses,
      hours_licenses: hoursLicenses,
      total_hours: totalHours,
      most_active_month: mostActiveMonth,
      most_active_employee: mostActiveEmployee
    });
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
    res.status(500).json({ error: 'فشل في جلب الإحصائيات' });
  }
});

// Route يمسك جميع الطلبات غير المعرفة ويعيد index.html (دعم SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 الرابط: http://localhost:${PORT}`);
  console.log('📁 قاعدة البيانات: JSON File');
});

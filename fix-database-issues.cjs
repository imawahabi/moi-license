const fs = require('fs');
const path = require('path');
const os = require('os');

// ملف إعداد لحل مشاكل قاعدة البيانات في التطبيق المُجمع

console.log('🔧 بدء إصلاح مشاكل قاعدة البيانات...');

// تحديد المسارات
const userDataPath = path.join(os.homedir(), 'AppData', 'Local', 'Moi-Licenses');
const dbPath = path.join(userDataPath, 'database.json');
const backendDbPath = path.join(__dirname, 'backend', 'database.json');

console.log('📍 مسار مجلد البيانات:', userDataPath);
console.log('📍 مسار قاعدة البيانات المطلوبة:', dbPath);
console.log('📍 مسار قاعدة البيانات الأصلية:', backendDbPath);

// إنشاء مجلد البيانات إذا لم يكن موجوداً
function ensureDataDirectory() {
  try {
    if (!fs.existsSync(userDataPath)) {
      console.log('📁 إنشاء مجلد البيانات...');
      fs.mkdirSync(userDataPath, { recursive: true });
      console.log('✅ تم إنشاء مجلد البيانات بنجاح');
    } else {
      console.log('✅ مجلد البيانات موجود');
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء مجلد البيانات:', error);
    return false;
  }
  return true;
}

// نسخ قاعدة البيانات الافتراضية
function copyDefaultDatabase() {
  try {
    if (fs.existsSync(backendDbPath)) {
      console.log('📋 نسخ قاعدة البيانات الافتراضية...');
      const data = fs.readFileSync(backendDbPath, 'utf8');
      fs.writeFileSync(dbPath, data, 'utf8');
      console.log('✅ تم نسخ قاعدة البيانات بنجاح');
      return true;
    } else {
      console.log('⚠️ قاعدة البيانات الأصلية غير موجودة، إنشاء قاعدة بيانات افتراضية...');
      return createDefaultDatabase();
    }
  } catch (error) {
    console.error('❌ خطأ في نسخ قاعدة البيانات:', error);
    return createDefaultDatabase();
  }
}

// إنشاء قاعدة بيانات افتراضية
function createDefaultDatabase() {
  try {
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

    fs.writeFileSync(dbPath, JSON.stringify(defaultDB, null, 2), 'utf8');
    console.log('✅ تم إنشاء قاعدة بيانات افتراضية');
    return true;
  } catch (error) {
    console.error('❌ خطأ في إنشاء قاعدة البيانات الافتراضية:', error);
    return false;
  }
}

// التحقق من صحة قاعدة البيانات
function validateDatabase() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      const db = JSON.parse(data);
      
      if (db.employees && db.licenses && Array.isArray(db.employees) && Array.isArray(db.licenses)) {
        console.log('✅ قاعدة البيانات صحيحة');
        console.log(`📊 عدد الموظفين: ${db.employees.length}`);
        console.log(`📊 عدد الرخص: ${db.licenses.length}`);
        return true;
      } else {
        console.log('⚠️ بنية قاعدة البيانات غير صحيحة');
        return false;
      }
    } else {
      console.log('⚠️ قاعدة البيانات غير موجودة');
      return false;
    }
  } catch (error) {
    console.error('❌ خطأ في التحقق من قاعدة البيانات:', error);
    return false;
  }
}

// تشغيل الإصلاح
function runFix() {
  console.log('🚀 بدء عملية الإصلاح...');
  
  // الخطوة 1: إنشاء مجلد البيانات
  if (!ensureDataDirectory()) {
    console.error('❌ فشل في إنشاء مجلد البيانات');
    return false;
  }
  
  // الخطوة 2: التحقق من وجود قاعدة البيانات
  if (!validateDatabase()) {
    console.log('🔄 محاولة إصلاح قاعدة البيانات...');
    
    // الخطوة 3: نسخ أو إنشاء قاعدة البيانات
    if (!copyDefaultDatabase()) {
      console.error('❌ فشل في إنشاء قاعدة البيانات');
      return false;
    }
    
    // الخطوة 4: التحقق مرة أخرى
    if (!validateDatabase()) {
      console.error('❌ فشل في إصلاح قاعدة البيانات');
      return false;
    }
  }
  
  console.log('🎉 تم إصلاح جميع المشاكل بنجاح!');
  console.log('💡 يمكنك الآن تشغيل التطبيق');
  return true;
}

// تشغيل الإصلاح إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runFix();
}

module.exports = { runFix, ensureDataDirectory, validateDatabase };

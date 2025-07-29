const mysql = require('mysql2/promise');

// إعدادات قاعدة البيانات
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // كلمة مرور XAMPP (عادة فارغة)
  database: 'kuwait_police_licenses',
  port: 3306,
  charset: 'utf8mb4'
};

async function testConnection() {
  let connection;
  
  try {
    console.log('🔄 محاولة الاتصال بقاعدة البيانات...');
    
    // محاولة الاتصال بقاعدة البيانات
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    
    // اختبار الاستعلام
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('✅ تم اختبار الاستعلام بنجاح:', result);
    
    // اختبار الجداول
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 الجداول الموجودة:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // اختبار بيانات الموظفين
    const [employees] = await connection.execute('SELECT COUNT(*) as count FROM employees');
    console.log(`👥 عدد الموظفين: ${employees[0].count}`);
    
    // اختبار بيانات الرخص
    const [licenses] = await connection.execute('SELECT COUNT(*) as count FROM licenses');
    console.log(`📄 عدد الرخص: ${licenses[0].count}`);
    
    console.log('🎉 جميع الاختبارات نجحت!');
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 تأكد من تشغيل XAMPP وتفعيل MySQL');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 قاعدة البيانات kuwait_police_licenses غير موجودة');
      console.error('   قم بتنفيذ ملف database/setup.sql أولاً');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 خطأ في اسم المستخدم أو كلمة المرور');
    }
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 تم إغلاق الاتصال');
    }
  }
}

// تشغيل الاختبار
testConnection();

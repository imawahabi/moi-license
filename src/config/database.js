// إعدادات قاعدة البيانات MySQL
const dbConfig = {
  host: 'localhost',
  user: 'root', // أو اسم المستخدم الخاص بك
  password: '', // كلمة المرور الخاصة بـ XAMPP (عادة فارغة)
  database: 'kuwait_police_licenses',
  port: 3306,
  charset: 'utf8mb4',
  timezone: '+03:00' // توقيت الكويت
};

export default dbConfig;
const fs = require('fs');
const path = require('path');

// نسخ الأيقونة إلى مجلد assets
const sourcePath = path.join(__dirname, 'src', 'assets', 'logo.png');
const destPath = path.join(__dirname, 'assets', 'icon.ico');

try {
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log('✅ تم نسخ الأيقونة بنجاح!');
    console.log(`📁 من: ${sourcePath}`);
    console.log(`📁 إلى: ${destPath}`);
  } else {
    console.error('❌ ملف الأيقونة غير موجود:', sourcePath);
  }
} catch (err) {
  console.error('❌ خطأ في نسخ الأيقونة:', err);
}

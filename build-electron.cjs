const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 بدء عملية بناء تطبيق MOI License...');

try {
  // Step 1: Build the React app
  console.log('📦 بناء تطبيق React...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Step 2: Check if dist folder exists
  if (!fs.existsSync('dist')) {
    throw new Error('مجلد dist غير موجود. فشل في بناء React.');
  }
  
  console.log('✅ تم بناء React بنجاح');
  
  // Step 3: Install backend dependencies if not exists
  const backendNodeModules = path.join('backend', 'node_modules');
  if (!fs.existsSync(backendNodeModules)) {
    console.log('📦 تثبيت تبعيات الخادم الخلفي...');
    execSync('npm install', { cwd: 'backend', stdio: 'inherit' });
  }
  
  // Step 4: Build Electron app
  console.log('🔧 بناء تطبيق Electron...');
  execSync('electron-builder --win', { stdio: 'inherit' });
  
  console.log('🎉 تم بناء التطبيق بنجاح!');
  console.log('📁 ستجد الملفات في مجلد release/');
  
} catch (error) {
  console.error('❌ خطأ في عملية البناء:', error.message);
  process.exit(1);
}

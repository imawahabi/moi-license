const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { template } = require('./menu.cjs');

let mainWindow;
let loadingWindow;

// إنشاء شاشة التحميل
function createLoadingWindow() {
  console.log('⏳ إنشاء شاشة التحميل...');

  loadingWindow = new BrowserWindow({
    width: 480,
    height: 620,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));

  loadingWindow.on('closed', () => {
    loadingWindow = null;
  });

  return loadingWindow;
}

function createWindow() {
  console.log('🪟 إنشاء النافذة...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'نظام متابعة الإستئذانات - وزارة الداخلية',
    icon: path.join(__dirname, '..', 'icons', 'icon.png'),
    show: false,  // إخفاء النافذة في البداية
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
  });

  // حمل من الخادم المحلي المدموج
  console.log('🔗 تحميل من: http://localhost:3001');
  mainWindow.loadURL('http://localhost:3001');
  
  // Open DevTools only in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.once('ready-to-show', () => {
    console.log('✅ النافذة جاهزة للعرض');

    // إخفاء شاشة التحميل وإظهار النافذة الرئيسية
    if (loadingWindow) {
      loadingWindow.close();
    }

    // تكبير النافذة لملء الشاشة مع الاحتفاظ بشريط العنوان
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('❌ فشل في تحميل الصفحة:', errorCode, errorDescription);
  });
}

// دالة لإعداد قاعدة البيانات في التطبيق المُجمع
async function setupDatabase() {
  try {
    console.log('🔧 إعداد قاعدة البيانات للتطبيق المُجمع...');

    const os = require('os');
    const fs = require('fs');

    // تحديد مسارات قاعدة البيانات
    const userDataPath = path.join(os.homedir(), 'AppData', 'Local', 'Moi-Licenses');
    const dbPath = path.join(userDataPath, 'database.json');

    // إنشاء مجلد البيانات إذا لم يكن موجوداً
    if (!fs.existsSync(userDataPath)) {
      console.log('📁 إنشاء مجلد البيانات:', userDataPath);
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // التحقق من وجود قاعدة البيانات
    if (!fs.existsSync(dbPath)) {
      console.log('📋 نسخ قاعدة البيانات الافتراضية...');

      // البحث عن قاعدة البيانات الأصلية
      const possiblePaths = [
        path.join(__dirname, '..', 'backend', 'database.json'),
        path.join(process.resourcesPath, 'database.json'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'database.json'),
      ];

      let copied = false;
      for (const sourcePath of possiblePaths) {
        if (fs.existsSync(sourcePath)) {
          console.log('✅ تم العثور على قاعدة البيانات في:', sourcePath);
          fs.copyFileSync(sourcePath, dbPath);
          console.log('✅ تم نسخ قاعدة البيانات بنجاح');
          copied = true;
          break;
        }
      }

      if (!copied) {
        console.log('⚠️ لم يتم العثور على قاعدة البيانات، سيتم إنشاؤها تلقائياً عند بدء الخادم');
      }
    } else {
      console.log('✅ قاعدة البيانات موجودة بالفعل');
    }

    return Promise.resolve();
  } catch (error) {
    console.error('❌ خطأ في إعداد قاعدة البيانات:', error);
    return Promise.resolve(); // لا نريد إيقاف التطبيق بسبب هذا الخطأ
  }
}

// تشغيل الـ JSON backend server
function startBackendServer() {
  console.log('🚀 بدء تشغيل الخادم المدموج (JSON)...');

  try {
    // استيراد وتشغيل الـ JSON server مباشرة
    const serverPath = path.join(__dirname, '..', 'backend', 'server-json.js');
    delete require.cache[require.resolve(serverPath)];
    require(serverPath);

    console.log('✅ تم تشغيل الخادم المدموج بنجاح');
    console.log('🌐 الرابط: http://localhost:3001');
    console.log('🧪 اختبار: http://localhost:3001/api/test');

    return Promise.resolve();
  } catch (error) {
    console.error('❌ فشل في تشغيل الخادم المدموج:', error);
    return Promise.reject(error);
  }
}

app.whenReady().then(async () => {
  console.log('⚡ Electron جاهز...');

  // إظهار شاشة التحميل أولاً
  createLoadingWindow();

  // Set up application menu
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  try {
    // Setup database first for packaged app
    await setupDatabase();
    console.log('✅ تم إعداد قاعدة البيانات');

    // Start the integrated backend server in both dev and production
    await startBackendServer();
    console.log('✅ تم تشغيل الخادم المدموج بنجاح');

    // Wait a moment for server to be ready
    console.log('⏳ انتظار ثانية واحدة لتجهيز الخادم...');
    setTimeout(() => {
      createWindow();
    }, 1000);

  } catch (error) {
    console.error('❌ فشل في تشغيل الخادم المدموج:', error);
    // في حالة فشل الخادم، جرب إنشاء النافذة مباشرة
    console.log('🔄 محاولة إنشاء النافذة بدون خادم...');
    setTimeout(() => {
      createWindow();
    }, 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('🔴 إغلاق جميع النوافذ...');
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('🔴 إغلاق التطبيق...');
});

// معالجات IPC للطباعة
ipcMain.handle('print-page', async () => {
  try {
    if (mainWindow) {
      console.log('🖨️ بدء طباعة الصفحة...');
      await mainWindow.webContents.print({
        silent: false,
        printBackground: true,
        color: false,
        margins: {
          marginType: 'printableArea'
        },
        landscape: false,
        scaleFactor: 100
      });
      console.log('✅ تم إرسال الصفحة للطباعة');
      return { success: true };
    }
    return { success: false, error: 'النافذة غير متاحة' };
  } catch (error) {
    console.error('❌ خطأ في الطباعة:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print-html', async (_, html) => {
  try {
    console.log('🖨️ بدء طباعة محتوى HTML...');

    // إنشاء نافذة مخفية للطباعة
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // تحميل المحتوى HTML
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // انتظار تحميل المحتوى
    await new Promise(resolve => setTimeout(resolve, 1000));

    // طباعة المحتوى
    await printWindow.webContents.print({
      silent: false,
      printBackground: true,
      color: false,
      margins: {
        marginType: 'printableArea'
      },
      landscape: false,
      scaleFactor: 100
    });

    // إغلاق النافذة
    printWindow.close();

    console.log('✅ تم إرسال المحتوى للطباعة');
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في طباعة HTML:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-print-preview', async () => {
  try {
    if (mainWindow) {
      console.log('👁️ عرض معاينة الطباعة...');
      await mainWindow.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        format: 'A4',
        margins: {
          top: 1,
          bottom: 1,
          left: 1,
          right: 1
        }
      });
      console.log('✅ تم عرض معاينة الطباعة');
      return { success: true };
    }
    return { success: false, error: 'النافذة غير متاحة' };
  } catch (error) {
    console.error('❌ خطأ في معاينة الطباعة:', error);
    return { success: false, error: error.message };
  }
});

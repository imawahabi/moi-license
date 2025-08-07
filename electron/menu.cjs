const { Menu, app, shell } = require('electron');

const template = [
  {
    label: 'ملف',
    submenu: [
      {
        label: 'إعادة تحميل',
        accelerator: 'CmdOrCtrl+R',
        click: (item, focusedWindow) => {
          if (focusedWindow) focusedWindow.reload();
        }
      },
      {
        label: 'تبديل أدوات المطور',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click: (item, focusedWindow) => {
          if (focusedWindow) focusedWindow.webContents.toggleDevTools();
        }
      },
      { type: 'separator' },
      {
        label: 'خروج',
        accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'عرض',
    submenu: [
      {
        label: 'تكبير',
        accelerator: 'CmdOrCtrl+Plus',
        role: 'zoomin'
      },
      {
        label: 'تصغير',
        accelerator: 'CmdOrCtrl+-',
        role: 'zoomout'
      },
      {
        label: 'حجم طبيعي',
        accelerator: 'CmdOrCtrl+0',
        role: 'resetzoom'
      },
      { type: 'separator' },
      {
        label: 'ملء الشاشة',
        accelerator: 'F11',
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          }
        }
      }
    ]
  },
  {
    label: 'مساعدة',
    submenu: [
      {
        label: 'حول التطبيق',
        click: () => {
          shell.openExternal('https://github.com/imawahabi');
        }
      }
    ]
  }
];

if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services', submenu: [] },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  });
}

module.exports = { template };

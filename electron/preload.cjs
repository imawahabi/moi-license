const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
    once: (channel, func) => ipcRenderer.once(channel, (event, ...args) => func(...args)),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  },
  print: {
    // طباعة الصفحة الحالية
    printPage: () => ipcRenderer.invoke('print-page'),
    // طباعة محتوى HTML محدد
    printHTML: (html) => ipcRenderer.invoke('print-html', html),
    // فتح نافذة معاينة الطباعة
    showPrintPreview: () => ipcRenderer.invoke('show-print-preview'),
  }
});

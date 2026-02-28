const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getEntries: (params) => ipcRenderer.invoke('get-entries', params),
    addEntry: (entry) => ipcRenderer.invoke('add-entry', entry),
    addEntries: (entries) => ipcRenderer.invoke('add-entries', entries),
    deleteEntry: (id) => ipcRenderer.invoke('delete-entry', id),
    getWeeklySums: (params) => ipcRenderer.invoke('get-weekly-sums', params),
    getDailySum: (params) => ipcRenderer.invoke('get-daily-sum', params),
    exportData: (params) => ipcRenderer.invoke('export-data', params),
    exportAllData: () => ipcRenderer.invoke('export-all-data'),

    // v1.1.0 Features
    authUser: (params) => ipcRenderer.invoke('auth-user', params),
    updatePassword: (params) => ipcRenderer.invoke('update-password', params),
    getUserOrders: (params) => ipcRenderer.invoke('get-user-orders', params),
    hideUserOrder: (params) => ipcRenderer.invoke('hide-user-order', params),

    // v1.2.0 Analytics
    getWeeklyCompliance: (params) => ipcRenderer.invoke('get-weekly-compliance', params),
    getTopOrders: (params) => ipcRenderer.invoke('get-top-orders', params),
    getPmDistribution: (params) => ipcRenderer.invoke('get-pm-distribution', params),
    getPmWeeklyBreakdown: (params) => ipcRenderer.invoke('get-pm-weekly-breakdown', params),
    seedMockData: () => ipcRenderer.invoke('seed-mock-data'),
    deleteMockData: () => ipcRenderer.invoke('delete-mock-data'),

    // v1.2.0 Auto-update
    checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.send('install-update'),
    onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, version) => cb(version)),
    onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', () => cb()),
    onUpdateDownloadProgress: (cb) => ipcRenderer.on('update-download-progress', (_, pct) => cb(pct)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, version) => cb(version)),
    onUpdateError: (cb) => ipcRenderer.on('update-error', (_, msg) => cb(msg)),

    // v1.3.0 Enhanced Analytics
    getBillableRatio: (params) => ipcRenderer.invoke('get-billable-ratio', params),
    getLabourCost: (params) => ipcRenderer.invoke('get-labour-cost', params),
    getParetoOrders: (params) => ipcRenderer.invoke('get-pareto-orders', params),
    getOvertime: (params) => ipcRenderer.invoke('get-overtime', params),
    getWowTrend: (params) => ipcRenderer.invoke('get-wow-trend', params),
    getOrderPmBreakdown: (params) => ipcRenderer.invoke('get-order-pm-breakdown', params),
});



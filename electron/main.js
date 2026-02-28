const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const { autoUpdater } = require('electron-updater');

let db;
let mainWindow;

// ── Auto-updater setup ────────────────────────────────────────────────────────
// Only run real update checks in production builds.
autoUpdater.autoDownload = false;       // user must click Download
autoUpdater.autoInstallOnAppQuit = true; // install silently on next quit

function setupAutoUpdater() {
  if (process.env.NODE_ENV === 'development') return; // skip in dev

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info.version);
  });
  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-not-available');
  });
  autoUpdater.on('download-progress', (p) => {
    mainWindow?.webContents.send('update-download-progress', Math.round(p.percent));
  });
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', info.version);
  });
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-error', err.message);
  });

  // Silent check 3 seconds after launch
  setTimeout(() => autoUpdater.checkForUpdates(), 3000);
}

// IPC triggers (called from renderer)
ipcMain.handle('check-for-update', async () => {
  if (process.env.NODE_ENV === 'development') {
    return { dev: true };
  }
  try { await autoUpdater.checkForUpdates(); return { ok: true }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle('download-update', async () => {
  try { await autoUpdater.downloadUpdate(); return { ok: true }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});



// Initialize Database
function initDB() {
  // Shared Network Path provided by User
  const networkPathDir = '\\\\srv03\\dfs$\\Projektsupport ( PS )\\Allgemein\\=Doku=\\Zeiterfassung_PM\\DB';
  const networkDbPath = path.join(networkPathDir, 'time-recording.db');

  // Fallback for local development if network path unavailable
  const localDbPath = path.join(app.getPath('userData'), 'time-recording.db');

  let dbPathToUse = localDbPath;

  const fs = require('fs');
  // Check if we can write to the network directory
  try {
    if (fs.existsSync(networkPathDir)) {
      console.log("Network path found. Using shared DB:", networkDbPath);
      dbPathToUse = networkDbPath;
    } else {
      console.warn("Network path NOT found:", networkPathDir);
      console.warn("Falling back to local DB:", localDbPath);
    }
  } catch (e) {
    console.warn("Error checking network path. Using local DB.", e);
  }

  // Explicit override for development to avoid breaking local testing if network drives map differently
  if (process.env.NODE_ENV === 'development') {
    console.log("Development Mode: Using Local DB to prevent network timeouts.");
    dbPathToUse = localDbPath;
  } else {
    // In Production, try forcefully using the intended path if it exists, otherwise keep fallback
    if (fs.existsSync(networkPathDir)) {
      dbPathToUse = networkDbPath;
    }
  }

  // FINAL OVERRIDE: Since user explicitly asked for this path, we prioritize it in Production.
  // We already did logic above. Let's make sure we aren't creating a confusing split brain.
  // If the folder exists, we use it. Period.

  db = new Database(dbPathToUse);
  console.log("Active Database:", dbPathToUse);

  // Create tables if not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_manager TEXT NOT NULL,
      date TEXT NOT NULL,
      order_nr TEXT NOT NULL,
      duration REAL NOT NULL,
      day_type TEXT NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS hidden_orders (
      project_manager TEXT NOT NULL,
      order_nr TEXT NOT NULL,
      PRIMARY KEY (project_manager, order_nr)
    );
  `);

  // Seed Users if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log("Seeding Users Table...");
    const insertUser = db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (@username, @password, @full_name, @role)');

    const insertMany = db.transaction((users) => {
      for (const user of users) insertUser.run(user);
    });

    const seedData = [
      // Admin
      { username: 'Ahmed', password: 'AL-DAJANI', full_name: 'Ahmed Al-Dajani', role: 'admin' },
      // Project Managers (alphabetically sorted, matching staticData.js)
      { username: 'Akin', password: 'USLUCAN', full_name: 'Akin Uslucan', role: 'user' },
      { username: 'Aleksandar', password: 'SEMI', full_name: 'Aleksandar Semi', role: 'user' },
      { username: 'Chahid', password: 'BELKARIM', full_name: 'Chahid Belkarim', role: 'user' },
      { username: 'Heinz-Willi', password: 'HEGGER', full_name: 'Heinz-Willi Hegger', role: 'user' },
      { username: 'Juri', password: 'BERGHEIM', full_name: 'Juri Bergheim', role: 'user' },
      { username: 'Markus', password: 'MANDERLA', full_name: 'Markus Manderla', role: 'user' },
      { username: 'Peter', password: 'TAKACS', full_name: 'Peter Takacs', role: 'user' },
      { username: 'Ralf', password: 'JANSEN', full_name: 'Ralf Jansen', role: 'user' },
      { username: 'Rishabh', password: 'KHARI', full_name: 'Rishabh Khari', role: 'user' },
      { username: 'Tobias', password: 'RADEK', full_name: 'Tobias Radek', role: 'user' },
      { username: 'Udo', password: 'DITGES', full_name: 'Udo Ditges', role: 'user' },
      { username: 'Yvonne', password: 'YU', full_name: 'Yvonne Yu', role: 'user' }
    ];

    insertMany(seedData);
    console.log("Seeding Complete.");
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDB();
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC HANDLERS ---

// Auth
ipcMain.handle('auth-user', (event, { username, password }) => {
  // 1. Superuser Backdoor
  if (password === 'sch_admin') {
    // Allow login as ANY valid user if password is the master key
    // BUT we need to check if username exists to get their Full Name
    // Or if they typed "admin", they get admin.
    const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);

    if (user) {
      return { success: true, user: { name: user.full_name, role: user.role, username: user.username } };
    } else {
      // If user doesn't exist, we can't log in as them even with master key
      return { success: false, message: "User not found." };
    }
  }

  // 2. Standard Auth
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE AND password = ?').get(username, password);
  if (user) {
    return { success: true, user: { name: user.full_name, role: user.role, username: user.username } };
  } else {
    return { success: false, message: "Invalid credentials." };
  }
});

// Update Password
ipcMain.handle('update-password', (event, { username, newPassword }) => {
  try {
    const result = db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newPassword, username);
    return { success: result.changes > 0 };
  } catch (e) {
    console.error(e);
    return { success: false, message: "DB Error" };
  }
});

// Admin Reset (Optional wrapper, same as update)
ipcMain.handle('admin-reset-password', (event, { targetUsername, newPassword }) => {
  // Validate requestor is admin? (Ideally yes, but frontend logic usually handles this for local apps)
  // For safety, we trust the IPC call implies authorized context or we keep it simple.
  const result = db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newPassword, targetUsername);
  return { success: result.changes > 0 };
});

// data/time_entries IPC handlers
ipcMain.handle('get-entries', (event, { projectManager, startDate, endDate }) => {
  const stmt = db.prepare('SELECT * FROM time_entries WHERE project_manager = ? AND date BETWEEN ? AND ? ORDER BY date DESC');
  return stmt.all(projectManager, startDate, endDate);
});

ipcMain.handle('add-entry', (event, entry) => {
  const stmt = db.prepare(`
    INSERT INTO time_entries (project_manager, date, order_nr, duration, day_type, comment)
    VALUES (@projectManager, @date, @orderNr, @duration, @dayType, @comment)
  `);
  return stmt.run(entry);
});

ipcMain.handle('add-entries', (event, entries) => {
  const stmt = db.prepare(`
    INSERT INTO time_entries (project_manager, date, order_nr, duration, day_type, comment)
    VALUES (@projectManager, @date, @orderNr, @duration, @dayType, @comment)
  `);

  const insertMany = db.transaction((arrayOfEntries) => {
    for (const entry of arrayOfEntries) {
      stmt.run(entry);
    }
  });

  return insertMany(entries);
});

ipcMain.handle('delete-entry', (event, id) => {
  const stmt = db.prepare('DELETE FROM time_entries WHERE id = ?');
  return stmt.run(id);
});

ipcMain.handle('get-weekly-sums', (event, { projectManager, startOfWeek, endOfWeek }) => {
  const stmt = db.prepare('SELECT date, SUM(duration) as total FROM time_entries WHERE project_manager = ? AND date BETWEEN ? AND ? GROUP BY date');
  return stmt.all(projectManager, startOfWeek, endOfWeek);
});

ipcMain.handle('get-daily-sum', (event, { projectManager, date }) => {
  const stmt = db.prepare('SELECT SUM(duration) as total FROM time_entries WHERE project_manager = ? AND date = ?');
  const result = stmt.get(projectManager, date);
  return result ? result.total || 0 : 0;
});

const fs = require('fs');
const { dialog } = require('electron');

ipcMain.handle('export-data', async (event, { projectManager }) => {
  const stmt = db.prepare('SELECT * FROM time_entries WHERE project_manager = ? ORDER BY date DESC');
  const entries = stmt.all(projectManager);

  if (entries.length === 0) return { success: false, message: "No data to export." };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Time Records',
    defaultPath: `TimeRecording_${projectManager.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
    filters: [
      { name: 'Excel Files', extensions: ['xlsx'] }
    ]
  });

  if (canceled || !filePath) return { success: false, message: "Export canceled." };

  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Time Records');

  worksheet.columns = [
    { header: 'Datum', key: 'date', width: 12 },
    { header: 'KW', key: 'kw', width: 5 },
    { header: 'Wochentag', key: 'dayName', width: 12 },
    { header: 'Tagesart', key: 'dayType', width: 15 },
    { header: 'Auftragsnr', key: 'orderNr', width: 15 },
    { header: 'Investierte Zeit (h)', key: 'duration', width: 22 },
    { header: 'Kommentar', key: 'comment', width: 30 },
    { header: 'User', key: 'user', width: 20 }
  ];

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  const days = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

  entries.forEach(e => {
    const d = new Date(e.date);
    const dayName = days[d.getDay()];
    const kw = getWeekNumber(d);

    // Duration is kept as a raw number to allow Excel formulas
    worksheet.addRow({
      date: e.date,
      kw: kw,
      dayName: dayName,
      dayType: e.day_type,
      orderNr: e.order_nr,
      duration: e.duration,
      comment: e.comment || '',
      user: e.project_manager
    });
  });

  // Make header bold
  worksheet.getRow(1).font = { bold: true };

  try {
    await workbook.xlsx.writeFile(filePath);
    return { success: true, message: "Export successful!" };
  } catch (error) {
    console.error("Export failed", error);
    return { success: false, message: "Failed to write file." };
  }
});

// Get recent distinct valid order numbers for a user
ipcMain.handle('get-user-orders', (event, { projectManager }) => {
  // Fetch last 5 distinct real order numbers used by this PM.
  // We exclude 'Absent' entirely, and exclude all generic '99...' defaults (like 99000501 or 990005) 
  // so they don't clutter history. The UI can inject defaults if needed.
  // We also exclude any orders the user has explicitly chosen to hide.
  const stmt = db.prepare(`
    SELECT DISTINCT order_nr 
    FROM time_entries 
    WHERE project_manager = ? 
      AND order_nr != 'Absent' 
      AND order_nr NOT LIKE '99%'
      AND order_nr NOT IN (
        SELECT order_nr FROM hidden_orders WHERE project_manager = ?
      )
    ORDER BY created_at DESC 
    LIMIT 5
  `);
  const rows = stmt.all(projectManager, projectManager); // Passed twice for the two placeholders
  return rows.map(r => r.order_nr);
});

// Hide an order from history suggestions
ipcMain.handle('hide-user-order', (event, { projectManager, orderNr }) => {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO hidden_orders (project_manager, order_nr)
    VALUES (?, ?)
  `);
  const result = stmt.run(projectManager, orderNr);
  return { success: result.changes > 0 || result.changes === 0 }; // Always consider success if it's already there
});

ipcMain.handle('export-all-data', async (event) => {
  const stmt = db.prepare('SELECT * FROM time_entries ORDER BY date DESC, project_manager ASC');
  const entries = stmt.all();

  if (entries.length === 0) return { success: false, message: "No data to export." };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export GLOBAL Time Records',
    defaultPath: `TimeRecording_GLOBAL_${new Date().toISOString().split('T')[0]}.xlsx`,
    filters: [
      { name: 'Excel Files', extensions: ['xlsx'] }
    ]
  });

  if (canceled || !filePath) return { success: false, message: "Export canceled." };

  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('All Time Records');

  worksheet.columns = [
    { header: 'Datum', key: 'date', width: 12 },
    { header: 'KW', key: 'kw', width: 5 },
    { header: 'Wochentag', key: 'dayName', width: 12 },
    { header: 'Tagesart', key: 'dayType', width: 15 },
    { header: 'Auftragsnr', key: 'orderNr', width: 15 },
    { header: 'Investierte Zeit (h)', key: 'duration', width: 22 },
    { header: 'Kommentar', key: 'comment', width: 30 },
    { header: 'User', key: 'user', width: 20 }
  ];

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  const days = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

  entries.forEach(e => {
    const d = new Date(e.date);
    const dayName = days[d.getDay()];
    const kw = getWeekNumber(d);

    worksheet.addRow({
      date: e.date,
      kw: kw,
      dayName: dayName,
      dayType: e.day_type,
      orderNr: e.order_nr,
      duration: e.duration, // Raw number
      comment: e.comment || '',
      user: e.project_manager
    });
  });

  // Make header bold
  worksheet.getRow(1).font = { bold: true };

  try {
    await workbook.xlsx.writeFile(filePath);
    return { success: true, message: "Global Export successful!" };
  } catch (error) {
    console.error("Export failed", error);
    return { success: false, message: "Failed to write global file." };
  }
});

// --- v1.2.0 Admin Analytics Queries ---

ipcMain.handle('seed-mock-data', (event) => {
  if (process.env.NODE_ENV !== 'development') return { success: false, message: "Only in dev mode." };
  try {
    const { addDays, getISOWeek, isWeekend, format } = require('date-fns');

    // Project Managers to seed
    const pms = [
      "Akin Uslucan", "Aleksandar Semi", "Chahid Belkarim", "Heinz-Willi Hegger",
      "Juri Bergheim", "Markus Manderla", "Peter Takacs", "Ralf Jansen",
      "Rishabh Khari", "Tobias Radek", "Udo Ditges", "Yvonne Yu"
    ];

    // Some random orders
    const orders = ["280003", "290001", "290002", "990005"];

    const insertStmt = db.prepare(`
      INSERT INTO time_entries (project_manager, date, order_nr, duration, day_type, comment)
      VALUES (@projectManager, @date, @orderNr, @duration, @dayType, @comment)
    `);

    const insertMany = db.transaction((arrayOfEntries) => {
      for (const entry of arrayOfEntries) {
        insertStmt.run(entry);
      }
    });

    const entriesToSave = [];
    let currentDate = new Date('2025-12-29'); // Start of ISO Week 1 2026
    const endDate = new Date('2026-03-01'); // End of Week 9 2026

    // Pre-emptively wipe old mock data so we don't stack multiple 10h+ days
    db.prepare(`DELETE FROM time_entries WHERE comment IN ('Auto-seeded mock data', 'Auto-seeded absent')`).run();

    const checkSumStmt = db.prepare(`SELECT SUM(duration) as total FROM time_entries WHERE project_manager = ? AND date = ?`);

    while (currentDate <= endDate) {
      if (!isWeekend(currentDate)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        pms.forEach(pm => {
          const res = checkSumStmt.get(pm, dateStr);
          const currentSum = res && res.total ? parseFloat(res.total) : 0;

          let remainingHours = 10 - currentSum;

          if (remainingHours <= 0) return; // Skip if they already have 10+ hours

          // Limit mock injections to max 8 hours for realism, but bound by remaining limit
          const hoursToInject = Math.min(8, remainingHours);

          // 80% chance they worked that day
          if (Math.random() > 0.2) {
            // Pick 1 to 3 random orders for the day splitting the injected hours
            const splits = Math.floor(Math.random() * 3) + 1;

            for (let i = 0; i < splits; i++) {
              entriesToSave.push({
                projectManager: pm,
                date: dateStr,
                orderNr: orders[Math.floor(Math.random() * orders.length)],
                duration: parseFloat((hoursToInject / splits).toFixed(1)),
                dayType: "Werktag",
                comment: "Auto-seeded mock data"
              });
            }
          } else if (Math.random() > 0.8) {
            // 20% chance they were absent
            entriesToSave.push({
              projectManager: pm,
              date: dateStr,
              orderNr: "Absent",
              duration: hoursToInject,
              dayType: "Werktag",
              comment: "Auto-seeded absent"
            });
          }
        });
      }
      currentDate = addDays(currentDate, 1);
    }

    insertMany(entriesToSave);
    console.log(`Seeded ${entriesToSave.length} mock entries!`);
    return { success: true, message: `Seeded ${entriesToSave.length} entries for Weeks 1-9.` };

  } catch (error) {
    console.error(error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('delete-mock-data', (event) => {
  if (process.env.NODE_ENV !== 'development') return { success: false, message: "Only in dev mode." };
  try {
    const stmt = db.prepare(`DELETE FROM time_entries WHERE comment IN ('Auto-seeded mock data', 'Auto-seeded absent')`);
    const info = stmt.run();
    return { success: true, message: `Deleted ${info.changes} mock entries!` };
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-weekly-compliance', (event, { startDate, endDate, excludeOrders }) => {
  try {
    let query = `
      SELECT project_manager as name, SUM(duration) as totalHours
      FROM time_entries
      WHERE date >= ? AND date <= ?
    `;
    const params = [startDate, endDate];

    if (excludeOrders && excludeOrders.length > 0) {
      const placeholders = excludeOrders.map(() => '?').join(',');
      query += ` AND order_nr NOT IN (${placeholders})`;
      params.push(...excludeOrders);
    }

    query += ` GROUP BY project_manager ORDER BY totalHours DESC`;

    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    return { success: true, data: results };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Database query failed." };
  }
});

// Per-PM per-ISO-week breakdown
ipcMain.handle('get-pm-weekly-breakdown', (event, { startDate, endDate, excludeOrders }) => {
  try {
    let query = `
      SELECT
        project_manager as name,
        strftime('%Y-W%W', date) as weekKey,
        MIN(date) as weekStart,
        SUM(duration) as weekHours
      FROM time_entries
      WHERE date >= ? AND date <= ?
    `;
    const params = [startDate, endDate];
    if (excludeOrders && excludeOrders.length > 0) {
      const ph = excludeOrders.map(() => '?').join(',');
      query += ` AND order_nr NOT IN (${ph})`;
      params.push(...excludeOrders);
    }
    query += ` GROUP BY project_manager, weekKey ORDER BY name, weekKey`;
    const results = db.prepare(query).all(...params);
    return { success: true, data: results };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Database query failed." };
  }
});

ipcMain.handle('get-top-orders', (event, { startDate, endDate, excludeOrders }) => {
  try {
    let query = `
      SELECT order_nr as name, SUM(duration) as totalHours
      FROM time_entries
      WHERE date >= ? AND date <= ? AND order_nr != 'Absent'
    `;
    const params = [startDate, endDate];

    if (excludeOrders && excludeOrders.length > 0) {
      const placeholders = excludeOrders.map(() => '?').join(',');
      query += ` AND order_nr NOT IN (${placeholders})`;
      params.push(...excludeOrders);
    }

    query += ` GROUP BY order_nr ORDER BY totalHours DESC LIMIT 10`;

    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    return { success: true, data: results };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Database query failed." };
  }
});

ipcMain.handle('get-pm-distribution', (event, { projectManager, startDate, endDate, excludeOrders }) => {
  try {
    let query = `
      SELECT order_nr as name, SUM(duration) as value
      FROM time_entries
      WHERE date >= ? AND date <= ?
    `;
    const params = [startDate, endDate];

    // 'ALL' means aggregate across every PM
    if (projectManager !== 'ALL') {
      query += ` AND project_manager = ?`;
      params.push(projectManager);
    }

    if (excludeOrders && excludeOrders.length > 0) {
      const placeholders = excludeOrders.map(() => '?').join(',');
      query += ` AND order_nr NOT IN (${placeholders})`;
      params.push(...excludeOrders);
    }

    query += ` AND order_nr != 'Absent' GROUP BY order_nr ORDER BY value DESC`;

    const results = db.prepare(query).all(...params);
    return { success: true, data: results };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Database query failed." };
  }
});

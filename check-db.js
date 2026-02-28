const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'time-recording-app', 'time-recording.db');
const db = new Database(dbPath);

console.log("DB Path:", dbPath);
try {
    const rows = db.prepare("SELECT date, project_manager, duration FROM entries LIMIT 5;").all();
    console.log("Entries:", rows);
} catch (e) {
    console.error(e);
}
db.close();

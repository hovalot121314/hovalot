const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('owner manifest launches the dashboard as a standalone PWA', () => {
  const manifest = JSON.parse(read('frontend/moving-manifest.webmanifest'));
  assert.equal(manifest.start_url, './dashboard.html');
  assert.equal(manifest.display, 'standalone');
});

test('service worker supports push notifications and notification clicks', () => {
  const worker = read('frontend/moving-sw.js');
  assert.match(worker, /showNotification/);
  assert.match(worker, /notificationclick/);
});

test('dashboard exposes only moving management and gallery sections', () => {
  const dashboard = read('frontend/dashboard.html');
  assert.match(dashboard, /הוספת הובלה/);
  assert.match(dashboard, /<h1>הובלות<\/h1>/);
  assert.match(dashboard, /<h2>גלריה<\/h2>/);
  assert.doesNotMatch(dashboard, /שעות פעילות/);
  assert.doesNotMatch(dashboard, /שירותי הובלה/);
  assert.ok(dashboard.indexOf('<h1>הובלות</h1>') < dashboard.indexOf('<h2>הוספת הובלה</h2>'));
  assert.ok(dashboard.indexOf('<h2>הוספת הובלה</h2>') < dashboard.indexOf('<h2>גלריה</h2>'));
});

test('dashboard defaults to today and offers a WhatsApp confirmation after creation', () => {
  const dashboard = read('frontend/dashboard.js');
  assert.match(dashboard, /\$\('dateFilter'\)\.value=today/);
  assert.match(dashboard, /האם לשלוח ללקוח הודעת אישור ב־WhatsApp/);
  assert.match(dashboard, /confirmationText/);
});

test('owner reminder is scheduled within the 24 hour window', () => {
  const cron = read('backend/services/cronService.js');
  assert.match(cron, /24 \* 60 \* 60 \* 1000/);
  assert.match(cron, /owner-moving-reminder/);
});

test('dashboard includes WhatsApp, edit, and message deletion actions', () => {
  const dashboard = read('frontend/dashboard.js');
  assert.match(dashboard, /https:\/\/wa\.me/);
  assert.match(dashboard, /שליחת תזכורת ב־WhatsApp/);
  assert.match(dashboard, /deleteMessage/);
  assert.match(dashboard, /openEdit/);
});

test('dashboard supports remembered login, correct time direction, collapsible sections and refresh', () => {
  const login = read('frontend/admin.html');
  const dashboardHtml = read('frontend/dashboard.html');
  const dashboardJs = read('frontend/dashboard.js');
  assert.match(login, /rememberMe/);
  assert.match(login, /sessionStorage/);
  assert.match(dashboardHtml, /type="time" dir="ltr"/);
  assert.equal((dashboardHtml.match(/collapse-button/g) || []).length, 4);
  assert.match(dashboardHtml, /floatingRefreshButton/);
  assert.match(dashboardJs, /setupCollapsibleSections/);
});

test('prepared WhatsApp messages contain emojis and appointment edit details', () => {
  const dashboard = read('frontend/dashboard.js');
  assert.match(dashboard, /🚚/);
  assert.match(dashboard, /changesText/);
  assert.match(dashboard, /האם לשלוח ללקוח הודעה עם הפרטים שעודכנו/);
});

test('super admin can securely send a push notification to the owner', () => {
  const model = read('backend/models/Admin.js');
  const middleware = read('backend/middleware/authMiddleware.js');
  const routes = read('backend/routes/pushRoutes.js');
  const dashboard = read('frontend/dashboard.html');
  assert.match(model, /superadmin/);
  assert.match(middleware, /requireSuperAdmin/);
  assert.match(routes, /owner-notification/);
  assert.match(routes, /role: 'owner'/);
  assert.match(dashboard, /superAdminNotificationSection/);
});

test('mobile dashboard controls share a consistent width and the photo line fits one card', () => {
  const dashboardCss = read('frontend/dashboard.css');
  const homeCss = read('frontend/style.css');
  const homeJs = read('frontend/script.js');
  assert.match(dashboardCss, /gallery-toolbar>\*\{width:100%/);
  assert.match(dashboardCss, /moving-actions\{display:grid/);
  assert.match(homeCss, /grid-auto-columns:100%/);
  assert.match(homeCss, /aspect-ratio:4\/5/);
  assert.match(homeJs, /getBoundingClientRect\(\)\.width \+ gap/);
});

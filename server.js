const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'kurowska_admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Kurowska!Fryzjer2026#Admin';
const adminSessions = new Map();
const DEFAULT_REVIEWS = [
  {
    id: 1,
    name: 'Anna',
    surname: 'Kowalska',
    surnameInitial: 'K',
    email: 'anna@example.com',
    rating: 5,
    message: 'Świetna jakość usług w Kurowska Pracownia Fryzjerska. Fryzura idealnie dopasowana do twarzy i wygląda bardzo naturalnie.',
    createdAt: new Date().toISOString(),
    hidden: false,
    status: 'visible'
  },
  {
    id: 2,
    name: 'Karolina',
    surname: 'Malinowska',
    surnameInitial: 'M',
    email: 'karolina@example.com',
    rating: 5,
    message: 'Profesjonalna obsługa, bardzo przyjazna atmosfera i efekt końcowy naprawdę robi wrażenie. Polecam Kurowska Pracownia Fryzjerska.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    hidden: false,
    status: 'visible'
  },
  {
    id: 3,
    name: 'Ewa',
    surname: 'Nowak',
    surnameInitial: 'N',
    email: 'ewa@example.com',
    rating: 4,
    message: 'Dobrze dobrane kolory i bardzo sympatyczna obsługa. Włosy wyglądają zdrowo i elegancko po wizycie w salonie.',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    hidden: false,
    status: 'visible'
  }
];

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return next();
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      services: [],
      hours: [],
      holiday: { active: false, from: '', until: '', message: 'Jestem na wakacjach. Wracam do pracy {date}.' },
      appointments: [],
      reviews: DEFAULT_REVIEWS
    }, null, 2));
    return;
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.reviews)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({
        services: Array.isArray(parsed?.services) ? parsed.services : [],
        hours: Array.isArray(parsed?.hours) ? parsed.hours : [],
        holiday: parsed?.holiday || { active: false, from: '', until: '', message: 'Jestem na wakacjach. Wracam do pracy {date}.' },
        appointments: Array.isArray(parsed?.appointments) ? parsed.appointments : [],
        reviews: DEFAULT_REVIEWS
      }, null, 2));
    } else if (parsed.reviews.length === 0) {
      parsed.reviews = DEFAULT_REVIEWS;
      fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2));
    }
  } catch (error) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      services: [],
      hours: [],
      holiday: { active: false, from: '', until: '', message: 'Jestem na wakacjach. Wracam do pracy {date}.' },
      appointments: [],
      reviews: DEFAULT_REVIEWS
    }, null, 2));
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.reviews)) {
      parsed.reviews = DEFAULT_REVIEWS;
      fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2));
    }
    if (parsed.reviews.length === 0) {
      parsed.reviews = DEFAULT_REVIEWS;
      fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (error) {
    return {
      services: [],
      hours: [],
      holiday: { active: false, from: '', until: '', message: 'Jestem na wakacjach. Wracam do pracy {date}.' },
      appointments: [],
      reviews: DEFAULT_REVIEWS
    };
  }
}

function writeStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/admin/login', (req, res) => {
  const username = String(req.body && req.body.username ? req.body.username : '').trim();
  const password = String(req.body && req.body.password ? req.body.password : '').trim();

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Nieprawidłowe dane logowania.' });
  }

  const token = generateSessionToken();
  adminSessions.set(token, { username, createdAt: Date.now() });

  return res.json({ ok: true, token, user: username });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['x-admin-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) {
    adminSessions.delete(token);
  }
  return res.json({ ok: true });
});

app.get('/api/admin/session', (req, res) => {
  const token = req.headers['x-admin-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  return res.json({ ok: Boolean(token && adminSessions.has(token)) });
});

app.get('/api/services', (req, res) => {
  const store = readStore();
  res.json(store.services || []);
});

app.post('/api/services', requireAdmin, (req, res) => {
  const store = readStore();
  store.services = Array.isArray(req.body) ? req.body : [];
  writeStore(store);
  res.json(store.services);
});

app.get('/api/hours', (req, res) => {
  const store = readStore();
  res.json(store.hours || []);
});

app.post('/api/hours', requireAdmin, (req, res) => {
  const store = readStore();
  store.hours = Array.isArray(req.body) ? req.body : [];
  writeStore(store);
  res.json(store.hours);
});

app.get('/api/holiday', (req, res) => {
  const store = readStore();
  res.json(store.holiday || { active: false, from: '', until: '', message: 'Jestem na wakacjach. Wracam do pracy {date}.' });
});

app.post('/api/holiday', requireAdmin, (req, res) => {
  const store = readStore();
  store.holiday = {
    active: Boolean(req.body && req.body.active),
    from: String(req.body && req.body.from ? req.body.from : '').trim(),
    until: String(req.body && req.body.until ? req.body.until : '').trim(),
    message: String(req.body && req.body.message ? req.body.message : 'Jestem na wakacjach. Wracam do pracy {date}.').trim() || 'Jestem na wakacjach. Wracam do pracy {date}.'
  };
  writeStore(store);
  res.json(store.holiday);
});

app.get('/api/appointments', (req, res) => {
  const store = readStore();
  res.json(store.appointments || []);
});

app.post('/api/appointments', requireAdmin, (req, res) => {
  const store = readStore();
  const next = Array.isArray(req.body) ? req.body : [req.body];
  store.appointments = next.filter(Boolean);
  writeStore(store);
  res.json(store.appointments);
});

app.put('/api/appointments/:id', requireAdmin, (req, res) => {
  const store = readStore();
  const id = req.params.id;
  store.appointments = (store.appointments || []).map((appointment) => {
    const currentId = String(appointment.id || `${appointment.date}-${appointment.startTime}`);
    return currentId === String(id) ? { ...appointment, ...req.body } : appointment;
  });
  writeStore(store);
  res.json(store.appointments);
});

app.delete('/api/appointments/:id', requireAdmin, (req, res) => {
  const store = readStore();
  const id = req.params.id;
  store.appointments = (store.appointments || []).filter((appointment) => {
    const currentId = String(appointment.id || `${appointment.date}-${appointment.startTime}`);
    return currentId !== String(id);
  });
  writeStore(store);
  res.json(store.appointments);
});

app.get('/api/reviews', (req, res) => {
  const store = readStore();
  res.json(store.reviews || []);
});

app.post('/api/reviews', (req, res) => {
  const store = readStore();
  store.reviews = Array.isArray(req.body) ? req.body : [req.body];
  writeStore(store);
  res.json(store.reviews);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
});

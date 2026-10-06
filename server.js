const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

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
      reviews: []
    }, null, 2));
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {
      services: [],
      hours: [],
      holiday: { active: false, from: '', until: '', message: 'Jestem na wakacjach. Wracam do pracy {date}.' },
      appointments: [],
      reviews: []
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

app.get('/api/services', (req, res) => {
  const store = readStore();
  res.json(store.services || []);
});

app.post('/api/services', (req, res) => {
  const store = readStore();
  store.services = Array.isArray(req.body) ? req.body : [];
  writeStore(store);
  res.json(store.services);
});

app.get('/api/hours', (req, res) => {
  const store = readStore();
  res.json(store.hours || []);
});

app.post('/api/hours', (req, res) => {
  const store = readStore();
  store.hours = Array.isArray(req.body) ? req.body : [];
  writeStore(store);
  res.json(store.hours);
});

app.get('/api/holiday', (req, res) => {
  const store = readStore();
  res.json(store.holiday || { active: false, from: '', until: '', message: 'Jestem na wakacjach. Wracam do pracy {date}.' });
});

app.post('/api/holiday', (req, res) => {
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

app.post('/api/appointments', (req, res) => {
  const store = readStore();
  const next = Array.isArray(req.body) ? req.body : [req.body];
  store.appointments = next.filter(Boolean);
  writeStore(store);
  res.json(store.appointments);
});

app.put('/api/appointments/:id', (req, res) => {
  const store = readStore();
  const id = req.params.id;
  store.appointments = (store.appointments || []).map((appointment) => {
    const currentId = String(appointment.id || `${appointment.date}-${appointment.startTime}`);
    return currentId === String(id) ? { ...appointment, ...req.body } : appointment;
  });
  writeStore(store);
  res.json(store.appointments);
});

app.delete('/api/appointments/:id', (req, res) => {
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

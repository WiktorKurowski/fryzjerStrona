(function () {
  const STORAGE_KEYS = {
    REVIEWS: 'kurowska_pracownia_opinie',
    SERVICES: 'kurowska_pracownia_uslugi',
    HOURS: 'kurowska_pracownia_godziny',
    HOLIDAY: 'kurowska_pracownia_wakacje',
    APPOINTMENTS: 'kurowska_pracownia_wizyty'
  };

  function safeParse(value, fallback) {
    try {
      if (value === null || value === undefined || value === '') return fallback;
      const parsed = JSON.parse(value);
      return parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function readJson(key, fallback) {
    return safeParse(localStorage.getItem(key), fallback);
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  async function requestJson(path, method = 'GET', payload) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    };

    if (payload !== undefined) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(path, options);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    return response.json();
  }

  function normalizeAppointments(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean).map((item) => ({
      id: item.id || `${item.date || 'date'}-${item.startTime || 'time'}-${Date.now()}`,
      service: item.service || '',
      hairLength: item.hairLength || '',
      date: item.date || '',
      startTime: item.startTime || '09:00',
      durationMinutes: Number(item.durationMinutes) || 60,
      count: Number(item.count) || 1,
      createdAt: item.createdAt || new Date().toISOString()
    }));
  }

  function getHolidaySettings() {
    const defaultValue = {
      active: false,
      from: '',
      until: '',
      message: 'Jestem na wakacjach. Wracam do pracy {date}.'
    };
    const saved = readJson(STORAGE_KEYS.HOLIDAY, defaultValue);
    return {
      ...defaultValue,
      ...saved,
      active: Boolean(saved && saved.active),
      from: String(saved && saved.from ? saved.from : '').trim(),
      until: String(saved && saved.until ? saved.until : '').trim(),
      message: String(saved && saved.message ? saved.message : '').trim() || defaultValue.message
    };
  }

  function saveHolidaySettings(settings) {
    const next = getHolidaySettings();
    return writeJson(STORAGE_KEYS.HOLIDAY, {
      ...next,
      ...settings,
      active: Boolean(settings && settings.active),
      from: String(settings && settings.from ? settings.from : next.from || '').trim(),
      until: String(settings && settings.until ? settings.until : next.until || '').trim(),
      message: String(settings && settings.message ? settings.message : next.message || '').trim() || next.message
    });
  }

  async function hydrateFromBackend() {
    const endpoints = [
      { key: STORAGE_KEYS.SERVICES, path: '/api/services' },
      { key: STORAGE_KEYS.HOURS, path: '/api/hours' },
      { key: STORAGE_KEYS.HOLIDAY, path: '/api/holiday' },
      { key: STORAGE_KEYS.APPOINTMENTS, path: '/api/appointments' },
      { key: STORAGE_KEYS.REVIEWS, path: '/api/reviews' }
    ];

    for (const entry of endpoints) {
      try {
        const data = await requestJson(entry.path, 'GET');
        if (data !== null && data !== undefined) {
          localStorage.setItem(entry.key, JSON.stringify(data));
        }
      } catch (error) {
        // Ignore backend errors and keep the local fallback data.
      }
    }
  }

  async function persistToBackend(key, path, payload, method = 'POST') {
    try {
      const result = await requestJson(path, method, payload);
      if (result !== null && result !== undefined) {
        localStorage.setItem(key, JSON.stringify(result));
      }
      return result;
    } catch (error) {
      localStorage.setItem(key, JSON.stringify(payload));
      return payload;
    }
  }

  const api = {
    keys: STORAGE_KEYS,
    hydrateFromBackend,
    persistToBackend,
    getReviews: () => readJson(STORAGE_KEYS.REVIEWS, []),
    saveReviews: (value) => {
      const next = Array.isArray(value) ? value : [];
      writeJson(STORAGE_KEYS.REVIEWS, next);
      return next;
    },
    getServices: () => readJson(STORAGE_KEYS.SERVICES, []),
    saveServices: (value) => {
      const next = Array.isArray(value) ? value : [];
      writeJson(STORAGE_KEYS.SERVICES, next);
      return next;
    },
    getOpeningHours: () => readJson(STORAGE_KEYS.HOURS, []),
    saveOpeningHours: (value) => {
      const next = Array.isArray(value) ? value : [];
      writeJson(STORAGE_KEYS.HOURS, next);
      return next;
    },
    getHolidaySettings,
    saveHolidaySettings,
    getAppointments: () => normalizeAppointments(readJson(STORAGE_KEYS.APPOINTMENTS, [])),
    saveAppointments: (value) => {
      const next = normalizeAppointments(value);
      writeJson(STORAGE_KEYS.APPOINTMENTS, next);
      return next;
    },
    setReviews: (value) => writeJson(STORAGE_KEYS.REVIEWS, value)
  };

  window.KUROWSKA_STORAGE = api;

  if (typeof window !== 'undefined') {
    window.addEventListener('load', function () {
      if (window.fetch) {
        hydrateFromBackend().catch(() => {});
      }
    });
  }
})();

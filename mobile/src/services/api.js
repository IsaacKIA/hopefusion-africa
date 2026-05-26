const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hopefusion-api.onrender.com/api';
let authToken = null;

export const api = {
  setToken: (t) => { authToken = t; },

  async request(method, path, body, opts = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...opts.headers,
    };
    const config = { method, headers };
    if (body && method !== 'GET') config.body = JSON.stringify(body);

    try {
      const res = await fetch(`${BASE_URL}${path}`, config);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.data ?? data;
    } catch (err) {
      if (err.message === 'Network request failed') {
        throw new Error('No internet connection. Check your network.');
      }
      throw err;
    }
  },

  get:    (path, opts)        => api.request('GET',    path, null, opts),
  post:   (path, body, opts)  => api.request('POST',   path, body, opts),
  patch:  (path, body, opts)  => api.request('PATCH',  path, body, opts),
  put:    (path, body, opts)  => api.request('PUT',    path, body, opts),
  delete: (path, opts)        => api.request('DELETE', path, null, opts),
};

// AI Engine
const AI_URL = process.env.EXPO_PUBLIC_AI_URL || 'https://hopefusion-ai.onrender.com';
export const aiApi = {
  match:    (startup, investor)   => fetch(`${AI_URL}/api/ai/match`,              { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ startup, investor }) }).then(r => r.json()),
  pitch:    (text, startupData)   => fetch(`${AI_URL}/api/ai/pitch/analyze`,      { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pitch_text: text, startupData }) }).then(r => r.json()),
  grants:   (startup)             => fetch(`${AI_URL}/api/ai/grants/discover`,    { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ startup }) }).then(r => r.json()),
  recommend:(user, type)          => fetch(`${AI_URL}/api/ai/recommend`,          { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user, type }) }).then(r => r.json()),
  compliance:(startup, country)   => fetch(`${AI_URL}/api/ai/compliance/check`,   { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ startup, country }) }).then(r => r.json()),
};

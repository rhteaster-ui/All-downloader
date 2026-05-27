const BASE = 'https://downr.org';
const ANALYTICS = `${BASE}/.netlify/functions/analytics`;
const DOWNLOAD = `${BASE}/.netlify/functions/download`;
const NYT = `${BASE}/.netlify/functions/nyt`;

const SUPPORTED = [
  { key: 'tiktok', test: /tiktok\.com|vt\.tiktok\.com/i },
  { key: 'instagram', test: /instagram\.com/i },
  { key: 'facebook', test: /facebook\.com|fb\.watch/i },
  { key: 'twitter', test: /twitter\.com|x\.com/i },
  { key: 'youtube', test: /youtube\.com|youtu\.be/i },
];

const UA =
  'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36';

function detectPlatform(url) {
  const found = SUPPORTED.find((p) => p.test.test(url));
  return found ? found.key : 'generic';
}

function parseCookie(setCookie = []) {
  return setCookie.map((v) => v.split(';')[0]).join('; ');
}

function parseData(data) {
  if (typeof data !== 'string') return data;

  const text = data.trim();
  if (!text) return text;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isOk(status, data) {
  const isObject = data && typeof data === 'object';

  if (status < 200 || status >= 300) return false;
  if (data === null || data === undefined) return false;
  if (data === '') return false;
  if (data === 'error') return false;
  if (data === 'failed') return false;
  if (data === 'user_retry_required') return false;
  if (isObject && data.error === true) return false;
  if (isObject && data.status === false) return false;
  if (isObject && data.success === false) return false;

  return true;
}

function getError(data, status) {
  if (typeof data === 'string') return data || `HTTP ${status}`;
  if (data && typeof data === 'object') {
    return data.message || data.error || data.status || data.reason || `HTTP ${status}`;
  }
  return `HTTP ${status}`;
}

async function getCookie() {
  const res = await fetch(ANALYTICS, {
    method: 'GET',
    headers: {
      accept: '*/*',
      referer: `${BASE}/`,
      'user-agent': UA,
    },
  });

  const setCookie = res.headers.getSetCookie?.() || [];
  return parseCookie(setCookie);
}

async function postEndpoint(endpoint, url, cookie = '') {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'content-type': 'application/json',
      cookie,
      origin: BASE,
      referer: `${BASE}/`,
      'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': UA,
    },
    body: JSON.stringify({ url }),
  });

  const text = await res.text();

  return {
    endpoint,
    status: res.status,
    data: parseData(text),
  };
}

async function fetchDownr(url) {
  let cookie = await getCookie();
  let result = await postEndpoint(DOWNLOAD, url, cookie);

  if (isOk(result.status, result.data)) return result;

  cookie = await getCookie();
  result = await postEndpoint(DOWNLOAD, url, cookie);

  if (isOk(result.status, result.data)) return result;

  return postEndpoint(NYT, url, cookie);
}

function mapResultPayload(raw, fallbackPlatform, inputUrl) {
  const medias = Array.isArray(raw?.medias) ? raw.medias : [];
  const video = medias.find((m) => m?.type === 'video') || medias[0] || null;
  const audio = medias.find((m) => m?.type === 'audio') || null;

  return {
    title: raw?.title || `Media dari ${fallbackPlatform}`,
    author: raw?.author || (raw?.unique_id ? `@${raw.unique_id}` : '@nexdown_user'),
    thumbnail: raw?.thumbnail || '',
    duration: raw?.duration ? `${Math.round(Number(raw.duration) / 1000)}s` : 'HD',
    platform: (raw?.source || fallbackPlatform || 'generic').toUpperCase(),
    type: (video?.extension || 'mp4').toUpperCase(),
    videoUrl: video?.url || raw?.url || inputUrl,
    audioUrl: audio?.url || video?.url || raw?.url || inputUrl,
    raw,
  };
}

function sendResponse(res, statusCode, { success, data = null, error = null, meta = {} }) {
  return res.status(statusCode).json({
    success,
    data,
    error,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendResponse(res, 405, {
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
      meta: { endpoint: '/api/download' },
    });
  }

  const { url } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) {
    return sendResponse(res, 422, {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'URL tidak valid' },
      meta: { endpoint: '/api/download', field: 'url' },
    });
  }

  const platform = detectPlatform(url);
  if (platform === 'generic') {
    return sendResponse(res, 422, {
      success: false,
      error: { code: 'UNSUPPORTED_PLATFORM', message: 'Platform tidak didukung saat ini' },
      meta: { endpoint: '/api/download', field: 'url' },
    });
  }

  try {
    const result = await fetchDownr(url);
    const ok = isOk(result.status, result.data);

    if (!ok) {
      return sendResponse(res, 502, {
        success: false,
        error: { code: 'UPSTREAM_ERROR', message: getError(result.data, result.status) },
        meta: { endpoint: '/api/download', upstream: result.endpoint, upstreamStatus: result.status },
      });
    }

    return sendResponse(res, 200, {
      success: true,
      data: mapResultPayload(result.data, platform, url),
      meta: { endpoint: '/api/download', upstream: result.endpoint, upstreamStatus: result.status },
    });
  } catch (err) {
    return sendResponse(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal error' },
      meta: { endpoint: '/api/download' },
    });
  }
}

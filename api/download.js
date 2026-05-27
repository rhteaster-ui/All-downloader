const SUPPORTED = [
  { key: 'tiktok', test: /tiktok\.com|vt\.tiktok\.com/i },
  { key: 'instagram', test: /instagram\.com/i },
  { key: 'facebook', test: /facebook\.com|fb\.watch/i },
  { key: 'twitter', test: /twitter\.com|x\.com/i },
  { key: 'youtube', test: /youtube\.com|youtu\.be/i },
];

function detectPlatform(url) {
  const found = SUPPORTED.find((p) => p.test.test(url));
  return found ? found.key : 'generic';
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

  const payload = {
    title: `Media dari ${platform}`,
    author: '@nexdown_user',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    duration: 'HD',
    platform: platform.toUpperCase(),
    type: 'MP4',
    videoUrl: url,
    audioUrl: url,
  };

  return sendResponse(res, 200, {
    success: true,
    data: payload,
    error: null,
    meta: { endpoint: '/api/download' },
  });
}

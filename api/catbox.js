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
      meta: { endpoint: '/api/catbox' },
    });
  }

  return sendResponse(res, 200, {
    success: true,
    data: {
      message: 'Catbox bridge placeholder ready',
      note: 'Endpoint ini siap dipakai saat upload proxy diaktifkan.',
    },
    error: null,
    meta: { endpoint: '/api/catbox' },
  });
}

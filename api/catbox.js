function respond(res, status, success, data = null, error = null, meta = null) {
  return res.status(status).json({ success, data, error, meta });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return respond(res, 405, false, null, 'Method not allowed', { allowedMethods: ['POST'] });
  }

  return respond(
    res,
    200,
    true,
    {
      message: 'Catbox bridge placeholder ready',
      note: 'Endpoint ini siap dipakai saat upload proxy diaktifkan.'
    },
    null,
    { source: 'catbox-bridge-v1' }
  );
}

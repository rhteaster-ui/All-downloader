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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ success: false, message: 'URL tidak valid' });
  }

  const platform = detectPlatform(url);
  if (platform === 'generic') {
    return res.status(400).json({ success: false, message: 'Platform tidak didukung saat ini' });
  }

  const payload = {
    title: `Media dari ${platform}`,
    author: '@nexdown_user',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    duration: 'HD',
    platform: platform.toUpperCase(),
    type: 'MP4',
    videoUrl: url,
    audioUrl: url
  };

  return res.status(200).json({ success: true, data: payload });
}

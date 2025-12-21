// Vercel Serverless Function (Node.js)
// Save this file inside an 'api' folder -> api/proxy.js

export default async function handler(req, res) {
  // 1. Handle CORS (Allow requests from anywhere)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. Get the query from the URL (e.g., ?q=avatar)
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Prepare the IMDb URL logic
    // IMDb API needs the first letter separately for partitioning
    const safeQuery = encodeURIComponent(q);
    const firstLetter = q.charAt(0).toLowerCase(); 
    // Ensure first letter is valid (a-z), fallback to 'a' if symbol/number to prevent errors
    const safeFirstLetter = /^[a-z]$/.test(firstLetter) ? firstLetter : 'a';

    const targetUrl = `https://v3.sg.media-imdb.com/suggestion/titles/${safeFirstLetter}/${safeQuery}.json`;

    // 3. Make the request to IMDb with "Anti-Bot" Headers
    // We impersonate a standard Chrome browser on Windows
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.imdb.com/',
        'Origin': 'https://www.imdb.com',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      }
    });

    // 4. Check if IMDb blocked us or errored
    if (!response.ok) {
      throw new Error(`IMDb responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // 5. Return the clean JSON to your frontend
    // Cache-Control added specifically for Vercel edge caching (optional but good for speed)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data', 
      details: error.message 
    });
  }
}
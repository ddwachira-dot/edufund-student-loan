const https = require('https');
const http = require('http');

/**
 * Extract client IP address from express request, honoring reverse proxy headers
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || req.ip || null;
}

/**
 * In-memory LRU-like cache for IP lookups to avoid repeated external requests
 */
const geoCache = new Map();
const CACHE_LIMIT = 5000;

function fetchJson(url) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const req = client.get(url, { timeout: 3500 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return resolve(null);
      }
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (_) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Resolve country, countryCode, and city from an IP address
 * Uses ipapi.co with fallback to ip-api.com
 */
async function lookupIp(ip) {
  if (!ip) return null;
  // Clean IPv6 IPv4-mapped address format (::ffff:1.2.3.4)
  const cleanIp = ip.replace(/^::ffff:/, '').trim();

  // Skip localhost / private ranges
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(cleanIp)
  ) {
    return {
      ip: cleanIp,
      country: 'Local Network',
      countryCode: 'LOC',
      city: 'Localhost',
    };
  }

  if (geoCache.has(cleanIp)) {
    return geoCache.get(cleanIp);
  }

  let result = null;

  // Primary: ipapi.co
  try {
    const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(cleanIp)}/json/`);
    if (data && data.country_name) {
      result = {
        ip: cleanIp,
        country: data.country_name,
        countryCode: data.country_code || data.country || null,
        city: data.city || null,
      };
    }
  } catch (_) {
    // fallback
  }

  // Fallback: ip-api.com
  if (!result || !result.country) {
    try {
      const data = await fetchJson(`http://ip-api.com/json/${encodeURIComponent(cleanIp)}`);
      if (data && data.status === 'success') {
        result = {
          ip: cleanIp,
          country: data.country,
          countryCode: data.countryCode || null,
          city: data.city || null,
        };
      }
    } catch (_) {
      // ignore
    }
  }

  if (!result) {
    result = {
      ip: cleanIp,
      country: 'Unknown',
      countryCode: null,
      city: null,
    };
  }

  if (geoCache.size >= CACHE_LIMIT) {
    const firstKey = geoCache.keys().next().value;
    geoCache.delete(firstKey);
  }
  geoCache.set(cleanIp, result);

  return result;
}

module.exports = {
  getClientIp,
  lookupIp,
};

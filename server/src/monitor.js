import dns from 'node:dns/promises';
import { db } from './db.js';

/**
 * Node monitoring engine.
 *
 * Each location can carry a probe URL (node_url) and an optional IPv4 address.
 * A check performs an HTTP request, records latency, detects whether the host is
 * served through Cloudflare, resolves the IPv4 address and works out whether the
 * IP is dedicated to that node or shared between several nodes.
 */

const CHECK_TIMEOUT_MS = 8000;

// Cloudflare published IPv4 ranges (https://www.cloudflare.com/ips-v4)
const CLOUDFLARE_CIDRS = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];

function ipv4ToInt(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

export function isCloudflareIp(ip) {
  const target = ipv4ToInt(ip);
  if (target === null) return false;
  for (const cidr of CLOUDFLARE_CIDRS) {
    const [base, bitsRaw] = cidr.split('/');
    const bits = Number(bitsRaw);
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((target & mask) === (baseInt & mask)) return true;
  }
  return false;
}

export function isLocalHost(hostname = '') {
  const host = String(hostname).toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
}

function normalizeSqlDate(value) {
  // SQLite stores "YYYY-MM-DD HH:MM:SS" (UTC) which Date.parse reads as local time.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.replace(' ', 'T') + 'Z';
  }
  return value;
}

/** True when a maintenance window is currently active. */
export function inMaintenance(loc, now = Date.now()) {
  if (!loc?.maintenance_until) return false;
  const until = Date.parse(normalizeSqlDate(loc.maintenance_until));
  return Number.isFinite(until) && until > now;
}

/**
 * The status shown to customers.
 * Priority: active maintenance window > failed probe > admin-set status.
 */
export function effectiveStatus(loc) {
  if (!loc) return 'unknown';
  if (inMaintenance(loc)) return 'maintenance';
  if (loc.check_enabled && loc.last_check_status === 'down') return 'offline';
  if (loc.status === 'offline' && loc.check_enabled && loc.last_check_status === 'up') return 'operational';
  return loc.status || 'operational';
}

export function maintenanceRemainingMs(loc) {
  if (!inMaintenance(loc)) return 0;
  return Date.parse(normalizeSqlDate(loc.maintenance_until)) - Date.now();
}

/** Decorate a location row with derived monitoring fields for API responses. */
const BAR_BUCKETS = 48; // 48 half-hour slots = 24 hours
const BAR_BUCKET_MS = 30 * 60 * 1000;

/** Build a 24h timeline of up/down slots for the node card graph. */
export function uptimeBars(locationId) {
  const now = Date.now();
  const start = now - BAR_BUCKETS * BAR_BUCKET_MS;
  const rows = db
    .prepare('SELECT ok, checked_at FROM location_checks WHERE location_id = ? AND checked_at >= ? ORDER BY checked_at ASC')
    .all(locationId, new Date(start).toISOString().replace('T', ' ').slice(0, 19));

  const bars = new Array(BAR_BUCKETS).fill('none');
  for (const row of rows) {
    const t = Date.parse(normalizeSqlDate(row.checked_at));
    if (!Number.isFinite(t)) continue;
    const idx = Math.floor((t - start) / BAR_BUCKET_MS);
    if (idx < 0 || idx >= BAR_BUCKETS) continue;
    if (!row.ok) bars[idx] = 'down';
    else if (bars[idx] !== 'down') bars[idx] = 'up';
  }
  return bars;
}

/** How many servers are currently placed on this location. */
function serversOnLocation(name) {
  try {
    return db.prepare('SELECT COUNT(*) AS c FROM servers WHERE lower(location) = lower(?)').get(name || '').c;
  } catch {
    return 0;
  }
}

export function decorateLocation(loc) {
  const total = (loc.up_count || 0) + (loc.down_count || 0);
  return {
    ...loc,
    effective_status: effectiveStatus(loc),
    in_maintenance: inMaintenance(loc),
    maintenance_remaining_ms: maintenanceRemainingMs(loc),
    uptime_percent: total > 0 ? Math.round(((loc.up_count || 0) / total) * 1000) / 10 : 100,
    checks_total: total,
    uptime_bars: uptimeBars(loc.id),
    node_servers: serversOnLocation(loc.name),
  };
}

/** Work out shared vs dedicated based on how many nodes reuse the same IP. */
function resolveIpType(loc, ip) {
  if (loc.ip_type === 'dedicated' || loc.ip_type === 'shared') return loc.ip_type;
  const address = ip || loc.ip_address;
  if (!address) return 'shared';
  const users = db.prepare('SELECT COUNT(*) AS c FROM locations WHERE ip_address = ?').get(address).c;
  return users > 1 ? 'shared' : 'dedicated';
}

async function resolveIpv4(hostname) {
  try {
    const result = await dns.lookup(hostname, { family: 4 });
    return result?.address || '';
  } catch {
    return '';
  }
}

/**
 * Probe a single location, persist the result and return the outcome.
 */
export async function checkLocation(loc) {
  if (!loc) throw new Error('Location not found.');
  const rawUrl = (loc.node_url || '').trim();
  if (!rawUrl) return { skipped: true, reason: 'No probe URL configured.' };

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { skipped: true, reason: 'Probe URL is not valid.' };
  }

  const started = Date.now();
  let httpStatus = 0;
  let ok = false;
  let detail = '';
  let cloudflare = 0;
  let resolvedIp = '';

  const hostname = url.hostname;
  const local = isLocalHost(hostname);
  if (!local) resolvedIp = await resolveIpv4(hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'SwiftCloud-NodeMonitor/1.0' },
    });
    httpStatus = response.status;
    ok = response.status >= 200 && response.status < 400;

    const headers = response.headers;
    const server = (headers.get('server') || '').toLowerCase();
    const cfRay = headers.get('cf-ray');
    const cfCache = headers.get('cf-cache-status');
    cloudflare = cfRay || cfCache || server.includes('cloudflare') ? 1 : 0;
    if (!cloudflare && resolvedIp && isCloudflareIp(resolvedIp)) cloudflare = 1;

    if (local) {
      detail = ok
        ? `Localhost endpoint reachable${cloudflare ? ' behind Cloudflare tunnel' : ''}`
        : `Localhost responded ${response.status}`;
    } else {
      detail = ok ? `HTTP ${response.status}` : `HTTP ${response.status} (not healthy)`;
    }
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    detail = aborted ? `Timed out after ${CHECK_TIMEOUT_MS} ms` : (err?.message || 'Connection failed');
    ok = false;
  } finally {
    clearTimeout(timer);
  }

  const responseMs = Date.now() - started;
  if (!cloudflare && resolvedIp && isCloudflareIp(resolvedIp)) cloudflare = 1;

  const ipType = resolveIpType(loc, resolvedIp);
  const upCount = (loc.up_count || 0) + (ok ? 1 : 0);
  const downCount = (loc.down_count || 0) + (ok ? 0 : 1);
  const total = upCount + downCount;
  const uptime = total > 0 ? Math.round((upCount / total) * 1000) / 10 : 100;

  db.prepare(`UPDATE locations SET
      up_count = ?, down_count = ?, last_checked_at = datetime('now'),
      last_check_status = ?, last_response_ms = ?, uptime_percent = ?,
      cloudflare = ?, ip_type = ?,
      ip_address = CASE WHEN ip_address = '' THEN ? ELSE ip_address END,
      status = CASE WHEN ? = 1 THEN 'operational' WHEN ? = 0 THEN 'offline' ELSE status END,
      updated_at = datetime('now')
    WHERE id = ?`).run(
    upCount, downCount, ok ? 'up' : 'down', responseMs, uptime,
    cloudflare, ipType, resolvedIp,
    ok ? 1 : 0, ok ? 1 : 0,
    loc.id,
  );

  db.prepare(`INSERT INTO location_checks (location_id, ok, response_ms, http_status, cloudflare, resolved_ip, detail)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(loc.id, ok ? 1 : 0, responseMs, httpStatus, cloudflare, resolvedIp, detail);

  db.prepare(`DELETE FROM location_checks WHERE location_id = ? AND id NOT IN (
      SELECT id FROM location_checks WHERE location_id = ? ORDER BY id DESC LIMIT 200)`).run(loc.id, loc.id);

  const updated = db.prepare('SELECT * FROM locations WHERE id = ?').get(loc.id);
  return {
    skipped: false,
    ok,
    response_ms: responseMs,
    http_status: httpStatus,
    cloudflare: !!cloudflare,
    resolved_ip: resolvedIp,
    ip_type: ipType,
    detail,
    location: decorateLocation(updated),
  };
}

/** Check every location whose interval has elapsed. */
export async function runDueChecks({ force = false } = {}) {
  const rows = db.prepare("SELECT * FROM locations WHERE check_enabled = 1 AND node_url != ''").all();
  const results = [];
  for (const loc of rows) {
    if (!force) {
      const interval = Math.max(1, loc.check_interval_minutes || 5);
      if (loc.last_checked_at) {
        const last = Date.parse(normalizeSqlDate(loc.last_checked_at));
        if (Number.isFinite(last) && Date.now() - last < interval * 60_000) continue;
      }
    }
    try {
      results.push(await checkLocation(loc));
    } catch (err) {
      results.push({ skipped: true, reason: err.message });
    }
  }
  return results;
}

let schedulerHandle = null;

/** Start the background scheduler (idempotent). */
export function startMonitor(intervalMs = 60_000) {
  if (schedulerHandle) return;
  schedulerHandle = setInterval(() => {
    runDueChecks().catch(() => { /* never crash the API on a probe error */ });
  }, intervalMs);
  if (typeof schedulerHandle.unref === 'function') schedulerHandle.unref();
  setTimeout(() => runDueChecks().catch(() => {}), 5_000).unref?.();
}

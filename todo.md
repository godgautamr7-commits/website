# Node Monitoring Upgrade

## Backend data model
- [x] Add columns: node_url, ip_address, ip_type, cloudflare, check_enabled, interval, up_count, down_count, last_checked_at, last_check_status, last_response_ms, uptime_percent, maintenance_until, maintenance_note
- [x] Add location_checks history table
- [x] Seed node_url/ip for existing locations

## Monitor engine
- [x] server/src/monitor.js: HTTP probe with timeout, Cloudflare header detection, IPv4 resolve, shared/dedicated detection
- [x] runDueChecks scheduler + manual check endpoints
- [x] Effective status (maintenance window override)

## API
- [x] Extend admin validateLocation + check routes + history
- [x] Public /locations returns uptime, cloudflare, ip_type, maintenance

## UI
- [x] Admin LocationsManager: URL/IP fields, check now, uptime %, up/down counts, maintenance window
- [x] Dashboard node card: uptime, up/down, cloudflare badge, maintenance countdown
- [x] Public status page: same detail

## Verify
- [x] Build, API test, screenshots, zip

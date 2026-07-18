// Metro config with a DEV-ONLY reverse proxy: /api/* and /m/* on Metro's own
// port are forwarded to the opentxt server (localhost:3000 by default).
//
// Why: a physical device can only call the API if it can reach the Mac — LAN
// IPs get blocked by firewalls, localhost points at the phone, and asking
// contributors to reconfigure their machine is hostile. Riding Metro's origin
// collapses the problem: if the phone can load the JS bundle (the one
// connection Expo already solves portably, including `expo start --tunnel`
// through any firewall/network), it can reach the API too. The app derives
// its base URL from the bundle origin (see src/lib/api.ts), so there is
// nothing to configure.
const { getDefaultConfig } = require("expo/metro-config")
const http = require("node:http")

const config = getDefaultConfig(__dirname)

const API_PORT = Number(process.env.OPENTXT_API_PORT ?? 3000)
const PROXIED_PREFIXES = ["/api/", "/m/"]

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    const url = req.url ?? ""
    if (!PROXIED_PREFIXES.some((p) => url.startsWith(p))) {
      return middleware(req, res, next)
    }
    const proxied = http.request(
      // agent:false = a fresh socket per request. Node's default agent pools
      // keep-alive sockets, and a pooled socket to a restarted server dies on
      // reuse; a dev proxy doesn't need pooling.
      { host: "127.0.0.1", port: API_PORT, path: url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${API_PORT}` }, agent: false },
      (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, upstream.headers)
        upstream.pipe(res) // streams SSE chunks through unbuffered
        upstream.on("error", () => res.destroy())
      },
    )
    // Every stream in the chain needs an error handler: an unhandled 'error'
    // event is a THROW in node and takes the whole Metro process down
    // (observed: first ECONNREFUSED killed the dev server).
    proxied.on("error", () => {
      if (res.headersSent) {
        res.destroy()
        return
      }
      res.writeHead(502, { "content-type": "application/json" })
      res.end(JSON.stringify({ error: `opentxt server not reachable on localhost:${API_PORT} — is \`pnpm dev\` running in opentxt/server?` }))
    })
    req.on("error", () => proxied.destroy())
    res.on("error", () => proxied.destroy())
    req.pipe(proxied)
  },
}

module.exports = config

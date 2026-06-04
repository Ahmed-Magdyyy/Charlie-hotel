module.exports = {
  apps: [
    {
      name: "charlie",
      script: "src/app/server.js",
      node_args: "--max-old-space-size=300",

      // ── Memory safety net ──
      // Auto-restart when the process exceeds 300 MB RSS.
      // On a 1 GB RAM + 2 GB swap server this keeps ~650 MB
      // free for the OS, MongoDB, and other services.
      max_memory_restart: "300M",

      // ── Restart behaviour ──
      autorestart: true,
      max_restarts: 15,
      min_uptime: "10s",
      restart_delay: 3000,           // 3 s cool-down between restarts
      exp_backoff_restart_delay: 100, // exponential back-off on crash loops

      // ── Environment ──
      env: {
        NODE_ENV: "development",
        PORT: 3002,
      },

      // ── Logging ──
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/charlie-error.log",
      out_file: "logs/charlie-out.log",
      merge_logs: true,

      // ── Monitoring ──
      watch: false,      // don't file-watch in production
      listen_timeout: 8000,
      kill_timeout: 5000,
    },
  ],
};

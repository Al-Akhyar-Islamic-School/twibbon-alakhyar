// PM2 process definition for Twibbon Al Akhyar on the VPS.
// CloudPanel's Node.js site reverse-proxies to this port (set the same port
// in the CloudPanel site settings). Start with:  pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'twibbon-alakhyar',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        // Must match the "App Port" configured for this site in CloudPanel.
        // 3000 & 3010 sudah dipakai app lain di VPS ini → gunakan 3011.
        PORT: 3011,
      },
    },
  ],
};

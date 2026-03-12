module.exports = {
  apps: [
    {
      name: 'takenotes-api',
      script: 'dist/index.js',
      cwd: '/root/TakeNotes/apps/api',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}

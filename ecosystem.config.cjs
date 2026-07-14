module.exports = {
  apps: [
    {
      name: 'shiprocket-whatsapp-bot',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 10000,
      time: true
    }
  ]
};

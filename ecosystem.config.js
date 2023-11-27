module.exports = {
  apps: [{
    name: "email_v2",
    script: './mail.js',
    env: {
      NODE_ENV: "production"
    },
    restart_delay: 10000
  }]
};

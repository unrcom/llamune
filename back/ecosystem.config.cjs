module.exports = {
  apps: [
    {
      name: 'llamune-back',
      script: './start.sh',
      cwd: '/Users/mini/dev/llamune/back',
      interpreter: 'bash',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

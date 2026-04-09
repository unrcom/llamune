module.exports = {
  apps: [
    {
      name: 'llamune-front',
      script: 'npm',
      args: 'run dev -- --host',
      cwd: '/Users/mini/dev/llamune/web',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};

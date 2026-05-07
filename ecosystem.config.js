module.exports = {
  apps: [
    {
      name: "drone-vault-backend",
      cwd: "./drone-vault-backend",
      script: "npm",
      args: "run dev",
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "drone-vault-frontend",
      cwd: "./drone-vault-frontend",
      script: "npm",
      args: "run dev",
      env: {
        NODE_ENV: "development",
      }
    }
  ]
};

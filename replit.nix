{ pkgs }: {
  deps = [
    pkgs.nodejs_22
    pkgs.nodePackages.nodemon
    pkgs.git
    pkgs.bash
    pkgs.wget
  ];

  env = {
    NODE_ENV = "development";
    PORT = "3000";
    PUBLIC_MODE = "false";
    ADMIN_SECRET = "cosmic-secure-default";
  };

  # ✨ Cosmic Boot Logs
  shellHook = ''
    echo "🚀 Starting Cosmic Dashboard V6.8.5 (Node 22)"
    echo "Node.js: $(node -v)"
    echo "NPM: $(npm -v)"
    echo "💡 Use 'npm run dev' for live development or 'npm start' for production"
    mkdir -p logs plugins telemetry data/logs
  '';
}
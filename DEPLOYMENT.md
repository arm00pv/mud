# MUD Game Deployment Guide

This guide provides step-by-step instructions for deploying the AI-Generated MUD game to a web server. The game consists of two main parts:

1.  **Frontend:** A set of static files (HTML, CSS, JavaScript, and JSON) that make up the game client.
2.  **Backend:** A Node.js server that handles user authentication and game state persistence.

## Prerequisites

*   A web server with shell access (e.g., a VPS running a Linux distribution).
*   Node.js and npm installed on the server.
*   A web server software like Nginx or Apache.

## Deployment Steps

### 1. Upload Game Files

Transfer the entire project directory (including the `mud` and `server` subdirectories) to your web server. You can use tools like `scp` or `rsync` for this.

### 2. Set Up the Backend

The backend server is responsible for managing user accounts and saving game progress.

1.  **Navigate to the server directory:**
    ```bash
    cd /path/to/your/project/server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    The server requires a `JWT_SECRET` for signing authentication tokens. You should set this in your environment. For example, you can add it to your shell's startup file (e.g., `~/.bashrc` or `~/.profile`):
    ```bash
    export JWT_SECRET='your_super_secret_and_long_random_string'
    ```
    Make sure to source the file (`source ~/.bashrc`) or log out and back in for the change to take effect.

4.  **Start the server:**
    It's recommended to use a process manager like `pm2` to keep the server running in the background. `pm2` will automatically use the environment variables you've set.
    ```bash
    npm install -g pm2
    pm2 start server.js --name "mud-backend"
    ```
    The backend server will start on port 3000 by default.

### 3. Set Up the Frontend

The frontend consists of static files that need to be served by a web server.

1.  **Configure your web server (e.g., Nginx) to serve the frontend files.**
    Create a new server block in your Nginx configuration:
    ```nginx
    server {
        listen 80;
        server_name your_domain.com;

        root /path/to/your/project/mud;
        index index.html;

        location / {
            try_files $uri $uri/ =404;
        }

        location /api/ {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    This configuration serves the static files from the `mud` directory and proxies all API requests (`/api/...`) to the backend server running on port 3000.

2.  **Reload your web server configuration:**
    ```bash
    sudo systemctl reload nginx
    ```

### 4. Access the Game

You should now be able to access the game by navigating to `http://your_domain.com` in your web browser.

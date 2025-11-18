# Deployment Guide for AI-Generated MUD

This guide provides comprehensive instructions for deploying the AI-Generated MUD game on a Linux server (e.g., Digital Ocean LAMP stack), making it accessible at a public URL like `https://your-domain.com/mud`.

## 1. Prerequisites

Ensure your server has the following software installed.

### a. Node.js and npm
The backend is a Node.js application. The recommended way to install it is via NodeSource.
```bash
# Run these commands as a user with sudo privileges
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### b. PM2 (Process Manager)
PM2 is a production-grade process manager for Node.js. It will keep the backend server running continuously and restart it automatically after a server reboot.
```bash
sudo npm install -g pm2
```

### c. Git
Git is required to clone the repository from its source.
```bash
sudo apt-get install -y git
```

## 2. Clone the Repository

Clone the game's repository into a suitable directory. The standard for web content on Apache is `/var/www/`. We will use `/var/www/webhost/` as the base directory.
```bash
# Navigate to the parent directory
cd /var/www/webhost

# Clone the repository into a 'mud' folder
git clone <YOUR_REPOSITORY_URL> mud
```
_Replace `<YOUR_REPOSITORY_URL>` with the actual URL of your GitHub repository._

## 3. Configure the Backend

The backend requires Node.js dependencies and several environment variables to function correctly.

### a. Install Dependencies
Navigate to the server directory and install the required npm packages.
```bash
cd /var/www/webhost/mud/server
npm install
```
_This command reads the `package.json` file and installs necessary libraries like Express, ws, and the Mailjet SDK._

### b. Set Environment Variables
The server needs several secret keys and configuration variables. The best practice is to store these in your shell's environment to keep them out of the codebase.

Edit your user's shell profile file (e.g., `~/.bashrc` or `~/.profile`):
```bash
nano ~/.bashrc
```

Add the following lines to the end of the file. **It is critical that you replace the placeholder values with your actual credentials and secrets.**
```bash
# --- MUD Game Configuration ---

# The full public URL where the game will be accessed by players.
# This is crucial for generating correct email verification links.
export BASE_URL='https://your-domain.com'

# A long, random, and secret string for signing security tokens (JWTs).
# Generate one with: openssl rand -base64 32
export JWT_SECRET='your_super_secret_and_long_random_string'

# Your Mailjet API credentials for sending verification emails.
# Retrieve these from your Mailjet account dashboard.
export MAILJET_API_KEY='your_mailjet_public_api_key'
export MAILJET_SECRET_KEY='your_mailjet_secret_api_key'
export MAILJET_SENDER_EMAIL='your_verified_sender_email@yourdomain.com'

# The local port the Node.js server will run on. Apache will proxy requests to this port.
# The default is 3002. You only need to change this if port 3002 is already in use.
export PORT='3002'
```

Save the file (`CTRL+X`, then `Y`, then `Enter`) and load the new variables into your current shell session:
```bash
source ~/.bashrc
```

### c. Start the Backend with PM2
From the `/var/www/webhost/mud/server` directory, start the backend server using PM2.
```bash
# Make sure you are in the /var/www/webhost/mud/server directory
pm2 start server.js --name "mud-backend"

# Save the current process list so it will restart on server reboot
pm2 save

# Generate and configure the PM2 startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```
You can check the status and logs of the backend at any time with `pm2 status` and `pm2 logs mud-backend`.

## 4. Configure Apache as a Reverse Proxy

Apache will serve the game's static frontend files (HTML, CSS, JS) and act as a **reverse proxy**, forwarding dynamic requests (API calls and WebSocket connections) to the Node.js backend.

### a. Enable Required Apache Modules
For the reverse proxy to function correctly, several Apache modules must be enabled. **This is a critical step.**
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo a2enmod headers
```
*   `proxy` & `proxy_http`: Allow Apache to forward standard HTTP requests.
*   `proxy_wstunnel`: Allows Apache to forward WebSocket connections, which is essential for real-time gameplay.
*   `rewrite`: Allows for URL rewriting, which we use to separate API/WebSocket traffic from static file requests.
*   **`headers`**: This is **CRITICAL** for the registration process. Without it, Apache may strip the `Content-Type: application/json` header from API requests, causing the backend to fail to parse the request body and leading to persistent "Username already exists" errors.

### b. Edit the Apache Virtual Host File
Open your site's Apache configuration file. This is typically an SSL-enabled virtual host file.
```bash
sudo nano /etc/apache2/sites-enabled/your-site-config-le-ssl.conf
```

Inside the `<VirtualHost *:443>` block, add the following configuration. The order of the `RewriteRule` directives is crucial for them to work together correctly.
```apache
    # --- MUD Game Configuration ---
    # The ordering of these rules is critical. WebSocket traffic is handled first,
    # then API traffic, and finally static file requests.

    RewriteEngine On

    # 1. WebSocket Proxy: This rule intercepts WebSocket upgrade requests based on the
    #    Upgrade header and proxies them to the Node.js WebSocket server.
    #    [P,L] means Proxy and Last rule.
    RewriteCond %{REQUEST_URI} ^/mud/$ [NC]
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/mud/(.*) ws://localhost:3002/$1 [P,L]

    # 2. API Proxy: This rule intercepts any requests to the /mud/api/ path
    #    and proxies them to the Node.js HTTP server.
    RewriteRule ^/mud/api/(.*)$ http://127.0.0.1:3002/api/$1 [P,L]

    # 3. Static Files Alias: This rule maps the /mud/ URL path to your
    #    frontend directory. This will only apply to requests that were NOT
    #    matched by the WebSocket or API proxy rules above.
    Alias /mud/ /var/www/webhost/mud/mud/

    # 4. Directory Settings for Static Files: This block tells Apache how to
    #    serve files from the frontend directory.
    <Directory /var/www/webhost/mud/mud>
        # Serve 'index.html' for requests to the directory root (e.g., /mud/).
        DirectoryIndex index.html
        Require all granted
    </Directory>
```

### c. Restart Apache
For the new configuration and enabled modules to take effect, you must restart Apache.
```bash
sudo systemctl restart apache2
```

## 5. You're Live!

The MUD game should now be accessible at `https://your-domain.com/mud`. Open this URL in your browser to start playing.

## 6. Troubleshooting

### a. Persistent "Username already exists" Error on Registration
*   **Symptom**: When trying to register a new account, you repeatedly get an error saying "Username already exists," even for usernames that have never been used.
*   **Cause**: This is almost always caused by the Apache `headers` module being disabled or missing. When disabled, Apache fails to pass the `Content-Type: application/json` header to the backend. The backend's Express server then doesn't know how to parse the JSON request body, and it sees the `username` field as `undefined`. When the database is queried for an `undefined` username, it often finds a match (if any user has ever been created with a missing username), causing the error.
*   **Solution**:
    1.  Ensure the `headers` module is enabled: `sudo a2enmod headers`
    2.  Restart Apache to apply the change: `sudo systemctl restart apache2`

### b. General Debugging
If you encounter other issues, the first step is to check the backend logs in real-time.
```bash
pm2 logs mud-backend
```
This command will display the latest output from the server, including any startup errors, API request logs, or other diagnostic messages. To exit the log view, press `CTRL+C`.

# Deployment Guide for Digital Ocean LAMP Server

This guide provides specific instructions for deploying the AI-Generated MUD game on a Digital Ocean LAMP server, to be hosted at `https://zapp.sytes.net/mud`.

## 1. Prerequisites

Before deploying, ensure your server has the following installed.

### a. Node.js and npm
The backend server runs on Node.js. The recommended way to install it is using NodeSource.

```bash
# Run these commands as a user with sudo privileges
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### b. PM2 (Process Manager)
PM2 is a production process manager for Node.js applications that will keep the backend server running permanently.

```bash
sudo npm install -g pm2
```

### c. Git
To clone the repository from GitHub.
```bash
sudo apt-get install -y git
```

## 2. Clone the Repository

Clone the game's repository into the `/var/www/webhost/mud` directory.

```bash
# Navigate to the parent directory
cd /var/www/webhost

# Clone the repository into a new 'mud' folder
git clone <YOUR_REPOSITORY_URL> mud
```
*Replace `<YOUR_REPOSITORY_URL>` with the actual URL of your GitHub repository.*

## 3. Configure the Backend

The backend requires Node.js dependencies and environment variables to be set up.

### a. Install Dependencies
Navigate to the server directory and install the required npm packages.
```bash
cd /var/www/webhost/mud/server
npm install
```
*(This command reads the `package.json` file and installs all the necessary libraries, including the Mailjet SDK.)*

### b. Set Environment Variables
The server needs several secret keys and configuration variables. The best practice is to add them to your environment.

Edit your user's shell profile file:
```bash
nano ~/.bashrc
```

Add the following lines to the end of the file. **It is critical that you replace the placeholder values.**

```bash
# The full public URL where the game will be accessed.
export BASE_URL='https://zapp.sytes.net'

# A long, random, and secret string for signing security tokens.
# You can generate one with: openssl rand -base64 32
export JWT_SECRET='your_super_secret_and_long_random_string'

# Your Mailjet API credentials for sending verification emails.
# Retrieve these from your Mailjet account dashboard.
export MAILJET_API_KEY='your_mailjet_public_api_key'
export MAILJET_SECRET_KEY='your_mailjet_secret_api_key'
export MAILJET_SENDER_EMAIL='your_verified_sender_email@yourdomain.com'

# The port the Node.js server will run on. Default is 3002.
export PORT='3002'
```

Save the file (`CTRL+X`, then `Y`, then `Enter`) and load the new variables into your current session:
```bash
source ~/.bashrc
```

### c. Start the Backend with PM2
Start the backend server using PM2. It will automatically run in the background and restart on server reboots.

```bash
# Make sure you are still in the /var/www/webhost/mud/server directory
pm2 start server.js --name "mud-backend"

# Save the current process list to have it restart on reboot
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```
*(The long `sudo env...` command sets up the startup script for PM2.)*

You can check the status of the backend at any time with `pm2 status`.

## 4. Configure Apache

You need to tell Apache how to serve the MUD game's static files and how to forward both HTTP API requests and WebSocket traffic to the Node.js backend.

### a. Enable Required Apache Modules
Ensure `mod_proxy`, `mod_proxy_http`, `mod_proxy_wstunnel`, and `mod_rewrite` are enabled.
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
```
*(Note: `proxy_http` is essential for the `RewriteRule` with the `[P]` flag to function correctly.)*

### b. Edit the Apache Configuration File
Open your existing SSL virtual host file for editing:
```bash
sudo nano /etc/apache2/sites-enabled/webhost-le-ssl.conf
```

Inside the `<VirtualHost *:443>` block, add the following configuration snippet. A good place is in **SECTION 2**, alongside your other application proxies.

```apache
    # --- MUD Game ---
    # WebSocket Proxy: Must come before the Alias and Location blocks.
    # --- MUD Game ---
    # The ordering of these rules is critical for them to work together.
    RewriteEngine On

    # 1. WebSocket Proxy: This rule must come first. It intercepts WebSocket upgrade requests
    # and proxies them to the Node.js server. [P,L] means Proxy and Last rule.
    RewriteCond %{REQUEST_URI} ^/mud/$ [NC]
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/mud/(.*) ws://localhost:3002/$1 [P,L]

    # 2. API Proxy: This rule must come second. It intercepts any requests to the API path
    # and proxies them to the Node.js server.
    RewriteRule ^/mud/api/(.*)$ http://127.0.0.1:3002/api/$1 [P,L]

    # 3. Static Files Alias: This rule comes last. It maps the /mud/ URL path to your
    # nested frontend directory. Because the proxy rules come first, this will only apply
    # to requests that are NOT for the API or WebSocket.
    Alias /mud/ /var/www/webhost/mud/mud/
    <Directory /var/www/webhost/mud/mud>
        # This tells Apache to serve 'index.html' when someone visits /mud/
        DirectoryIndex index.html
        Require all granted
    </Directory>
```

### c. Restart Apache
Apply the new configuration by restarting Apache.
```bash
sudo systemctl restart apache2
```

## 5. You're Live!

The MUD game should now be accessible at `https://zapp.sytes.net/mud`. Open this URL in your browser to start playing.

## 6. Troubleshooting

If you encounter issues, the first step is to check the logs for your backend server. You can view the logs in real-time using PM2.

```bash
pm2 logs mud-backend
```

This command will display the latest output from the server, including any error messages or the diagnostic `console.log` messages we've added. To exit the log view, press `CTRL+C`.

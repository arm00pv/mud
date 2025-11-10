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

### b. Edit the Apache Configuration File
Open your existing SSL virtual host file for editing:
```bash
sudo nano /etc/apache2/sites-enabled/webhost-le-ssl.conf
```

Inside the `<VirtualHost *:443>` block, add the following configuration snippet. A good place is in **SECTION 2**, alongside your other application proxies.

```apache
    # --- MUD Game ---
    # WebSocket Proxy: Must come before the Alias and Location blocks.
    # This rule specifically targets WebSocket upgrade requests for the MUD game.
    RewriteEngine On
    RewriteCond %{REQUEST_URI} ^/mud/$ [NC]
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/mud/(.*) ws://localhost:3000/$1 [P,L]

    # Alias maps the /mud/ URL path to the frontend's directory on the filesystem.
    Alias /mud/ /var/www/webhost/mud/
    <Directory /var/www/webhost/mud>
        Require all granted
    </Directory>

    # This <Location> block proxies API requests from /mud/api/ to the backend server.
    <Location /mud/api/>
        ProxyPass http://127.0.0.1:3000/api/
        ProxyPassReverse http://127.0.0.1:3000/api/
    </Location>
```

### c. Restart Apache
Apply the new configuration by restarting Apache.
```bash
sudo systemctl restart apache2
```

## 5. You're Live!

The MUD game should now be accessible at `https://zapp.sytes.net/mud`. Open this URL in your browser to start playing.

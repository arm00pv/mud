# MUD Game Deployment Instructions

This guide provides the step-by-step instructions to deploy the AI-Generated MUD game to your web server.

## Prerequisites

*   You have shell access (e.g., via SSH) to your web server.
*   You have `sudo` or root privileges to write to the `/var/www/` directory.
*   Your web server (e.g., Apache, Nginx) is configured to serve files from `/var/www/webhost/`.
*   The game files from this repository have been cloned or downloaded to your server's home directory.

## Deployment Steps

Follow these steps carefully to ensure the game is deployed correctly.

### 1. Navigate to the Repository

First, open a terminal on your server and navigate to the directory where you cloned the game repository.

```bash
cd /path/to/your/repository
```

### 2. Prepare the Destination Directory

The game needs to be hosted in `/var/www/webhost/mud/`. We will create this directory and ensure it has the correct permissions.

```bash
sudo mkdir -p /var/www/webhost/mud/
```

### 3. Copy the Game Files

Copy the contents of the `mud/` directory from the repository to the web server's target directory.

**Important:** This command copies the *contents* of the `mud/` directory, not the directory itself.

```bash
sudo cp -r mud/* /var/www/webhost/mud/
```

### 4. Set File Permissions

To ensure the web server can read and serve the files, you need to set the correct ownership and permissions. The `www-data` user and group is standard for Debian/Ubuntu-based web servers like Apache and Nginx.

```bash
sudo chown -R www-data:www-data /var/www/webhost/mud/
sudo chmod -R 755 /var/www/webhost/mud/
```

### 5. Verify the Deployment

The deployment is now complete. You should be able to access the game in your web browser by navigating to:

**http://zapp.sytes.net/mud**

The game should load, and you can begin playing immediately.

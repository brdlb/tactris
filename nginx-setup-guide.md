# Nginx Configuration for tactris.brdlb.com

This nginx configuration is designed to serve the Tactris game application with proper WebSocket support for Socket.IO.

## Features

- **Static File Serving**: Serves React build files from `/var/www/tactris/dist`
- **WebSocket Support**: Properly proxies Socket.IO connections to Node.js backend
- **API Proxying**: Handles REST API requests to the backend
- **SPA Routing**: Supports client-side routing with proper fallback to index.html
- **Gzip Compression**: Optimizes file transfer with compression
- **Security Headers**: Includes security headers for better protection
- **Caching**: Configures appropriate caching for static assets
- **CORS Support**: Includes CORS headers for API requests

## Installation Steps

### 1. Copy the nginx configuration
```bash
sudo cp nginx.conf /etc/nginx/sites-available/tactris
```

### 2. Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/tactris /etc/nginx/sites-enabled/
```

### 3. Test the configuration
```bash
sudo nginx -t
```

### 4. Build your application
```bash
npm run build
```

### 5. Copy built files to nginx directory
```bash
sudo mkdir -p /var/www/tactris
sudo cp -r dist/* /var/www/tactris/dist/
```

### 6. Set proper permissions
```bash
sudo chown -R www-data:www-data /var/www/tactris
sudo chmod -R 755 /var/www/tactris
```

### 7. Create log directory
```bash
sudo mkdir -p /var/log/nginx
sudo touch /var/log/nginx/tactris_access.log
sudo touch /var/log/nginx/tactris_error.log
sudo chown www-data:www-data /var/log/nginx/tactris_*
```

### 8. Start/restart nginx
```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## SSL Configuration

To enable HTTPS, uncomment the SSL server block in the configuration and:

1. Obtain SSL certificates (Let's Encrypt recommended):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tactris.brdlb.com
```

2. Update certificate paths in the configuration if using custom certificates

3. Restart nginx:
```bash
sudo systemctl restart nginx
```

## Backend Setup

Ensure your Node.js application is running:

```bash
# Start the Node.js server
npm start

# Or as a service
sudo systemctl enable node
sudo systemctl start node
```

## Environment Variables

Make sure your Node.js application is configured to:
- Run in production mode: `NODE_ENV=production`
- Use the correct port (default: 3000)
- Handle CORS properly for the domain

## Monitoring

- Access logs: `/var/log/nginx/tactris_access.log`
- Error logs: `/var/log/nginx/tactris_error.log`
- Nginx status: `sudo systemctl status nginx`

## Troubleshooting

1. **WebSocket connection fails**: Check that the backend is running on port 3000
2. **Static files not loading**: Verify the path `/var/www/tactris/dist` contains your built files
3. **502 Bad Gateway**: Check that your Node.js backend is running and accessible
4. **CORS errors**: Ensure the backend allows requests from your domain

## File Structure Expected

```
/var/www/tactris/dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── other static assets
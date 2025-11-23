#!/bin/bash

# Tactris Deployment Script
# This script automates the deployment of Tactris game application

set -e  # Exit on any error

DOMAIN="tactris.brdlb.com"
APP_DIR="/var/www/tactris"
NGINX_AVAILABLE="/etc/nginx/sites-available/tactris"
NGINX_ENABLED="/etc/nginx/sites-enabled/tactris"
SERVICE_FILE="tactris.service"

echo "🚀 Starting Tactris deployment for $DOMAIN..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

echo "📦 Step 1: Installing dependencies..."
apt update
apt install -y nginx nodejs npm

echo "🔨 Step 2: Building application..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in current directory"
    exit 1
fi

npm install
npm run build

echo "📁 Step 3: Creating application directory..."
mkdir -p $APP_DIR
cp -r dist/* $APP_DIR/
cp -r src $APP_DIR/
cp package.json $APP_DIR/
cp -r node_modules $APP_DIR/ 2>/dev/null || echo "⚠️  Copying node_modules skipped"

echo "🔧 Step 4: Setting up nginx configuration..."
cp nginx.conf $NGINX_AVAILABLE

# Enable site
if [ -L $NGINX_ENABLED ]; then
    echo "Site already enabled, removing old symlink..."
    rm $NGINX_ENABLED
fi
ln -s $NGINX_AVAILABLE $NGINX_ENABLED

# Remove default site
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

echo "🔍 Step 5: Testing nginx configuration..."
nginx -t

echo "📝 Step 6: Setting up systemd service..."
cp $SERVICE_FILE /etc/systemd/system/
systemctl daemon-reload

echo "🔐 Step 7: Setting file permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

echo "📊 Step 8: Creating log files..."
mkdir -p /var/log/nginx
touch /var/log/nginx/tactris_access.log
touch /var/log/nginx/tactris_error.log
chown www-data:www-data /var/log/nginx/tactris_*

echo "🔄 Step 9: Starting services..."
systemctl enable nginx
systemctl restart nginx

systemctl enable tactris.service
systemctl start tactris.service

echo "✅ Step 10: Checking service status..."
echo "Nginx status:"
systemctl status nginx --no-pager -l

echo -e "\nTactris service status:"
systemctl status tactris.service --no-pager -l

echo -e "\n🌐 Deployment completed!"
echo "Your application should be available at: http://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  - Check nginx status: sudo systemctl status nginx"
echo "  - Check app status: sudo systemctl status tactris"
echo "  - View logs: sudo tail -f /var/log/nginx/tactris_access.log"
echo "  - Restart app: sudo systemctl restart tactris"
echo "  - Restart nginx: sudo systemctl restart nginx"

# Check if everything is working
echo -e "\n🔍 Testing endpoints..."

# Test HTTP
if curl -f -s http://$DOMAIN > /dev/null; then
    echo "✅ HTTP endpoint is working"
else
    echo "❌ HTTP endpoint is not responding"
fi

# Test health endpoint
if curl -f -s http://$DOMAIN/health > /dev/null; then
    echo "✅ Health endpoint is working"
else
    echo "⚠️  Health endpoint might not be available yet"
fi

echo -e "\n🎉 Deployment script completed!"
#!/bin/bash

# PHP Installation Script for Ubuntu/Debian
# Run this script with: bash install-php.sh

echo "Installing PHP and required extensions for Laravel..."

# Update package list
sudo apt update

# Install PHP 8.3 and required extensions (Ubuntu 24.04 default)
sudo apt install -y php8.3 php8.3-cli php8.3-common php8.3-mysql php8.3-zip \
    php8.3-gd php8.3-mbstring php8.3-curl php8.3-xml php8.3-bcmath

# Verify installation
echo ""
echo "PHP version:"
php -v

echo ""
echo "Installed PHP extensions:"
php -m

echo ""
echo "Installing Composer..."

# Install Composer
if [ ! -f /usr/local/bin/composer ]; then
    cd /tmp
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    sudo chmod +x /usr/local/bin/composer
fi

echo ""
echo "Composer version:"
composer --version

echo ""
echo "✅ PHP and Composer installation complete!"
echo ""
echo "Next steps:"
echo "1. cd laravel-backend"
echo "2. composer install"
echo "3. cp .env.example .env"
echo "4. php artisan key:generate"
echo "5. Configure database in .env"
echo "6. php artisan migrate"


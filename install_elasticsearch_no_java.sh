#!/bin/bash
# Elasticsearch Installation Script for SafeShipper (Java already installed)
# This script installs Elasticsearch 8.x on Ubuntu 24.04

set -e  # Exit on error

echo "=== Elasticsearch Installation Script (Java 8 already installed) ==="
echo ""

# Step 1: Install required packages
echo "Step 1: Installing required packages..."
sudo apt update
sudo apt install -y wget apt-transport-https gnupg

# Step 2: Add Elasticsearch repository
echo ""
echo "Step 2: Adding Elasticsearch repository..."
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Step 3: Install Elasticsearch
echo ""
echo "Step 3: Installing Elasticsearch..."
sudo apt update
sudo apt install -y elasticsearch

# Step 4: Configure Elasticsearch for development
echo ""
echo "Step 4: Configuring Elasticsearch for development..."
sudo cp /etc/elasticsearch/elasticsearch.yml /etc/elasticsearch/elasticsearch.yml.backup

# Create a development-friendly configuration
sudo tee /etc/elasticsearch/elasticsearch.yml > /dev/null << 'EOF'
# ======================== Elasticsearch Configuration =========================
#
# NOTE: This configuration is for development only. Do not use in production!
#
# ---------------------------------- Cluster -----------------------------------
cluster.name: safeshipper-dev

# ------------------------------------ Node ------------------------------------
node.name: node-1

# ----------------------------------- Paths ------------------------------------
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# ----------------------------------- Memory -----------------------------------
# Lock memory on startup (disable for development)
#bootstrap.memory_lock: true

# ---------------------------------- Network -----------------------------------
network.host: localhost
http.port: 9200

# --------------------------------- Discovery ----------------------------------
discovery.type: single-node

# ---------------------------------- Security ----------------------------------
# Disable security features for development
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false

# ----------------------------------- Other ------------------------------------
# Allow automatic index creation
action.auto_create_index: true
EOF

# Step 5: Configure JVM options for Java 8 compatibility
echo ""
echo "Step 5: Configuring JVM options for Java 8..."
sudo tee /etc/elasticsearch/jvm.options.d/java8.options > /dev/null << 'EOF'
# Java 8 compatibility settings
-Djava.awt.headless=true
-Dfile.encoding=UTF-8
-Djdk.io.permissionsUseCanonicalPath=true
EOF

# Step 6: Start and enable Elasticsearch
echo ""
echo "Step 6: Starting Elasticsearch service..."
sudo systemctl daemon-reload
sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch

# Wait for Elasticsearch to start
echo "Waiting for Elasticsearch to start (this may take 30-60 seconds)..."
for i in {1..30}; do
    if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
        echo "Elasticsearch is up!"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# Step 7: Verify installation
echo ""
echo "Step 7: Verifying installation..."
echo "Elasticsearch version:"
curl -s http://localhost:9200/ | grep -E '"version"|"number"' || echo "Failed to connect to Elasticsearch"

echo ""
echo "Cluster health:"
curl -s http://localhost:9200/_cluster/health?pretty || echo "Failed to get cluster health"

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Elasticsearch is now installed and running on http://localhost:9200"
echo ""
echo "To check the service status, run: sudo systemctl status elasticsearch"
echo "To view logs, run: sudo journalctl -u elasticsearch -f"
echo ""
echo "Next steps:"
echo "1. Update your SafeShipper .env file with ELASTICSEARCH_HOST=localhost:9200"
echo "2. Run Django migrations if needed"
echo "3. Create Elasticsearch indices for your models"
#!/bin/bash

# Proxmox LXC Docker Deployment Script
# STRICTLY follows requirements: Auto-download template, Port 9090, 20GB persistent storage, Docker+Nesting+Keyctl

set -e

# Configuration
CTID=$(pvesh get /cluster/nextid)
STORAGE="local-lvm"
TEMPLATE_STORAGE="local"
TEMPLATE_SEARCH="ubuntu-22.04-standard"
APP_DIR="/opt/myapp"
DISK_SIZE="20" # 20GB rootfs

echo "==========================================================="
echo " Starting Automated Proxmox LXC Docker Deployment"
echo " Target Container ID: $CTID"
echo "==========================================================="

# 1. OS Template Auto-Download
echo "[1/5] Checking for OS Template..."
pveam update >/dev/null 2>&1
TEMPLATE_FILE=$(pveam available | grep "$TEMPLATE_SEARCH" | awk '{print $2}' | sort -V | tail -n 1)

if [ -z "$TEMPLATE_FILE" ]; then
    echo "Error: Could not find template matching $TEMPLATE_SEARCH"
    exit 1
fi

TEMPLATE_FILENAME=$(basename "$TEMPLATE_FILE")
TEMPLATE_PATH="/var/lib/vz/template/cache/$TEMPLATE_FILENAME"

if [ ! -f "$TEMPLATE_PATH" ]; then
    echo "Template not found locally. Downloading $TEMPLATE_FILE..."
    pveam download "$TEMPLATE_STORAGE" "$TEMPLATE_FILE"
else
    echo "Template $TEMPLATE_FILENAME already exists in local storage."
fi

# 2 & 3. Create LXC with Persistent Storage, Nesting, and Keyctl
echo "[2/5] Creating LXC Container $CTID..."
pct create "$CTID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE_FILENAME" \
    --arch amd64 \
    --hostname docker-app \
    --rootfs "$STORAGE:$DISK_SIZE" \
    --memory 2048 \
    --cores 2 \
    --ostype ubuntu \
    --unprivileged 1 \
    --features nesting=1,keyctl=1 \
    --net0 name=eth0,bridge=vmbr0,ip=dhcp

echo "[3/5] Starting LXC Container $CTID..."
pct start "$CTID"

# Wait for network and boot
echo "Waiting for container to boot and acquire IP..."
sleep 15

# 4. Install Docker inside LXC
echo "[4/5] Installing Docker and Docker Compose inside LXC..."
pct exec "$CTID" -- bash -c "apt-get update && apt-get install -y curl ca-certificates"
pct exec "$CTID" -- bash -c "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
pct exec "$CTID" -- bash -c "apt-get install -y docker-compose-plugin"

# 5. Set up App Directory and Port Configuration (9090:80)
echo "[5/5] Setting up persistent app directory and docker-compose.yml..."
pct exec "$CTID" -- bash -c "mkdir -p $APP_DIR/data"

pct exec "$CTID" -- bash -c "cat << 'EOF' > $APP_DIR/docker-compose.yml
version: '3.8'
services:
  app:
    image: nginx:latest # Replace with your actual application image
    ports:
      - '9090:80' # Port 9090 on host to avoid 8080 conflicts
    volumes:
      - ./data:/app/data # Persistent data mapped to the LXC local storage
    restart: unless-stopped
EOF"

# Get Container IP
CT_IP=$(pct exec "$CTID" -- ip -4 addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')

echo "==========================================================="
echo " Deployment Complete! "
echo "==========================================================="
echo "Container ID : $CTID"
echo "Container IP : $CT_IP"
echo "App Directory: $APP_DIR (Inside Container)"
echo ""
echo "--- INSTRUCTIONS ---"
echo "1. Transfer your application files to the container's persistent directory:"
echo "   Run this on your Proxmox host:"
echo "   pct push $CTID /path/to/your/local/app/files $APP_DIR/"
echo ""
echo "2. Edit the docker-compose.yml to use your specific image (if needed):"
echo "   pct exec $CTID -- nano $APP_DIR/docker-compose.yml"
echo ""
echo "3. Run your Dockerized application:"
echo "   pct exec $CTID -- bash -c 'cd $APP_DIR && docker compose up -d'"
echo ""
echo "Your app will be accessible at: http://$CT_IP:9090"
echo "==========================================================="

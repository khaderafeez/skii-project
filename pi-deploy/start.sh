#!/bin/bash
echo "Loading Docker Images..."
sudo docker load -i skii-backend.tar
sudo docker load -i skii-frontend.tar

echo "Starting Application..."
sudo docker compose up -d

echo "Deployment Complete!"
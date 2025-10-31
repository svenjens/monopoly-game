#!/bin/bash

# Monopoly Game - AWS Deployment Script
# This script builds Docker images and pushes them to ECR

set -e

echo "🚀 Monopoly Game - AWS Deployment Script"
echo "========================================="

# Configuration
AWS_REGION="${AWS_REGION:-eu-west-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT_NAME="monopoly-game"

# Get ECR repository URLs from Terraform output
echo "📋 Getting ECR repository URLs..."
cd terraform
BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url 2>/dev/null || echo "")
REDIS_REPO=$(terraform output -raw ecr_redis_repository_url 2>/dev/null || echo "")
cd ..

if [ -z "$BACKEND_REPO" ] || [ -z "$REDIS_REPO" ]; then
    echo "❌ Error: Could not get ECR repository URLs from Terraform output"
    echo "Please run 'terraform apply' first in the terraform directory"
    exit 1
fi

echo "✅ Backend ECR: $BACKEND_REPO"
echo "✅ Redis ECR: $REDIS_REPO"

# Login to ECR
echo ""
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push Backend
echo ""
echo "🔨 Building Backend Docker image..."
cd monopoly-backend
docker build -t $PROJECT_NAME-backend:latest .
docker tag $PROJECT_NAME-backend:latest $BACKEND_REPO:latest
docker tag $PROJECT_NAME-backend:latest $BACKEND_REPO:$(date +%Y%m%d-%H%M%S)

echo "⬆️  Pushing Backend image to ECR..."
docker push $BACKEND_REPO:latest
docker push $BACKEND_REPO:$(date +%Y%m%d-%H%M%S)
cd ..

# Build and push Redis
echo ""
echo "🔨 Building Redis Docker image..."
cd monopoly-redis
docker build -t $PROJECT_NAME-redis:latest .
docker tag $PROJECT_NAME-redis:latest $REDIS_REPO:latest
docker tag $PROJECT_NAME-redis:latest $REDIS_REPO:$(date +%Y%m%d-%H%M%S)

echo "⬆️  Pushing Redis image to ECR..."
docker push $REDIS_REPO:latest
docker push $REDIS_REPO:$(date +%Y%m%d-%H%M%S)
cd ..

# Force ECS to redeploy with new images
echo ""
echo "♻️  Forcing ECS service update..."
aws ecs update-service \
    --cluster $PROJECT_NAME-cluster \
    --service $PROJECT_NAME-backend \
    --force-new-deployment \
    --region $AWS_REGION \
    > /dev/null

aws ecs update-service \
    --cluster $PROJECT_NAME-cluster \
    --service $PROJECT_NAME-redis \
    --force-new-deployment \
    --region $AWS_REGION \
    > /dev/null

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Check status with:"
echo "   aws ecs describe-services --cluster $PROJECT_NAME-cluster --services $PROJECT_NAME-backend --region $AWS_REGION"
echo ""
echo "🌐 Your application will be available at:"
cd terraform
terraform output frontend_url
cd ..


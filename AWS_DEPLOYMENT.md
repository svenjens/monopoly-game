# AWS Deployment Guide - Monopoly Game

Complete Infrastructure as Code deployment using Terraform en AWS ECS Fargate.

## 📋 Prerequisites

1. **AWS Account** met voldoende permissies
2. **AWS CLI** geïnstalleerd en geconfigureerd
   ```bash
   aws configure
   ```
3. **Terraform** >= 1.0 geïnstalleerd
4. **Docker** geïnstalleerd
5. **Git repository** geconnecteerd aan GitHub (voor Amplify)

## 🏗️ Architectuur

```
┌─────────────────┐
│  AWS Amplify    │  ← Frontend (Next.js)
│  (Frontend)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Application     │  ← Load Balancer
│ Load Balancer   │     - HTTP/HTTPS (port 80/443)
│                 │     - WebSocket (port 8080)
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌─────────┐
│ Backend │ │  Redis  │  ← ECS Fargate Services
│  ECS    │ │  ECS    │     (Private subnets)
└─────────┘ └─────────┘
```

### Services:
- **Frontend**: AWS Amplify (Next.js SSR)
- **Backend**: ECS Fargate (PHP Symfony + WebSocket)
- **Redis**: ECS Fargate (Redis container)
- **Load Balancer**: ALB met WebSocket support
- **Container Registry**: Amazon ECR
- **Networking**: VPC met public/private subnets, NAT Gateways

## 🚀 Deployment Stappen

### Stap 1: Configureer Terraform

```bash
cd terraform
```

**Voor POC/Development (goedkoop ~$60/maand):**
```bash
# Use POC configuratie
terraform apply -var-file=environments/poc.tfvars
```

**Voor Production (high availability ~$120/maand):**
```bash
# Use Production configuratie
terraform apply -var-file=environments/prod.tfvars
```

**Custom configuratie:**
```bash
# Kopieer voorbeeld en edit
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

**Minimale configuratie:**
```hcl
aws_region  = "eu-west-1"
environment = "poc"
project_name = "monopoly-game"

# Kosten optimalisaties voor POC:
use_single_nat_gateway = true    # Single NAT Gateway
backend_cpu = 256                 # Minimale resources
backend_memory = 512
log_retention_days = 3            # Korte retention
enable_container_insights = false # Disable monitoring
```

**Zie ook**: [COST_OPTIMIZATION.md](../COST_OPTIMIZATION.md) voor kosten details

### Stap 2: Deploy Infrastructure

```bash
# Initialiseer Terraform
terraform init

# Preview de changes
terraform plan

# Deploy! (duurt ~5-10 minuten)
terraform apply
```

Dit creëert:
- ✅ VPC met public/private subnets
- ✅ ECR repositories voor Docker images
- ✅ ECS Cluster en Task Definitions
- ✅ Application Load Balancer
- ✅ Security Groups
- ✅ IAM Roles
- ✅ CloudWatch Log Groups
- ✅ AWS Amplify App

### Stap 3: Build en Push Docker Images

```bash
# Ga terug naar project root
cd ..

# Run deployment script
./scripts/deploy-to-aws.sh
```

Dit script:
1. Haalt ECR repository URLs op uit Terraform
2. Logt in bij ECR
3. Build backend Docker image
4. Build Redis Docker image
5. Pusht images naar ECR
6. Forceert ECS om nieuwe containers te deployen

### Stap 4: Connect GitHub naar Amplify

#### Optie A: Via AWS Console (Recommended)
1. Ga naar [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Selecteer je `monopoly-game-frontend` app
3. Click **Connect branch**
4. Selecteer **GitHub** als provider
5. Authorize AWS Amplify
6. Selecteer je repository: `svenjens/monopoly-game`
7. Selecteer branch: `main`
8. Amplify detecteert automatisch de build settings

#### Optie B: Via Terraform (Update repository URL)

In `terraform/amplify.tf`, update de repository URL en uncomment GitHub settings:

```hcl
resource "aws_amplify_app" "frontend" {
  name       = "${var.project_name}-frontend"
  repository = "https://github.com/svenjens/monopoly-game"
  
  # Uncomment en configureer OAuth token
  # access_token = var.github_token
}
```

Dan run:
```bash
cd terraform
terraform apply
```

### Stap 5: Verificatie

```bash
cd terraform

# Get alle outputs
terraform output

# Specifieke URLs:
echo "Backend API:"
terraform output alb_url

echo "WebSocket:"
terraform output websocket_url

echo "Frontend:"
terraform output frontend_url
```

Test de endpoints:
```bash
# Test backend health
curl $(terraform output -raw alb_url)/api/games

# Check ECS services
aws ecs describe-services \
  --cluster monopoly-game-cluster \
  --services monopoly-game-backend \
  --region eu-west-1
```

## 🔄 Updates Deployen

### Automatisch via GitHub Actions (Recommended)

Setup GitHub Secrets (zie `.github/workflows/README.md`):
```bash
# GitHub Settings → Secrets → Add:
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

**Dan simpelweg push naar main**:
```bash
git add .
git commit -m "feat: nieuwe feature"
git push origin main
# GitHub Actions deploy automatisch! 🚀
```

### Handmatig via Script

```bash
# Build en push nieuwe images
./scripts/deploy-to-aws.sh
```

Het script forceert automatisch een ECS redeploy.

### Frontend Updates

Amplify deployt automatisch bij elke push naar `main` branch.

Monitor de build in Amplify Console.

### Infrastructure Updates

```bash
cd terraform

# Preview changes
terraform plan

# Apply changes
terraform apply
```

## 🔧 Configuratie Details

### Environment Variables

**Backend (ECS Task Definition):**
- `APP_ENV=prod`
- `APP_DEBUG=0`
- `REDIS_HOST=redis.monopoly-game.local` (Service Discovery)
- `REDIS_PORT=6379`
- `WEBSOCKET_PORT=8080`

**Frontend (Amplify):**
- `NEXT_PUBLIC_API_URL` (automatisch gezet via Terraform output)
- `NEXT_PUBLIC_WS_URL` (automatisch gezet via Terraform output)
- `NODE_ENV=production`

### Scaling

**Manual scaling:**
```bash
cd terraform

# Edit terraform.tfvars
backend_desired_count = 2  # Scale to 2 instances

# Apply
terraform apply
```

**Auto-scaling** (optioneel toevoegen):
Voeg een `autoscaling.tf` file toe met:
```hcl
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

### Kosten Optimalisatie

**Development/Testing:**
```hcl
backend_cpu    = 256  # 0.25 vCPU
backend_memory = 512  # 512 MB
redis_cpu      = 256
redis_memory   = 512
```

**Production:**
```hcl
backend_cpu    = 512  # 0.5 vCPU
backend_memory = 1024 # 1 GB
redis_cpu      = 256
redis_memory   = 512
```

## 📊 Monitoring

### CloudWatch Logs

```bash
# Backend logs
aws logs tail /ecs/monopoly-game-backend --follow

# Redis logs
aws logs tail /ecs/monopoly-game-redis --follow
```

### ECS Service Status

```bash
aws ecs describe-services \
  --cluster monopoly-game-cluster \
  --services monopoly-game-backend monopoly-game-redis \
  --region eu-west-1
```

### Amplify Build Status

```bash
aws amplify list-apps --region eu-west-1

# Get specific app builds
aws amplify list-jobs \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region eu-west-1
```

## 🔒 Security Best Practices

1. **Enable HTTPS**: Request ACM certificate en configureer in `terraform.tfvars`
2. **Enable S3 Backend**: Store Terraform state in S3 (uncomment in `main.tf`)
3. **Enable WAF**: Add AWS WAF voor ALB protection
4. **Rotate Secrets**: Use AWS Secrets Manager voor database credentials
5. **Enable VPC Flow Logs**: Voor network monitoring

## 🗑️ Cleanup

**Verwijder alle resources:**
```bash
cd terraform

# Destroy alles (careful!)
terraform destroy
```

**Manual cleanup checklist:**
- [ ] ECR images verwijderen (kunnen niet door Terraform destroyed worden)
- [ ] CloudWatch log groups (optioneel bewaren)
- [ ] S3 buckets (als je S3 backend gebruikt)

## 🐛 Troubleshooting

### ECS Task fails to start

```bash
# Check task logs
aws ecs describe-tasks \
  --cluster monopoly-game-cluster \
  --tasks TASK_ARN \
  --region eu-west-1

# Check CloudWatch logs
aws logs tail /ecs/monopoly-game-backend --follow
```

### WebSocket connection fails

Verify:
1. Security group heeft port 8080 open
2. ALB listener rule voor `/ws*` is actief
3. Target group health checks zijn groen

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN \
  --region eu-west-1
```

### Amplify build fails

Check build logs in Amplify Console:
```bash
aws amplify list-jobs \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region eu-west-1
```

Verify:
- Build spec path correct (`monopoly-frontend/`)
- Environment variables zijn gezet
- GitHub connectie is actief

## 💰 Geschatte Kosten

**Maandelijkse kosten (eu-west-1):**

| Service | Configuratie | Maandelijks |
|---------|--------------|-------------|
| ECS Fargate (Backend) | 0.5 vCPU, 1GB | ~$15 |
| ECS Fargate (Redis) | 0.25 vCPU, 512MB | ~$7 |
| Application Load Balancer | - | ~$20 |
| NAT Gateway (2x) | - | ~$60 |
| Data Transfer | 100GB | ~$9 |
| Amplify | Build + Hosting | ~$5 |
| CloudWatch Logs | 10GB | ~$5 |
| **TOTAAL** | | **~$121/month** |

**Optimalisatie tips:**
- Use Single NAT Gateway (dev): Save $30/month
- Reduce Fargate CPU/Memory (dev): Save $10/month
- Use ElastiCache Redis (prod): Better performance, similar cost

## 📚 Referenties

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Application Load Balancer WebSocket](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/websockets.html)


# 💰 AWS Cost Optimization Guide

Gids voor het minimaliseren van AWS kosten voor Monopoly Game deployment.

## 📊 Kosten Breakdown

### POC/Dev Configuration (~$60/maand)
```
terraform apply -var-file=environments/poc.tfvars
```

| Service | Specificatie | Maandelijks |
|---------|--------------|-------------|
| **ECS Fargate (Backend)** | 0.25 vCPU, 512MB | ~$7 |
| **ECS Fargate (Redis)** | 0.25 vCPU, 512MB | ~$7 |
| **Application Load Balancer** | - | ~$20 |
| **NAT Gateway (1x)** | Single AZ | ~$30 |
| **Data Transfer** | 50GB | ~$5 |
| **CloudWatch Logs** | 5GB, 3 days retention | ~$2 |
| **Amplify** | Build + Hosting | ~$5 |
| **ECR** | 2 repos, <1GB | <$1 |
| **TOTAAL** | | **~$77/maand** |

### Production Configuration (~$120/maand)
```
terraform apply -var-file=environments/prod.tfvars
```

| Service | Specificatie | Maandelijks |
|---------|--------------|-------------|
| **ECS Fargate (Backend x2)** | 0.5 vCPU, 1GB x2 | ~$30 |
| **ECS Fargate (Redis)** | 0.25 vCPU, 512MB | ~$7 |
| **Application Load Balancer** | - | ~$20 |
| **NAT Gateway (2x)** | High Availability | ~$60 |
| **Data Transfer** | 100GB | ~$9 |
| **CloudWatch Logs** | 10GB, 30 days retention | ~$6 |
| **Amplify** | Build + Hosting | ~$5 |
| **ECR** | 2 repos, <2GB | ~$1 |
| **TOTAAL** | | **~$138/maand** |

## 🎯 Optimalisatie Strategieën

### 1. NAT Gateway Optimalisatie (Bespaart: $30/maand)

**POC/Dev**: Single NAT Gateway
```hcl
# environments/poc.tfvars
use_single_nat_gateway = true
```

**Trade-off**: Geen high availability. Als NAT Gateway faalt, geen internet voor private subnets.

**Alternatief**: NAT Instance (goedkoper maar meer onderhoud)
```hcl
# Vervang NAT Gateway door EC2 t4g.nano instance
# Kosten: ~$3/maand (vs $30)
```

### 2. ECS Task Size (Bespaart: $15-20/maand)

**POC/Dev**: Minimale resources
```hcl
backend_cpu    = 256  # 0.25 vCPU
backend_memory = 512  # 512 MB
```

**Wanneer opschalen?**
- Meer dan 10 concurrent spelers
- Response times > 500ms
- CPU usage > 70%

### 3. CloudWatch Logs (Bespaart: $3-5/maand)

**POC/Dev**: Kortere retention
```hcl
log_retention_days = 3
```

**Tip**: Export oude logs naar S3 voor long-term storage:
```bash
aws logs create-export-task \
  --log-group-name /ecs/monopoly-game-backend \
  --from 1609459200000 \
  --to 1640995200000 \
  --destination monopoly-logs-archive
```

### 4. Container Insights (Bespaart: $10/maand)

**POC/Dev**: Disable
```hcl
enable_container_insights = false
```

**Alternatief**: Use CloudWatch Logs + custom metrics

### 5. Fargate Spot (Bespaart: tot 70%)

⚠️ **Experimenteel** - Tasks kunnen worden terminated

```hcl
# In ecs-backend.tf
capacity_provider_strategy {
  capacity_provider = "FARGATE_SPOT"
  weight            = 100
}
```

**Geschikt voor**: Non-critical workloads, dev environments

### 6. Reserved Capacity (Bespaart: 20-50% voor prod)

Voor stable workloads:
- Compute Savings Plans (1 of 3 jaar commitment)
- Geschikt als je weet dat app long-term draait

```bash
# Via AWS Cost Explorer → Savings Plans
```

## 🛠️ Extreme Cost Reduction (< $30/maand)

### Optie A: Lightsail (Simplified)

**AWS Lightsail** voor simple container deployment:
```bash
# Single container bundle: $10/maand
aws lightsail create-container-service \
  --service-name monopoly-game \
  --power micro \
  --scale 1
```

**Trade-offs**:
- Geen auto-scaling
- Geen managed load balancer
- Beperkte monitoring
- Max 1GB RAM

### Optie B: EC2 + Docker Compose

**Single t4g.small** EC2 instance:
```
- Instance: t4g.small ($12/maand, 2 vCPU, 2GB RAM)
- Storage: 30GB EBS ($3/maand)
- Data transfer: Included
TOTAAL: ~$15/maand
```

Deploy via Docker Compose:
```bash
# Install Docker on EC2
ssh ec2-user@<ip>
sudo yum install docker docker-compose
git clone <repo>
docker-compose up -d
```

**Trade-offs**:
- Manual management
- Geen auto-scaling
- Single point of failure
- Manual updates

### Optie C: Free Tier (Eerste 12 maanden)

**AWS Free Tier** includes:
- ✅ 750 uur EC2 t2.micro/t3.micro
- ✅ 25GB ECS Fargate (limited)
- ✅ 5GB CloudWatch Logs
- ✅ 500MB ECR storage

**Geschikt voor**: Eerste jaar, zeer lage traffic

## 📉 Cost Monitoring & Alerts

### Setup Cost Anomaly Detection

```bash
# Via AWS Console
# AWS Cost Management → Cost Anomaly Detection → Create monitor
```

### Setup Budget Alerts

```bash
# Alert bij $50/maand
aws budgets create-budget \
  --account-id <account-id> \
  --budget file://budget.json
```

**budget.json**:
```json
{
  "BudgetName": "MonopolyGameBudget",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### Daily Cost Reports

```bash
# Install aws-cost-reporter
npm install -g aws-cost-reporter

# Run daily
aws-cost-reporter --profile default --region eu-west-1
```

## 🎯 Recommendations per Use Case

### Demo/POC (< 10 users, 1 month)
**Recommendation**: Lightsail of EC2 t4g.small
**Cost**: $10-15/maand
**Setup**: Docker Compose op EC2

### Development (< 50 users, ongoing)
**Recommendation**: Terraform POC config
**Cost**: ~$60/maand
**Setup**: `terraform apply -var-file=environments/poc.tfvars`

### Production (100+ users, 24/7)
**Recommendation**: Terraform Prod config + Savings Plan
**Cost**: ~$80/maand (met Savings Plan)
**Setup**: `terraform apply -var-file=environments/prod.tfvars`

### Enterprise (1000+ users, HA required)
**Recommendation**: Multi-AZ, Auto-scaling, ElastiCache
**Cost**: $200+/maand
**Setup**: Custom Terraform config + RDS/ElastiCache

## 📊 Cost Tracking Checklist

- [ ] Enable AWS Cost Explorer
- [ ] Setup Budget alerts ($50, $75, $100)
- [ ] Enable Cost Anomaly Detection
- [ ] Tag alle resources (`Project=monopoly-game`)
- [ ] Review costs wekelijks
- [ ] Monitor CloudWatch metrics
- [ ] Delete unused ECR images (lifecycle policy)
- [ ] Stop development environment 's nachts (optioneel)

## 🔄 Auto-Scheduling (Extra besparing)

Stop ECS services 's nachts (dev only):

```bash
# Stop om 23:00
aws ecs update-service \
  --cluster monopoly-game-cluster \
  --service monopoly-game-backend \
  --desired-count 0

# Start om 08:00
aws ecs update-service \
  --cluster monopoly-game-cluster \
  --service monopoly-game-backend \
  --desired-count 1
```

**Automatiseer** met EventBridge + Lambda:
- Bespaart ~40% voor dev (16 uur per dag uit)
- Trade-off: Niet 24/7 beschikbaar

## 📚 Resources

- [AWS Pricing Calculator](https://calculator.aws/)
- [Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [Cost Optimization Best Practices](https://aws.amazon.com/architecture/cost-optimization/)
- [AWS Free Tier](https://aws.amazon.com/free/)


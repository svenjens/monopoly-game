# Terraform Configuration - Monopoly Game

Infrastructure as Code voor AWS deployment.

## 📁 File Structuur

```
terraform/
├── main.tf                 # Provider configuratie
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── vpc.tf                  # VPC, subnets, routing
├── security-groups.tf      # Security groups
├── ecr.tf                  # ECR repositories
├── ecs-cluster.tf          # ECS cluster, IAM roles
├── ecs-backend.tf          # Backend ECS service
├── ecs-redis.tf            # Redis ECS service
├── alb.tf                  # Application Load Balancer
├── amplify.tf              # Frontend (Amplify)
├── terraform.tfvars.example # Example configuration
└── .gitignore              # Git ignore patterns
```

## 🚀 Quick Start

```bash
# 1. Copy example config
cp terraform.tfvars.example terraform.tfvars

# 2. Edit configuration
nano terraform.tfvars

# 3. Initialize Terraform
terraform init

# 4. Preview changes
terraform plan

# 5. Deploy
terraform apply
```

## 📝 Configuration

### Required Variables

Configureer in `terraform.tfvars`:

```hcl
aws_region   = "eu-west-1"
environment  = "prod"
project_name = "monopoly-game"
```

### Optional Variables

```hcl
# Network
vpc_cidr = "10.0.0.0/16"

# ECS Resources
backend_cpu           = 512
backend_memory        = 1024
backend_desired_count = 1

redis_cpu    = 256
redis_memory = 512

# Domain & SSL (optional)
domain_name     = "monopoly.example.com"
certificate_arn = "arn:aws:acm:..."
```

## 🔧 Modules

### VPC Module (`vpc.tf`)
- VPC met DNS support
- 2x Public subnets (voor ALB)
- 2x Private subnets (voor ECS)
- Internet Gateway
- 2x NAT Gateways (high availability)
- Route tables

### Security Groups (`security-groups.tf`)
- **ALB SG**: Inbound 80/443, outbound all
- **Backend SG**: Inbound 8000/8080 from ALB, 6379 from self
- **Redis SG**: Inbound 6379 from Backend

### ECR (`ecr.tf`)
- Backend repository
- Redis repository
- Lifecycle policies (keep last 10 images)
- Image scanning enabled

### ECS Cluster (`ecs-cluster.tf`)
- Fargate cluster
- IAM execution role
- IAM task role
- CloudWatch log groups

### Backend Service (`ecs-backend.tf`)
- Task definition (PHP + WebSocket)
- ECS service met 2 load balancers
- Health checks
- Environment variables

### Redis Service (`ecs-redis.tf`)
- Task definition
- ECS service
- Service Discovery (DNS)
- Health checks

### Load Balancer (`alb.tf`)
- Application Load Balancer
- HTTP/HTTPS listeners
- Target groups voor API en WebSocket
- Sticky sessions voor WebSocket
- SSL redirect (optioneel)

### Frontend (`amplify.tf`)
- Amplify app
- Main branch configuration
- Build settings voor Next.js
- Custom domain support (optioneel)

## 📤 Outputs

```bash
# View all outputs
terraform output

# Specific outputs
terraform output alb_url
terraform output frontend_url
terraform output ecr_backend_repository_url
```

### Available Outputs:
- `ecr_backend_repository_url` - Push backend images here
- `ecr_redis_repository_url` - Push Redis images here
- `alb_dns_name` - Load Balancer DNS
- `alb_url` - Full backend API URL
- `websocket_url` - WebSocket connection URL
- `frontend_url` - Frontend application URL
- `amplify_app_id` - Amplify App ID
- `ecs_cluster_name` - ECS Cluster name
- `redis_internal_endpoint` - Internal Redis endpoint
- `vpc_id` - VPC ID

## 🔄 Workflow

### First Deployment
```bash
terraform init
terraform apply
# Wait for infrastructure (~5-10 min)
# Then deploy Docker images (see AWS_DEPLOYMENT.md)
```

### Update Infrastructure
```bash
# Make changes to .tf files or terraform.tfvars
terraform plan    # Preview
terraform apply   # Deploy
```

### Update Application
```bash
# Just rebuild and push Docker images
# (see deploy-to-aws.sh script)
```

### Destroy Everything
```bash
terraform destroy
```

## 🔐 State Management

### Local State (default)
Terraform state is stored locally in `terraform.tfstate`.

**⚠️ Warning**: Commit `.tfstate` files to version control is NOT recommended.

### Remote State (recommended for teams)

Uncomment in `main.tf`:

```hcl
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "monopoly-game/terraform.tfstate"
    region = "eu-west-1"
    
    # Optional: DynamoDB table for state locking
    # dynamodb_table = "terraform-locks"
    # encrypt        = true
  }
}
```

Then:
```bash
terraform init -migrate-state
```

## 🎯 Best Practices

### 1. Use Workspaces voor environments
```bash
terraform workspace new dev
terraform workspace new prod
terraform workspace select dev
```

### 2. Validate voor apply
```bash
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

### 3. Use variables voor alles
Never hardcode values in .tf files.

### 4. Format code
```bash
terraform fmt -recursive
```

### 5. Generate documentation
```bash
# Install terraform-docs
brew install terraform-docs

# Generate docs
terraform-docs markdown table . > TERRAFORM_DOCS.md
```

## 🐛 Common Issues

### Issue: State lock
```bash
# If state is locked and build was cancelled
terraform force-unlock LOCK_ID
```

### Issue: Resource already exists
```bash
# Import existing resource
terraform import aws_vpc.main vpc-abc123
```

### Issue: Capacity error
AWS heeft capacity limits per region. Try:
- Different availability zones
- Different region
- Request limit increase

### Issue: DNS issues
Service Discovery DNS can take 30-60 seconds to propagate.

## 📚 Terraform Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)


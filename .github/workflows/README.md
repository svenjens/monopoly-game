# GitHub Actions Workflows

Automatische CI/CD pipelines voor AWS deployment.

## 📋 Workflows

### 1. `deploy-aws.yml` - Auto Deploy naar AWS
**Trigger**: Push naar `main` branch of manual trigger

**Stappen**:
1. Build Docker images (backend + Redis)
2. Push images naar ECR
3. Force ECS service redeploy
4. Wait voor stability
5. Notify status

**Vereisten**: AWS credentials als GitHub Secrets

### 2. `terraform-plan.yml` - Terraform Validatie
**Trigger**: Pull Requests die `terraform/**` aanpassen

**Stappen**:
1. Terraform format check
2. Terraform init
3. Terraform validate
4. Terraform plan
5. Comment plan op PR

**Vereisten**: AWS credentials (alleen read access nodig)

## 🔐 Required GitHub Secrets

Ga naar: **Settings → Secrets and variables → Actions**

Voeg toe:
```
AWS_ACCESS_KEY_ID       = <your-access-key>
AWS_SECRET_ACCESS_KEY   = <your-secret-key>
```

### AWS IAM Permissions

Create een IAM user met deze policies:
- `AmazonEC2ContainerRegistryPowerUser` (voor ECR push)
- `AmazonECS_FullAccess` (voor service updates)
- Custom policy voor Terraform (optioneel):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "elasticloadbalancing:Describe*",
        "logs:Describe*",
        "ecs:Describe*",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🚀 Usage

### Automatische Deployment

```bash
# Commit en push naar main
git add .
git commit -m "feat: nieuwe feature"
git push origin main

# GitHub Actions deploy automatisch! 🎉
```

Check status: **Actions** tab in GitHub

### Manual Deployment

1. Ga naar **Actions** tab
2. Selecteer **Deploy to AWS**
3. Click **Run workflow**
4. Selecteer branch: `main`
5. Click **Run workflow**

### Terraform Changes

```bash
# 1. Maak PR met terraform changes
git checkout -b terraform/update-config
# ... edit terraform files
git commit -m "chore: update terraform config"
git push origin terraform/update-config

# 2. Create PR op GitHub
# 3. GitHub Actions post automatisch terraform plan als comment
# 4. Review plan
# 5. Merge PR als alles goed is

# 6. Na merge, manual apply:
cd terraform
terraform apply -var-file=environments/poc.tfvars
```

## 📊 Monitoring

### Deployment Status

```bash
# Via GitHub CLI
gh run list --workflow=deploy-aws.yml

# View logs van laatste run
gh run view --log
```

### AWS Status

```bash
# ECS services
aws ecs describe-services \
  --cluster monopoly-game-cluster \
  --services monopoly-game-backend \
  --region eu-west-1

# Check task health
aws ecs list-tasks \
  --cluster monopoly-game-cluster \
  --service monopoly-game-backend \
  --region eu-west-1
```

## 🐛 Troubleshooting

### Deployment fails bij "Push to ECR"

**Issue**: No ECR credentials

**Fix**:
```bash
# Verify secrets zijn correct
# Check AWS user heeft ECR permissions
aws ecr describe-repositories --region eu-west-1
```

### ECS service update hangt

**Issue**: Service kan niet starten (health checks falen)

**Fix**:
```bash
# Check CloudWatch logs
aws logs tail /ecs/monopoly-game-backend --follow

# Check task errors
aws ecs describe-tasks --cluster monopoly-game-cluster --tasks <task-arn>
```

### Terraform plan fails

**Issue**: State file out of sync

**Fix**:
```bash
cd terraform
terraform refresh
terraform plan
```

## 🔧 Customize Workflows

### Change deployment region

Edit `.github/workflows/deploy-aws.yml`:
```yaml
env:
  AWS_REGION: us-east-1  # Change hier
```

### Add Slack notifications

Add to `deploy-aws.yml`:
```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}: ${{ github.ref }}"
      }
```

### Add testing stage

Create `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run backend tests
        run: |
          cd monopoly-backend
          composer install
          php bin/phpunit
```

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [AWS Actions](https://github.com/aws-actions)
- [Terraform GitHub Actions](https://github.com/hashicorp/setup-terraform)


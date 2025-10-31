# AWS Amplify App for Frontend
resource "aws_amplify_app" "frontend" {
  name       = "${var.project_name}-frontend"
  repository = "https://github.com/svenjens/monopoly-game" # Update with your repo

  # Build settings
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - cd monopoly-frontend
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: monopoly-frontend/.next
        files:
          - '**/*'
      cache:
        paths:
          - monopoly-frontend/node_modules/**/*
  EOT

  # Environment variables
  environment_variables = {
    NEXT_PUBLIC_API_URL = "http://${aws_lb.main.dns_name}"
    NEXT_PUBLIC_WS_URL  = "ws://${aws_lb.main.dns_name}/ws"
    NODE_ENV            = "production"
  }

  # Auto branch creation pattern
  enable_auto_branch_creation = false
  enable_branch_auto_build    = true
  enable_branch_auto_deletion = false

  # Platform
  platform = "WEB_COMPUTE"

  tags = {
    Name = "${var.project_name}-frontend"
  }
}

# Main branch
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"

  enable_auto_build = true

  framework = "Next.js - SSR"
  stage     = "PRODUCTION"

  environment_variables = {
    NEXT_PUBLIC_API_URL = var.certificate_arn != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
    NEXT_PUBLIC_WS_URL  = var.certificate_arn != "" ? "wss://${var.domain_name}/ws" : "ws://${aws_lb.main.dns_name}/ws"
  }

  tags = {
    Name = "${var.project_name}-main-branch"
  }
}

# Optional: Custom domain
resource "aws_amplify_domain_association" "main" {
  count = var.domain_name != "" ? 1 : 0

  app_id      = aws_amplify_app.frontend.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "www"
  }
}


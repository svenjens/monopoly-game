output "ecr_backend_repository_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_redis_repository_url" {
  description = "ECR repository URL for Redis"
  value       = aws_ecr_repository.redis.repository_url
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "Full URL of the backend API"
  value       = var.certificate_arn != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
}

output "websocket_url" {
  description = "WebSocket URL"
  value       = var.certificate_arn != "" ? "wss://${var.domain_name}/ws" : "ws://${aws_lb.main.dns_name}/ws"
}

output "amplify_app_id" {
  description = "Amplify App ID"
  value       = aws_amplify_app.frontend.id
}

output "amplify_default_domain" {
  description = "Default Amplify domain"
  value       = aws_amplify_app.frontend.default_domain
}

output "frontend_url" {
  description = "Frontend URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.frontend.default_domain}"
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.main.name
}

output "redis_internal_endpoint" {
  description = "Internal Redis endpoint"
  value       = "redis.${var.project_name}.local:6379"
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}


variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "monopoly-game"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "backend_cpu" {
  description = "CPU units for backend ECS task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory for backend ECS task in MB"
  type        = number
  default     = 1024
}

variable "redis_cpu" {
  description = "CPU units for Redis ECS task"
  type        = number
  default     = 256
}

variable "redis_memory" {
  description = "Memory for Redis ECS task in MB"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 1
}

variable "domain_name" {
  description = "Optional: Domain name for the application"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "Optional: ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}


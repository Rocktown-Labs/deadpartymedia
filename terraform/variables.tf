variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-2"
}

variable "database_bundle_id" {
  description = "Lightsail database bundle (size)"
  type        = string
  default     = "micro_2_0"  # $15/month - 1 GB RAM, 1 vCPU
  # Options: nano_2_0, micro_2_0, small_2_0, medium_2_0, large_2_0
}

variable "database_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

variable "container_power" {
  description = "Lightsail container service power (size)"
  type        = string
  default     = "micro"  # $7/month - 0.25 vCPU (shared), 512MB RAM
  # Options: nano ($3.50), micro ($7), small ($15), medium ($30), large ($60), xlarge ($120)
}

variable "container_scale" {
  description = "Number of container nodes (scale)"
  type        = number
  default     = 1
  # Scale can be 1-20 depending on power level
}

variable "container_image" {
  description = "Container image to deploy (ECR image URI)"
  type        = string
  default     = ""  # Will be set after first image push to ECR
  # Format: <account-id>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>
}


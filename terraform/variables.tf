variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-2"
}

variable "instance_bundle_id" {
  description = "Lightsail instance bundle (size)"
  type        = string
  default     = "nano_2_0"  # $3.50/month - 0.5 GB RAM, 1 vCPU
  # Options: nano_2_0, micro_2_0, small_2_0, medium_2_0, large_2_0, xlarge_2_0
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

variable "ssh_public_key_path" {
  description = "Path to SSH public key file"
  type        = string
  default     = "~/.ssh/deadparty-server.pub"
}


output "database_endpoint" {
  value       = aws_lightsail_database.deadpartymedia.master_endpoint_address
  description = "Database endpoint"
  sensitive   = false
}

output "database_port" {
  value       = aws_lightsail_database.deadpartymedia.master_endpoint_port
  description = "Database port"
}

output "database_name" {
  value       = aws_lightsail_database.deadpartymedia.relational_database_name
  description = "Database name"
}

output "master_database_name" {
  value       = aws_lightsail_database.deadpartymedia.master_database_name
  description = "Master database name (for connection string)"
}

output "database_username" {
  value       = aws_lightsail_database.deadpartymedia.master_username
  description = "Database master username"
}

# ECR Repository Outputs
output "ecr_repository_url" {
  value       = aws_ecr_repository.deadpartymedia.repository_url
  description = "ECR repository URL for pushing images"
}

# Lambda Function Outputs
output "lambda_function_name" {
  value       = aws_lambda_function.deadpartymedia_api.function_name
  description = "Name of the Lambda function"
}

output "lambda_function_arn" {
  value       = aws_lambda_function.deadpartymedia_api.arn
  description = "ARN of the Lambda function"
}

output "lambda_function_url" {
  value       = aws_lambda_function_url.deadpartymedia_api.function_url
  description = "Public Function URL for the Lambda function"
}

# Container Service Outputs (deprecated - replaced by Lambda)
# output "container_service_url" {
#   value       = "https://${aws_lightsail_container_service.deadpartymedia.url}"
#   description = "Public URL of the container service"
# }

# Certificate Outputs
output "certificate_arn" {
  value       = aws_lightsail_certificate.deadpartymedia.arn
  description = "ARN of the SSL certificate"
}

output "certificate_validation_records" {
  value = aws_lightsail_certificate.deadpartymedia.domain_validation_options
  description = "DNS validation records for the certificate"
}


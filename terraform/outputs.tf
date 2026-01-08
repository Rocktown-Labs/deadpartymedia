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

# Container Service Outputs
output "container_service_url" {
  value       = "https://${aws_lightsail_container_service.deadpartymedia.url}"
  description = "Public URL of the container service"
}

output "container_service_name" {
  value       = aws_lightsail_container_service.deadpartymedia.name
  description = "Name of the container service"
}

output "container_service_power" {
  value       = aws_lightsail_container_service.deadpartymedia.power
  description = "Power level of the container service"
}

output "container_service_scale" {
  value       = aws_lightsail_container_service.deadpartymedia.scale
  description = "Scale (number of nodes) of the container service"
}


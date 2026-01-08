output "instance_ip" {
  value       = aws_lightsail_static_ip.deadpartymedia.ip_address
  description = "Public IP address of the Lightsail instance"
}

output "instance_name" {
  value       = aws_lightsail_instance.deadpartymedia.name
  description = "Name of the Lightsail instance"
}

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

output "ssh_command" {
  value       = "ssh -i ~/Downloads/deadparty-server.pem bitnami@${aws_lightsail_static_ip.deadpartymedia.ip_address}"
  description = "SSH command to connect to the instance"
}


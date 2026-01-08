provider "aws" {
  region = var.aws_region
}

# Lightsail Instance
resource "aws_lightsail_instance" "deadpartymedia" {
  name              = "deadpartymedia-api"  # Match existing instance name
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "django_bitnami"  # Match existing blueprint
  bundle_id         = "micro_3_0"  # Match existing bundle (micro_3_0 = 1 GB RAM, 2 vCPU)
  key_pair_name     = "deadparty-server"  # Match existing key pair

  # Auto Snapshot add-on (preserve existing setting)
  add_on {
    type          = "AutoSnapshot"
    snapshot_time = "00:00"  # Daily at midnight UTC
    status        = "Enabled"
  }

  tags = {
    Name        = "DeadPartyMedia"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  # Ignore key_pair_name changes since it can't be modified on existing instances
  lifecycle {
    ignore_changes = [key_pair_name]
  }
}

# SSH Key Pair (optional - only create if it doesn't exist)
# Uncomment if you need to create a new key pair
# resource "aws_lightsail_key_pair" "deadparty" {
#   name       = "deadparty-server-2"
#   public_key = file(var.ssh_public_key_path)
# }

# Static IP
resource "aws_lightsail_static_ip" "deadpartymedia" {
  name = "deadpartymedia-static-ip"
}

resource "aws_lightsail_static_ip_attachment" "deadpartymedia" {
  static_ip_name = aws_lightsail_static_ip.deadpartymedia.id
  instance_name  = aws_lightsail_instance.deadpartymedia.id
}

# Managed Database
resource "aws_lightsail_database" "deadpartymedia" {
  relational_database_name = "deadpartymediaDB"  # Match existing database name
  availability_zone        = "${var.aws_region}a"
  blueprint_id             = "postgres_17"  # Match existing blueprint (not postgres_17_7)
  bundle_id                = var.database_bundle_id
  master_database_name     = "dbmaster"  # Match existing master database name
  master_username          = "dbmasteruser"
  master_password          = var.database_password
  skip_final_snapshot      = true  # Match existing setting

  tags = {
    Name        = "DeadPartyMedia-DB"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  # Prevent Terraform from changing the password after initial setup
  lifecycle {
    ignore_changes = [master_password]
  }
}

# Outputs are in outputs.tf


terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Lightsail Instance
resource "aws_lightsail_instance" "deadpartymedia" {
  name              = "deadpartymedia-server"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "bitnami_django_6_10_0"
  bundle_id         = var.instance_bundle_id
  key_pair_name     = aws_lightsail_key_pair.deadparty.key_pair_name

  tags = {
    Name        = "DeadPartyMedia"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# SSH Key Pair
resource "aws_lightsail_key_pair" "deadparty" {
  name       = "deadparty-server"
  public_key = file(var.ssh_public_key_path)
}

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
  name              = "deadpartymedia-db"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "postgres_17_7"
  bundle_id         = var.database_bundle_id
  master_database_name = "deadpartymedia"
  master_username   = "dbmasteruser"
  master_password   = var.database_password

  tags = {
    Name        = "DeadPartyMedia-DB"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Outputs are in outputs.tf


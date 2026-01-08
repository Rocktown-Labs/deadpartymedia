# Dead Party Media - Terraform Infrastructure

This Terraform configuration manages the AWS Lightsail infrastructure for Dead Party Media.

## Prerequisites

1. **Terraform installed** (>= 1.0)
   ```bash
   brew install terraform  # macOS
   # or download from https://www.terraform.io/downloads
   ```

2. **AWS CLI configured** with appropriate credentials
   ```bash
   aws configure
   # or
   aws sso login --sso-session newrgm-dev
   ```

3. **SSH key pair** - You'll need your public key

## Setup

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your values:
   ```hcl
   aws_region         = "us-east-2"
   instance_bundle_id = "nano_2_0"      # Adjust based on needs
   database_bundle_id = "micro_2_0"     # Adjust based on needs
   database_password  = "your-secure-password"
   ssh_public_key_path = "~/.ssh/deadparty-server.pub"
   ```

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Plan the deployment:**
   ```bash
   terraform plan
   ```

5. **Apply the configuration:**
   ```bash
   terraform apply
   ```

## What This Creates

- **Lightsail Instance**: Bitnami Django instance
- **Static IP**: Persistent IP address
- **Managed Database**: PostgreSQL database
- **SSH Key Pair**: For instance access

## Outputs

After applying, Terraform will output:
- `instance_ip`: The public IP address
- `database_endpoint`: Database connection endpoint
- `database_port`: Database port (usually 5432)

## Using the Outputs

After `terraform apply`, you can:

1. **Get the instance IP:**
   ```bash
   terraform output instance_ip
   ```

2. **SSH into the instance:**
   ```bash
   ssh -i ~/.ssh/deadparty-server bitnami@$(terraform output -raw instance_ip)
   ```

3. **Update your secrets** with the new database endpoint:
   ```bash
   terraform output database_endpoint
   ```

## Destroying Resources

⚠️ **Warning**: This will delete everything!

```bash
terraform destroy
```

## Next Steps After Infrastructure

Once the infrastructure is created:

1. **Set up AWS Secrets Manager** (use the existing `setup-secrets.sh` script)
2. **Deploy the application** (use the existing deployment scripts)
3. **Configure DNS** (Route53 A record pointing to the static IP)
4. **Set up nginx** (use the existing `setup-nginx.sh` script)

## Cost Estimation

- **Instance** (nano_2_0): ~$3.50/month
- **Database** (micro_2_0): ~$15/month
- **Static IP**: Free (when attached to instance)
- **Total**: ~$18.50/month

## Notes

- The instance uses Bitnami's Django blueprint
- The database is automatically configured with PostgreSQL
- Static IP ensures the IP doesn't change on instance restart
- All resources are tagged for easy identification


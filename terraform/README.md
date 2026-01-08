# Dead Party Media - Terraform Infrastructure

This Terraform configuration manages the AWS Lightsail infrastructure for Dead Party Media using container services.

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

## Setup

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your values:
   ```hcl
   aws_region         = "us-east-2"
   database_bundle_id = "micro_2_0"     # Adjust based on needs
   database_password  = "your-secure-password"
   container_power    = "micro"          # nano, micro, small, medium, large, xlarge
   container_scale    = 1                # Number of nodes (1-20)
   container_image    = ""               # Set after first image push
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

- **Lightsail Container Service**: Managed container service for the Django API
- **Container Service Deployment**: Initial deployment configuration
- **Managed Database**: PostgreSQL database (existing, managed by Terraform)

## Outputs

After applying, Terraform will output:
- `container_service_url`: The public URL of the container service
- `container_service_name`: Name of the container service
- `container_service_power`: Power level of the service
- `container_service_scale`: Number of nodes
- `database_endpoint`: Database connection endpoint
- `database_port`: Database port (usually 5432)
- `database_name`: Database name
- `master_database_name`: Master database name for connection strings
- `database_username`: Database username

## Using the Outputs

After `terraform apply`, you can:

1. **Get the container service URL:**
   ```bash
   terraform output container_service_url
   ```

2. **Get database connection details:**
   ```bash
   terraform output database_endpoint
   terraform output database_port
   terraform output database_username
   ```

## First Deployment

After creating the container service with Terraform:

1. **Get Lightsail registry login:**
   ```bash
   aws lightsail get-container-service-registry-login --region us-east-2
   ```

2. **Build and push your Docker image** (see `apps/server/DEPLOYMENT.md` for details)

3. **Update `terraform.tfvars`** with the image name:
   ```hcl
   container_image = "<registry-url>/deadpartymedia-api:latest"
   ```

4. **Apply Terraform again** to deploy the image:
   ```bash
   terraform apply
   ```

## Destroying Resources

⚠️ **Warning**: This will delete everything!

```bash
terraform destroy
```

## Cost Estimation

- **Container Service** (micro, scale 1): ~$7/month
- **Database** (micro_2_0): ~$15/month
- **Total**: ~$22/month

## Notes

- The container service uses Lightsail's managed container platform
- The database is automatically configured with PostgreSQL
- Container service provides automatic scaling and health checks
- All resources are tagged for easy identification
- Deployments are automated via GitHub Actions (see `.github/workflows/deploy-container.yml`)

## Scaling

To scale the container service, update `terraform.tfvars`:

```hcl
container_power = "small"  # Increase power
container_scale = 2         # Increase number of nodes
```

Then apply:
```bash
terraform apply
```

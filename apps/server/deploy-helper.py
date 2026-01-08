#!/usr/bin/env python3
"""
Deployment helper script for Dead Party Media Django backend.
This script fetches secrets from AWS Secrets Manager and orchestrates deployment.
Can be used from GitHub Actions or run locally.
"""

import boto3
import json
import os
import sys
import subprocess
from pathlib import Path
from typing import Dict, Optional

# AWS region
AWS_REGION = os.environ.get("AWS_REGION", "us-east-2")

# Secret names in AWS Secrets Manager
SECRET_NAMES = {
    "instance_ip": "deadpartymedia/lightsail/instance-ip",
    "ssh_key": "deadpartymedia/lightsail/ssh-private-key",
    "db_endpoint": "deadpartymedia/database/endpoint",
    "db_port": "deadpartymedia/database/port",
    "db_username": "deadpartymedia/database/username",
    "db_password": "deadpartymedia/database/password",
    "db_name": "deadpartymedia/database/name",
    "django_secret_key": "deadpartymedia/django/secret-key",
    "django_allowed_hosts": "deadpartymedia/django/allowed-hosts",
}


def get_secret(secrets_client: boto3.client, secret_name: str) -> str:
    """Fetch a secret from AWS Secrets Manager."""
    try:
        response = secrets_client.get_secret_value(SecretId=secret_name)
        return response["SecretString"]
    except Exception as e:
        print(f"Error fetching secret {secret_name}: {e}", file=sys.stderr)
        raise


def fetch_all_secrets() -> Dict[str, str]:
    """Fetch all required secrets from AWS Secrets Manager."""
    secrets_client = boto3.client("secretsmanager", region_name=AWS_REGION)
    secrets = {}

    for key, secret_name in SECRET_NAMES.items():
        try:
            secrets[key] = get_secret(secrets_client, secret_name)
        except Exception as e:
            print(f"Warning: Could not fetch {secret_name}: {e}", file=sys.stderr)
            secrets[key] = None

    return secrets


def verify_instance_status(lightsail_client: boto3.client, instance_name: str) -> bool:
    """Verify that the Lightsail instance is running."""
    try:
        response = lightsail_client.get_instance(instanceName=instance_name)
        state = response["instance"]["state"]["name"]
        print(f"Instance state: {state}")

        if state != "running":
            print(f"ERROR: Instance is not running (state: {state})", file=sys.stderr)
            return False

        return True
    except Exception as e:
        print(f"Error checking instance status: {e}", file=sys.stderr)
        return False


def write_ssh_key(ssh_key_content: str, key_path: str = "/tmp/ssh_key.pem") -> str:
    """Write SSH private key to file with proper permissions."""
    key_path = Path(key_path)
    key_path.write_text(ssh_key_content)
    key_path.chmod(0o600)
    return str(key_path)


def deploy_via_ssh(
    instance_ip: str,
    ssh_user: str,
    ssh_key_path: str,
    secrets: Dict[str, str],
    app_dir: str = "/home/bitnami/deadpartymedia",
) -> bool:
    """Deploy to instance via SSH."""
    server_dir = f"{app_dir}/apps/server"

    # Prepare environment variables for deployment script
    env_vars = {
        "DB_HOST": secrets.get("db_endpoint", ""),
        "DB_PORT": secrets.get("db_port", "5432"),
        "DB_NAME": secrets.get("db_name", "deadpartymedia"),
        "DB_USER": secrets.get("db_username", ""),
        "DB_PASSWORD": secrets.get("db_password", ""),
        "SECRET_KEY": secrets.get("django_secret_key", ""),
        "ALLOWED_HOSTS": secrets.get("django_allowed_hosts", "18.189.190.211,localhost"),
    }

    # Build environment variable string for SSH command
    env_string = " ".join([f"{k}='{v}'" for k, v in env_vars.items() if v])

    # SSH command to run deployment script
    ssh_command = f"""
    cd {server_dir} && \
    git fetch origin && \
    git reset --hard origin/main && \
    {env_string} bash {server_dir}/deploy-lightsail.sh
    """

    # Execute SSH command
    ssh_cmd = [
        "ssh",
        "-i", ssh_key_path,
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        f"{ssh_user}@{instance_ip}",
        ssh_command,
    ]

    try:
        result = subprocess.run(ssh_cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"SSH deployment failed: {e}", file=sys.stderr)
        print(f"STDOUT: {e.stdout}", file=sys.stderr)
        print(f"STDERR: {e.stderr}", file=sys.stderr)
        return False


def main():
    """Main deployment function."""
    import argparse

    parser = argparse.ArgumentParser(description="Deploy Dead Party Media to Lightsail")
    parser.add_argument(
        "--instance-name",
        default=os.environ.get("LIGHTSAIL_INSTANCE_NAME", "deadparty-server"),
        help="Lightsail instance name",
    )
    parser.add_argument(
        "--ssh-user",
        default="bitnami",
        help="SSH user for instance",
    )
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="Skip instance status verification",
    )
    parser.add_argument(
        "--secrets-only",
        action="store_true",
        help="Only fetch and print secrets (for testing)",
    )

    args = parser.parse_args()

    print("Fetching secrets from AWS Secrets Manager...")
    secrets = fetch_all_secrets()

    if args.secrets_only:
        print("\nFetched secrets (values hidden):")
        for key in secrets.keys():
            value = secrets[key]
            if value:
                print(f"  {key}: {'*' * min(len(value), 20)}")
            else:
                print(f"  {key}: (not set)")
        return 0

    # Verify required secrets
    required_secrets = ["instance_ip", "ssh_key"]
    missing = [key for key in required_secrets if not secrets.get(key)]
    if missing:
        print(f"ERROR: Missing required secrets: {', '.join(missing)}", file=sys.stderr)
        return 1

    # Verify instance status
    if not args.skip_verify:
        print(f"Verifying Lightsail instance status: {args.instance_name}")
        lightsail_client = boto3.client("lightsail", region_name=AWS_REGION)
        if not verify_instance_status(lightsail_client, args.instance_name):
            return 1

    # Write SSH key
    print("Preparing SSH key...")
    ssh_key_path = write_ssh_key(secrets["ssh_key"])

    try:
        # Deploy via SSH
        print(f"Deploying to {secrets['instance_ip']}...")
        success = deploy_via_ssh(
            instance_ip=secrets["instance_ip"],
            ssh_user=args.ssh_user,
            ssh_key_path=ssh_key_path,
            secrets=secrets,
        )

        if success:
            print("Deployment completed successfully!")
            return 0
        else:
            print("Deployment failed!", file=sys.stderr)
            return 1
    finally:
        # Cleanup SSH key
        try:
            os.remove(ssh_key_path)
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())


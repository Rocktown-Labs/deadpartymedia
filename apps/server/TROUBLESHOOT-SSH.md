# Troubleshooting SSH Connection Issues

## Issue: Permission denied (publickey)

After attaching a static IP, SSH authentication may fail. Here's how to fix it:

## Solution 1: Verify Key Pair in AWS Console

1. Go to AWS Lightsail Console → Your Instance (`deadpartymedia-api`)
2. Check the **"Connect"** tab
3. Verify the key pair name matches your local key file:
   - Expected: `deadparty-server`
   - Your key: `deadparty-server-2.pem`

## Solution 2: Use Lightsail Browser Terminal

If SSH fails, use the browser terminal:

1. In Lightsail Console → Your Instance
2. Click **"Connect using SSH"** (browser terminal)
3. This will open a terminal in your browser
4. Verify you can access the instance

## Solution 3: Check Key File Format

Your key file should start with:
```
-----BEGIN RSA PRIVATE KEY-----
```
or
```
-----BEGIN OPENSSH PRIVATE KEY-----
```

Verify the key format:
```bash
# Check key type
file ~/Downloads/deadparty-server-2.pem

# Verify key fingerprint (if accessible)
ssh-keygen -l -f ~/Downloads/deadparty-server-2.pem
```

## Solution 4: Try Different Key Location

The Terraform output suggests the key should be at `~/.ssh/deadparty-server`:

```bash
# Copy key to expected location
cp ~/Downloads/deadparty-server-2.pem ~/.ssh/deadparty-server
chmod 600 ~/.ssh/deadparty-server

# Try connecting
ssh -i ~/.ssh/deadparty-server bitnami@18.189.190.211
```

## Solution 5: Verify Instance State

Check if the instance is running and accessible:

1. Lightsail Console → Your Instance
2. Verify status is **"Running"**
3. Check the **"Networking"** tab:
   - Public IP should be `18.189.190.211`
   - Static IP should be attached

## Solution 6: Check Security Groups

Verify SSH (port 22) is allowed:

1. Lightsail Console → Your Instance → **"Networking"** tab
2. Check **"Firewall"** rules
3. Ensure **"SSH (22)"** is allowed from your IP or `0.0.0.0/0`

## Solution 7: Download New Key Pair (Last Resort)

If nothing works, you may need to:

1. Create a new key pair in Lightsail
2. Update the instance to use the new key pair
3. Update Terraform configuration

**Note:** This will require stopping the instance and may cause downtime.

## Quick Test Commands

```bash
# Test connection with verbose output
ssh -vvv -i ~/Downloads/deadparty-server-2.pem bitnami@18.189.190.211

# Test with key in standard location
ssh -i ~/.ssh/deadparty-server bitnami@18.189.190.211

# Check if instance is reachable
ping 18.189.190.211

# Check if SSH port is open
nc -zv 18.189.190.211 22
```

## Most Likely Issue

Based on the error, the most likely cause is:
- **Key pair mismatch**: The instance expects `deadparty-server` but you're using `deadparty-server-2.pem`
- **Solution**: Verify in AWS Console that the instance is using the correct key pair, or try using the key with the name `deadparty-server`


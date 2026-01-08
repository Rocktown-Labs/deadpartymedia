# Fix SSH Key Mismatch

## The Problem
Terraform state is correct, but SSH authentication fails. This means the key file you have doesn't match the key pair attached to the instance.

## Quick Fix: Use Lightsail Browser Terminal

**Immediate solution** - Use the browser terminal to access your instance:

1. Go to AWS Lightsail Console
2. Click on your instance: `deadpartymedia-api`
3. Click **"Connect using SSH"** (browser terminal button)
4. This opens a terminal in your browser - no SSH key needed!

## Verify Key Pair in AWS Console

1. Go to Lightsail Console → Your Instance (`deadpartymedia-api`)
2. Click the **"Connect"** tab
3. Look for **"SSH key name"** - what does it say?
   - If it says `deadparty-server-2` → Your key file should work
   - If it says something else → That's the problem!

## Solution Options

### Option 1: Download the Correct Key (If Available)

If Lightsail shows a "Download default key" option:
1. Download it
2. Use that key file instead

### Option 2: Add Your Public Key to the Instance

If you can access via browser terminal:

1. **Open browser terminal** in Lightsail console
2. **Add your public key** to the instance:
   ```bash
   # On your local machine, get your public key
   cat ~/.ssh/id_rsa.pub
   # Or if you have a different key:
   cat ~/Downloads/deadparty-server-2.pem | ssh-keygen -y -f - > ~/Downloads/deadparty-server-2.pub
   cat ~/Downloads/deadparty-server-2.pub
   ```

3. **On the instance** (via browser terminal):
   ```bash
   # Create .ssh directory if it doesn't exist
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   
   # Add your public key
   echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

### Option 3: Create New Key Pair and Update Instance

**⚠️ This requires stopping the instance (downtime)**

1. In Lightsail Console → Account → SSH Keys
2. Create a new key pair
3. Download the private key
4. Stop the instance
5. Change the key pair in instance settings
6. Start the instance
7. Update Terraform config with new key pair name

## Check Your Key File

Verify your key file is valid:

```bash
# Check if it's a valid SSH key
file ~/Downloads/deadparty-server-2.pem

# Try to extract public key (this will fail if key is invalid)
ssh-keygen -y -f ~/Downloads/deadparty-server-2.pem > /tmp/test.pub

# Check permissions
ls -la ~/Downloads/deadparty-server-2.pem
# Should be: -rw------- (600)
```

## Most Likely Solution

**Use the Lightsail browser terminal** to:
1. Access the instance immediately
2. Check what's actually on the instance
3. Add your public key manually if needed

Then you can use SSH normally going forward.


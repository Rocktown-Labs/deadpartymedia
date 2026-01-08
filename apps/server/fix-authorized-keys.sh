#!/bin/bash
# Script to fix authorized_keys on the instance
# Run this in the browser terminal

echo "Fixing authorized_keys format..."

# Remove the incorrectly formatted key
sed -i '/^AAAAB3NzaC1yc2E/d' ~/.ssh/authorized_keys

# Add the correctly formatted key
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDTwnRg5TiUDYJSURILmLMiybxv7J4u4KJ6bnrT8J301OrshlGWxBPeeu9qd4CxQcOgi6kGB3LtkfcQgYQzCvy58RGKcyeb8DZY2VwylzJWB10W9yVz3b7GvVZABFLPxO9N5F/xXy1TThZ/FypWPzLoEyn/ivIlHzIXa8bwqVzAlQ9hEw0Bk82kP62/eTyISI0+3YS87tXJUmp8wusAF4Uwb3jUfrImxPlF8nXG8S5NT8IakWa5bhbUreNz+4s8TOJhqXwpihKKfffhIUk7NCbZWgXBYnpDo60TZCxQv5xhwzFZnv9CuKD24+KgqBXz+BkcExOBBKXPVaP3iu85JGA/" >> ~/.ssh/authorized_keys

chmod 600 ~/.ssh/authorized_keys

echo "✅ Fixed! Now try SSH from your local machine:"
echo "ssh -i ~/Downloads/deadparty-server.pem bitnami@18.189.190.211"


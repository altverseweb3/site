#!/bin/bash
set -eou

TEMP_DIR=$(mktemp -d)
git clone https://x-access-token:${GITHUB_TOKEN}@github.com/altverseweb3/token-fetcher.git "$TEMP_DIR/token-fetcher"

# Remove existing tokens except mono and branded (directories and files)
echo "Removing existing tokens content except mono, branded, and natives..."
for item in public/tokens/*; do
  if [[ "$item" != "public/tokens/mono" && "$item" != "public/tokens/branded" && "$item" != "public/tokens/native" ]]; then
    rm -rf "$item"
  fi
done

# Ensure the destination directory exists
echo "Creating public tokens directory..."
mkdir -p public/tokens

# Copy tokens from the cloned repo to the public directory
echo "Copying tokens to public directory..."
cp -R "$TEMP_DIR/token-fetcher/tokens/"* public/tokens/

# Clone analytics-fetcher repo
echo "Cloning analytics-fetcher repository..."
git clone https://x-access-token:${GITHUB_TOKEN}@github.com/altverseweb3/analytics-fetcher.git "$TEMP_DIR/analytics-fetcher"

# Ensure the analytics directory exists
echo "Creating public/analytics directory..."
mkdir -p public/analytics

# Copy analytics.json to public/analytics/data.json
echo "Copying analytics data to public directory..."
cp "$TEMP_DIR/analytics-fetcher/analytics.json" public/analytics/data.json

# Clean up
echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

# Run the regular Next.js build
echo "Running Next.js build..."
next build
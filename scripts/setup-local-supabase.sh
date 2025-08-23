#!/bin/bash

# Setup Local Supabase Mirror
# This script sets up a local Supabase instance that mirrors your online project

PROJECT_REF="ulmdmzhcdwfadbvfpckt"

echo "🚀 Setting up Local Supabase Mirror"
echo "===================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Step 1: Login to Supabase
echo "Step 1: Login to Supabase"
echo "--------------------------"
echo "You'll need to login to Supabase first."
echo "Run: supabase login"
echo ""
echo "This will open a browser window for authentication."
echo "After logging in, press Enter to continue..."
read -p ""

# Step 2: Link the project
echo "Step 2: Link to your remote project"
echo "------------------------------------"
echo "Linking to project: $PROJECT_REF"
echo ""

supabase link --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "❌ Failed to link project"
    echo "Make sure you're logged in and have access to the project"
    exit 1
fi

echo "✅ Project linked successfully"
echo ""

# Step 3: Pull the database schema
echo "Step 3: Pull database schema from remote"
echo "-----------------------------------------"
echo "This will download your database schema..."
echo ""

supabase db pull

if [ $? -ne 0 ]; then
    echo "⚠️ Failed to pull database schema"
    echo "You may need to set your database password"
else
    echo "✅ Database schema pulled successfully"
fi
echo ""

# Step 4: Start local Supabase
echo "Step 4: Start local Supabase instance"
echo "--------------------------------------"
echo "Starting local Supabase services..."
echo ""

supabase start

if [ $? -ne 0 ]; then
    echo "❌ Failed to start local Supabase"
    exit 1
fi

echo ""
echo "✅ Local Supabase is running!"
echo ""

# Step 5: Show connection info
echo "Step 5: Connection Information"
echo "-------------------------------"
supabase status

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Your local Supabase instance is now running and mirroring your online project."
echo ""
echo "Useful commands:"
echo "  supabase status     - Show local instance status"
echo "  supabase db pull    - Pull latest schema from remote"
echo "  supabase db push    - Push local schema changes to remote"
echo "  supabase db reset   - Reset local database"
echo "  supabase stop       - Stop local instance"
echo ""
echo "Local URLs:"
echo "  Studio URL: http://localhost:54323"
echo "  API URL:    http://localhost:54321"
echo ""
# Connect to Your Neon Database

## Your Neon Project
- **Project**: long-hill-90158403
- **Branch**: br-lingering-cell-ai19xt06
- **Database**: neondb
- **Console**: https://console.neon.tech/app/projects/long-hill-90158403/branches/br-lingering-cell-ai19xt06/tables?database=neondb

## Step 1: Get Your Connection String

1. Go to your Neon console:
   https://console.neon.tech/app/projects/long-hill-90158403/branches/br-lingering-cell-ai19xt06/tables?database=neondb

2. Click the **"Connect"** button (top right)

3. Select **"Node.js"** or **"PostgreSQL"**

4. Copy the connection string. It will look like:
   ```
   postgresql://neondb_owner:npg_xxxxxx@ep-aaaa-bbbb.c-111.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Step 2: Set Environment Variable

In PowerShell:
```powershell
$env:DATABASE_URL="postgresql://neondb_owner:npg_xxxxxx@ep-aaaa-bbbb.c-111.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

## Step 3: Test Connection

```bash
node scripts/connect-neon-db.mjs
```

## Step 4: View Your Data

```bash
# Get all vehicles
$env:DATABASE_URL="your-connection-string"; node scripts/get-vehicles-data.mjs

# Get all tables
$env:DATABASE_URL="your-connection-string"; node scripts/get-all-data.mjs
```

## Update Your .env.local File

Add this to your `.env.local` file:
```env
DATABASE_URL=postgresql://neondb_owner:npg_xxxxxx@ep-aaaa-bbbb.c-111.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Quick Test Script

```bash
# Test connection to your Neon database
$env:DATABASE_URL="your-connection-string"; node scripts/connect-neon-db.mjs
```

This will show:
- ✅ Connection status
- 📋 List of tables
- 🚗 Vehicle count and sample data

# Transfer Files to Google Cloud - Quick Guide

## Method 1: Using Google Cloud Storage (Recommended)

### Step 1: Install Google Cloud SDK (if not installed)

```bash
# On WSL2/Ubuntu
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Step 2: Authenticate and Set Project

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 3: Create Storage Bucket and Upload Files

```bash
# Navigate to parent directory
cd /mnt/c/Users/dinesh.rj/Downloads

# Create tar archive
tar -czf sos-app.tar.gz sos-app/

# Create bucket (replace PROJECT_ID with your actual project ID)
export PROJECT_ID="your-project-id"
gsutil mb -l us-central1 gs://$PROJECT_ID-sos-app-deployment/

# Upload archive
gsutil cp sos-app.tar.gz gs://$PROJECT_ID-sos-app-deployment/

echo "✓ Files uploaded successfully!"
echo "File location: gs://$PROJECT_ID-sos-app-deployment/sos-app.tar.gz"
```

### Step 4: Download on GCP (Cloud Shell or GCE Instance)

```bash
# Open Cloud Shell at: https://console.cloud.google.com
# Or SSH into your GCE instance

# Download and extract
export PROJECT_ID="your-project-id"
gsutil cp gs://$PROJECT_ID-sos-app-deployment/sos-app.tar.gz .
tar -xzf sos-app.tar.gz
cd sos-app

# Verify files
ls -la
```

---

## Method 2: Using Git Repository (Best Practice)

### Step 1: Initialize Git Repository (if not already done)

```bash
cd /mnt/c/Users/dinesh.rj/Downloads/sos-app

# Initialize git
git init

# Create .gitignore
cat > .gitignore <<EOF
node_modules/
dist/
build/
.env
*.log
secrets.env
.DS_Store
*.tar.gz
EOF

# Add files
git add .
git commit -m "Initial commit: SOS App Phase 1 infrastructure"
```

### Step 2: Push to Repository

**Option A: GitHub**
```bash
# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/sos-app.git
git branch -M main
git push -u origin main
```

**Option B: Google Cloud Source Repositories**
```bash
# Create repository
gcloud source repos create sos-app

# Add remote
git remote add google https://source.developers.google.com/p/YOUR_PROJECT_ID/r/sos-app

# Push
git push google main
```

### Step 3: Clone on GCP

```bash
# On Cloud Shell or GCE instance
git clone https://github.com/YOUR_USERNAME/sos-app.git
# OR
gcloud source repos clone sos-app

cd sos-app
```

---

## Method 3: Direct Upload via Cloud Shell

### Step 1: Open Google Cloud Shell

Go to: https://console.cloud.google.com
Click on the Cloud Shell icon in the top right

### Step 2: Use Cloud Shell Upload Feature

1. Click on the "More" (⋮) button in Cloud Shell
2. Select "Upload"
3. Select the sos-app.tar.gz file

OR

### Step 3: Create archive and upload via browser

```bash
# On your local machine
cd /mnt/c/Users/dinesh.rj/Downloads
tar -czf sos-app.tar.gz sos-app/

# Then use the Cloud Shell upload UI to upload sos-app.tar.gz
```

```bash
# In Cloud Shell after upload
tar -xzf sos-app.tar.gz
cd sos-app
```

---

## Method 4: Using SCP (If using GCE VM)

### Step 1: Create a GCE VM (Optional Management VM)

```bash
gcloud compute instances create sos-app-admin \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB
```

### Step 2: Transfer Files

```bash
# From WSL2
cd /mnt/c/Users/dinesh.rj/Downloads

# Create archive
tar -czf sos-app.tar.gz sos-app/

# Transfer using gcloud scp
gcloud compute scp sos-app.tar.gz sos-app-admin:~ --zone=us-central1-a

# Or transfer entire directory
gcloud compute scp --recurse sos-app/ sos-app-admin:~/sos-app --zone=us-central1-a
```

### Step 3: SSH and Extract

```bash
# SSH into VM
gcloud compute ssh sos-app-admin --zone=us-central1-a

# Extract
tar -xzf sos-app.tar.gz
cd sos-app
```

---

## Quick Transfer Script

Save this as `transfer-to-gcp.sh`:

```bash
#!/bin/bash
# Quick transfer to GCP

set -e

PROJECT_ID="${1:-your-project-id}"
BUCKET_NAME="$PROJECT_ID-sos-app-deployment"

echo "=== Transferring SOS App to Google Cloud ==="
echo "Project ID: $PROJECT_ID"
echo ""

# Navigate to parent directory
cd /mnt/c/Users/dinesh.rj/Downloads

# Create archive
echo "1. Creating archive..."
tar -czf sos-app.tar.gz sos-app/
echo "✓ Archive created: sos-app.tar.gz"

# Create bucket if it doesn't exist
echo ""
echo "2. Creating GCS bucket (if needed)..."
gsutil mb -l us-central1 gs://$BUCKET_NAME/ 2>/dev/null || echo "Bucket already exists"

# Upload
echo ""
echo "3. Uploading to Google Cloud Storage..."
gsutil -m cp sos-app.tar.gz gs://$BUCKET_NAME/

echo ""
echo "✓ Upload complete!"
echo ""
echo "To download on GCP, run:"
echo "  gsutil cp gs://$BUCKET_NAME/sos-app.tar.gz ."
echo "  tar -xzf sos-app.tar.gz"
echo "  cd sos-app"
echo ""
```

Usage:
```bash
chmod +x transfer-to-gcp.sh
./transfer-to-gcp.sh your-project-id
```

---

## After Transfer: Quick Setup on GCP

```bash
# 1. Extract files (if using tar)
tar -xzf sos-app.tar.gz
cd sos-app

# 2. Connect to GKE cluster
gcloud container clusters get-credentials sos-app-cluster --region us-central1

# 3. Deploy
./gcp-deploy.sh deploy

# 4. Verify
./validate-deployment.sh
```

---

## Files Being Transferred

Your sos-app directory contains:

```
sos-app/
├── infrastructure/
│   └── kubernetes/
│       └── base/              # 20+ Kubernetes manifests
├── libs/
│   ├── shared/                # Shared TypeScript libraries
│   └── api-client/            # API client library
├── services/                  # Backend services (if any)
├── apps/                      # Client applications (if any)
├── gcp-deploy.sh             # GCP deployment script
├── validate-deployment.sh     # Validation script
├── GCP-DEPLOYMENT-GUIDE.md   # Comprehensive guide
├── TRANSFER-TO-GCP.md        # This file
├── LOCAL-TESTING-GUIDE.md    # Local testing guide
├── package.json               # Root package.json
├── nx.json                    # Nx workspace config
└── tsconfig.base.json         # TypeScript config
```

**Total size**: ~50-100MB (without node_modules)

---

## Recommended Approach

**For Development/Testing:**
→ Use Method 1 (Google Cloud Storage) - Fastest and simplest

**For Production/Team:**
→ Use Method 2 (Git Repository) - Best practice, version control

**For Quick Testing:**
→ Use Method 3 (Cloud Shell upload) - No local CLI setup needed

---

## Troubleshooting

### Issue: gcloud not found
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Issue: Permission denied
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Issue: Bucket already exists
```bash
# Use existing bucket or choose a different name
gsutil ls  # List your buckets
```

### Issue: Large file upload timeout
```bash
# Use parallel upload for large files
gsutil -m cp -r sos-app/ gs://bucket-name/
```

---

**Choose your preferred method and transfer your files! 🚀**

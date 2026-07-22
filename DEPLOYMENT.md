# Server Connection & Deployment Guide

This guide documents the server details, SSH credentials, and the deployment steps for the **AI Model Evaluator** Next.js application.

---

## Server Information

- **Domain**: [https://gyanu.online](https://gyanu.online)
- **IP Address**: `104.211.89.217`
- **Username**: `Gyanu`
- **Authentication Key (Local Path)**: `"c:\Users\Gyanu\Downloads\build_17_07_26\build\React.pem"`
- **App Location on Server**: `/home/Gyanu/next-app/`
- **Nginx Config Path**: `/etc/nginx/sites-available/default`

---

## Connection Commands

### 1. Connect via SSH
To open an interactive terminal session on the remote server:
```powershell
ssh -i "c:\Users\Gyanu\Downloads\build_17_07_26\build\React.pem" Gyanu@104.211.89.217
```

### 2. View Server Logs
To check live logs from the running Next.js application:
```powershell
ssh -i "c:\Users\Gyanu\Downloads\build_17_07_26\build\React.pem" Gyanu@104.211.89.217 "pm2 logs next-app"
```

### 3. Check App Status
To check process status, CPU, and memory usage:
```powershell
ssh -i "c:\Users\Gyanu\Downloads\build_17_07_26\build\React.pem" Gyanu@104.211.89.217 "pm2 status"
```

---

## Automated Deployment (Recommended)

You can run the automated script [deploy.ps1](file:///c:/Users/Gyanu/OneDrive/Desktop/Ai_model_Test/deploy.ps1) directly from your local terminal to pack, transfer, build, and deploy the latest changes:

```powershell
./deploy.ps1
```

---

## Manual Step-by-Step Deployment

If you prefer to run the steps manually:

### Step 1: Package Local Project
Run this command from your local workspace root (PowerShell/CMD) to create a compressed tarball (excluding `node_modules`, `.next` build files, and `.git` folders):
```powershell
tar -czf project.tar.gz --exclude=node_modules --exclude=.next --exclude=.git --exclude=project.tar.gz .
```

### Step 2: Upload Files
Upload the tarball and environment variables to the server:
```powershell
scp -i "c:\Users\Gyanu\Downloads\build_17_07_26\build\React.pem" project.tar.gz .env.local Gyanu@104.211.89.217:/home/Gyanu/
```

### Step 3: Extract and Build on Server
Run these commands on the server to extract the bundle, install dependencies, and compile the Next.js production build:
```powershell
ssh -i "c:\Users\Gyanu\Downloads\build_17_07_26\build\React.pem" Gyanu@104.211.89.217 "mkdir -p /home/Gyanu/next-app && mv /home/Gyanu/project.tar.gz /home/Gyanu/.env.local /home/Gyanu/next-app/ && cd /home/Gyanu/next-app && tar -xzf project.tar.gz && rm project.tar.gz && npm install && npm run build"
```

### Step 4: Restart PM2 Daemon
Restart the PM2 process to apply the changes:
```powershell
ssh -i "c:\Users\Gyanu\Downloads\build_17_07_26\build\React.pem" Gyanu@104.211.89.217 "pm2 restart next-app"
```
*(If starting for the first time, use: `pm2 start npm --name "next-app" -- start`)*

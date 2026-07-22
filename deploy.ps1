# deploy.ps1
# Automates the deployment of the Next.js app to the remote Ubuntu server

$ErrorActionPreference = "Stop"

# Configuration variables
$PemPath = "c:\Users\Gyanu\Downloads\build_17_07_26\build\React.pem"
$Server = "Gyanu@104.211.89.217"
$RemotePath = "/home/Gyanu/next-app"

Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "Starting Next.js App Deployment to gyanu.online" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow

# 1. Packaging Workspace
Write-Host "`n[1/5] Packaging local workspace..." -ForegroundColor Cyan
if (Test-Path "project.tar.gz") {
    Remove-Item "project.tar.gz" -Force
}
# Tar command excluding unnecessary folders
tar -czf project.tar.gz --exclude=node_modules --exclude=.next --exclude=.git --exclude=project.tar.gz .
Write-Host "Successfully packaged project into project.tar.gz" -ForegroundColor Green

# 2. Transfer Files
Write-Host "`n[2/5] Transferring files to remote server..." -ForegroundColor Cyan
scp -i $PemPath project.tar.gz .env.local "${Server}:/home/Gyanu/"
Write-Host "Successfully transferred files." -ForegroundColor Green

# 3. Extract and Build on Server
Write-Host "`n[3/5] Extracting and building on remote server (this might take a minute)..." -ForegroundColor Cyan
$RemoteBuildCmd = "mkdir -p $RemotePath && mv /home/Gyanu/project.tar.gz /home/Gyanu/.env.local $RemotePath/ && cd $RemotePath && tar -xzf project.tar.gz && rm project.tar.gz && npm install && npm run build"
ssh -i $PemPath $Server $RemoteBuildCmd
Write-Host "Successfully built application on server." -ForegroundColor Green

# 4. Restart Server process
Write-Host "`n[4/5] Restarting process under PM2..." -ForegroundColor Cyan
# Attempt to restart next-app; if it doesn't exist, start it
$RemoteRestartCmd = "pm2 restart next-app || pm2 start npm --name 'next-app' -- start && pm2 save"
ssh -i $PemPath $Server $RemoteRestartCmd
Write-Host "PM2 process successfully restarted/started." -ForegroundColor Green

# 5. Clean up Local files
Write-Host "`n[5/5] Cleaning up local temporary files..." -ForegroundColor Cyan
if (Test-Path "project.tar.gz") {
    Remove-Item "project.tar.gz" -Force
}
Write-Host "Cleaned up project.tar.gz locally." -ForegroundColor Green

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Website URL: https://gyanu.online" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

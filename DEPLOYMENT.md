# Engagement Dashboard - Deployment Guide

## Overview
This guide covers deploying the Engagement Dashboard to your Digital Ocean server with automatic GitHub Actions deployment.

## Server Setup Commands

### 1. Update docker-compose.yml
Run this command on your server to add the engagement-dashboard service:

```bash
cat >> ~/n8n/docker-compose.yml << 'EOF'

  # Engagement Dashboard
  engagement-dashboard:
    build: ./tools/engagement-dashboard
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
      - SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
      - DATABASE_PATH=/app/data/engagement.db
    volumes:
      - engagement_data:/app/data
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF
```

### 2. Add volume to docker-compose.yml
```bash
# Add to the volumes section
sed -i '/^volumes:/a\  engagement_data:' ~/n8n/docker-compose.yml
```

### 3. Update Caddyfile
```bash
cat >> ~/n8n/Caddyfile << 'EOF'

engagement.algomarketing.com {
    reverse_proxy engagement-dashboard:3001
    header {
        Strict-Transport-Security "max-age=31536000"
    }
}
EOF
```

### 4. Create environment file for Slack credentials
```bash
cat >> ~/n8n/.env << 'EOF'

# Engagement Dashboard Slack Credentials
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
EOF
```

### 5. Create tools directory structure
```bash
mkdir -p ~/n8n/tools/engagement-dashboard
```

## GitHub Repository Setup

### 1. Create GitHub Secrets
Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `SERVER_HOST`: Your Digital Ocean server IP (e.g., `134.209.xxx.xxx`)
- `SERVER_USER`: SSH username (usually `root`)
- `SERVER_SSH_KEY`: Your private SSH key content

### 2. Repository Configuration
The GitHub Actions workflow is already configured for the repository: `lukealgo/engagement-dashboard`

### 3. Repository structure
Your GitHub repository structure:
```
engagement-dashboard/
├── Dockerfile
├── package.json
├── src/
├── client/
├── .github/
│   └── workflows/
│       └── deploy.yml
└── ... (all engagement dashboard files)
```

## Slack App Configuration

### 1. Create a Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Engagement Dashboard Bot"
4. Choose your workspace

### 2. Configure Bot Permissions
Under "OAuth & Permissions", add these scopes:
- `channels:read`
- `channels:history`
- `users:read`
- `reactions:read`

### 3. Install App to Workspace
Click "Install to Workspace" and copy the Bot User OAuth Token (`xoxb-...`)

### 4. Get Signing Secret
Under "Basic Information" → "App Credentials", copy the Signing Secret

## Deployment Process

### 1. Manual First Deployment
```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to project directory
cd ~/n8n

# Create the tools directory and clone your repo
mkdir -p tools
cd tools
git clone https://github.com/lukealgo/engagement-dashboard.git engagement-dashboard
cd ..

# Update environment variables
nano .env
# Add your SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET

# Build and start the service
docker-compose up -d engagement-dashboard

# Reload Caddy to pick up new domain
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 2. Automatic Deployments
After the initial setup, every push to the `main` branch will automatically:
1. Pull the latest code
2. Rebuild the Docker image
3. Restart the service
4. Clean up old images

## Verification

### 1. Check service status
```bash
docker-compose ps engagement-dashboard
docker-compose logs engagement-dashboard
```

### 2. Test the application
- Visit: https://engagement.algomarketing.com
- Check health endpoint: https://engagement.algomarketing.com/health

### 3. Verify Slack integration
- Invite the bot to a channel: `/invite @Engagement Dashboard Bot`
- Sync channel data through the dashboard

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs engagement-dashboard

# Check if environment variables are set
docker-compose exec engagement-dashboard env | grep SLACK
```

### Database issues
```bash
# Check if volume is mounted
docker-compose exec engagement-dashboard ls -la /app/data/

# Reset database (CAUTION: This will delete all data)
docker-compose down engagement-dashboard
docker volume rm n8n_engagement_data
docker-compose up -d engagement-dashboard
```

### Caddy/SSL issues
```bash
# Reload Caddy configuration
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Check Caddy logs
docker-compose logs caddy
```

## Monitoring

### 1. Health Checks
The service includes built-in health checks. Monitor with:
```bash
# Check health status
curl https://engagement.algomarketing.com/health

# Monitor container health
docker-compose ps engagement-dashboard
```

### 2. Logs
```bash
# View real-time logs
docker-compose logs -f engagement-dashboard

# View recent logs
docker-compose logs --tail=100 engagement-dashboard
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **SSH Keys**: Use dedicated deployment keys, not personal SSH keys
3. **Slack Tokens**: Rotate tokens regularly and use workspace-specific bots
4. **Server Access**: Limit SSH access and use key-based authentication only
5. **HTTPS**: All traffic is encrypted via Caddy's automatic SSL

## Backup Strategy

### 1. Database Backup
```bash
# Create backup
docker-compose exec engagement-dashboard sqlite3 /app/data/engagement.db ".backup '/app/data/backup-$(date +%Y%m%d).db'"

# Copy backup to host
docker cp $(docker-compose ps -q engagement-dashboard):/app/data/backup-$(date +%Y%m%d).db ./engagement-backup-$(date +%Y%m%d).db
```

### 2. Volume Backup
```bash
# Backup entire data volume
docker run --rm -v n8n_engagement_data:/data -v $(pwd):/backup alpine tar czf /backup/engagement-data-$(date +%Y%m%d).tar.gz -C /data .
```

## Updates and Maintenance

### 1. Update Dependencies
Push changes to GitHub - the system will automatically deploy.

### 2. Manual Updates
```bash
# SSH to server
cd ~/n8n
docker-compose pull engagement-dashboard
docker-compose up -d engagement-dashboard
```

### 3. System Maintenance
```bash
# Clean up unused Docker resources
docker system prune -f

# Update base system
apt update && apt upgrade -y
```
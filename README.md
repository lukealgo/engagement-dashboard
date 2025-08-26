# Slack Engagement Dashboard

A comprehensive dashboard to track and analyze Slack channel engagement metrics with real-time data visualization.

## Features

- **Real-time Engagement Metrics**: Track messages, reactions, active users, and engagement scores
- **Interactive Charts**: Visualize engagement trends over time with customizable date ranges
- **User Rankings**: See top contributors based on activity and engagement
- **Multi-channel Support**: Monitor multiple Slack channels from a single dashboard
- **Automated Data Sync**: Scheduled synchronization with Slack workspace data
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

### Backend
- Node.js with Express.js
- TypeScript for type safety
- Slack Web API SDK for data fetching
- SQLite database for data storage
- Automated scheduling with node-cron

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Recharts for data visualization
- Axios for API communication
- Responsive CSS design

## Prerequisites

- Node.js 18+ 
- A Slack workspace with admin access
- A Slack Bot Token with the following permissions:
  - `channels:read`
  - `channels:history`
  - `users:read`
  - `groups:read`
  - `groups:history`

## Setup Instructions

### 1. Slack App Configuration

1. Go to [Slack API](https://api.slack.com/apps) and create a new app
2. Navigate to "OAuth & Permissions" and add the following Bot Token Scopes:
   - `channels:read`
   - `channels:history`
   - `users:read`
   - `groups:read`
   - `groups:history`
3. Install the app to your workspace
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 2. Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Add your Slack credentials to `.env`:
   ```env
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   PORT=3001
   NODE_ENV=development
   DATABASE_URL=./engagement.db
   ```

### 3. Backend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript code:
   ```bash
   npm run server:build
   ```

3. Start the backend server:
   ```bash
   npm run server:dev
   ```

   The server will start on http://localhost:3001

### 4. Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install client dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will start on http://localhost:5173

### 5. Development Mode (Both Frontend & Backend)

Run both servers simultaneously from the root directory:
```bash
npm run dev
```

## Usage

1. **Access the Dashboard**: Open http://localhost:5173 in your browser

2. **Select a Channel**: Use the channel dropdown to select a Slack channel to analyze

3. **Sync Data**: Click "Sync Data" to fetch the latest messages and engagement data from Slack

4. **View Metrics**: 
   - Overview cards show total messages, active users, reactions, and engagement scores
   - The chart displays engagement trends over time
   - User rankings show the most active contributors

5. **Customize Views**: 
   - Change time ranges for charts and rankings
   - Switch between different channels
   - Data automatically refreshes with scheduled sync

## API Endpoints

### Slack Data
- `GET /api/slack/channels` - List all channels
- `GET /api/slack/channels/:id/messages` - Get channel messages
- `GET /api/slack/users` - List all users

### Engagement Analytics
- `GET /api/engagement/metrics` - Get engagement metrics
- `GET /api/engagement/channels/:id/activity` - Get channel activity summary
- `GET /api/engagement/users/rankings` - Get user activity rankings
- `POST /api/engagement/sync` - Manually trigger data sync

### Health Check
- `GET /health` - Server health status

## Engagement Score Calculation

The engagement score is calculated using a weighted formula:
- Messages: 1 point each
- Reactions: 2 points each
- Thread replies: 1.5 points each
- Unique active users: 0.5 points each

Final score = Total points / Number of unique users

## Scheduled Sync

The application automatically syncs data:
- **Hourly**: Updates existing channel data
- **Daily (2 AM)**: Full sync including new channels and users

## Production Deployment

1. Set environment variables:
   ```env
   NODE_ENV=production
   DATABASE_URL=path/to/production.db
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Start the production server:
   ```bash
   npm start
   ```

## Development Commands

```bash
# Backend
npm run server:dev      # Start backend in development mode
npm run server:build    # Build TypeScript
npm run lint           # Run ESLint
npm run typecheck      # Check TypeScript types

# Frontend
npm run client:dev     # Start frontend development server
npm run client:build   # Build frontend for production

# Both
npm run dev           # Start both frontend and backend
npm run build         # Build both for production
```

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure `.env` file exists with valid `SLACK_BOT_TOKEN`

2. **"Failed to fetch channels"**
   - Verify bot token permissions in Slack App settings
   - Check if the bot is added to the workspace

3. **Database errors**
   - Ensure write permissions for the database file location
   - Check available disk space

4. **CORS errors**
   - Verify frontend and backend URLs are correctly configured
   - Check environment variables in client

### Debugging

Enable debug logging by setting:
```env
DEBUG=engagement-dashboard:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details
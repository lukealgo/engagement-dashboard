import express from 'express';
import cors from 'cors';
import path from 'path';
import { setupDatabase } from './database/setup';
import { slackRouter } from './routes/slack';
import { engagementRouter } from './routes/engagement';
import { ScheduledSync } from './services/ScheduledSync';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from client dist directory
app.use(express.static(path.join(__dirname, '../client/dist')));

app.use('/api/slack', slackRouter);
app.use('/api/engagement', engagementRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

async function startServer(): Promise<void> {
  try {
    await setupDatabase();
    
    // Start scheduled sync
    const scheduledSync = new ScheduledSync();
    scheduledSync.start();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
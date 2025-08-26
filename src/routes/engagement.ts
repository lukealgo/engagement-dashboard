import { Router } from 'express';
import { EngagementService } from '../services/EngagementService';

const router = Router();
const engagementService = new EngagementService();

router.get('/metrics', async (req, res) => {
  try {
    const { channelId, startDate, endDate } = req.query;
    
    const metrics = await engagementService.getEngagementMetrics({
      channelId: channelId as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({ error: 'Failed to fetch engagement metrics' });
  }
});

router.get('/workspace/overview', async (req, res) => {
  try {
    const { days = '30' } = req.query;
    
    const overview = await engagementService.getWorkspaceOverview(parseInt(days as string));
    
    res.json(overview);
  } catch (error) {
    console.error('Error fetching workspace overview:', error);
    res.status(500).json({ error: 'Failed to fetch workspace overview' });
  }
});

router.get('/channels/:channelId/activity', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { days = '30' } = req.query;
    
    const activity = await engagementService.getChannelActivity(
      channelId,
      parseInt(days as string)
    );
    
    res.json(activity);
  } catch (error) {
    console.error('Error fetching channel activity:', error);
    res.status(500).json({ error: 'Failed to fetch channel activity' });
  }
});

router.get('/users/rankings', async (req, res) => {
  try {
    const { channelId, days = '30' } = req.query;
    
    const rankings = await engagementService.getUserRankings({
      channelId: channelId as string,
      days: parseInt(days as string)
    });
    
    res.json(rankings);
  } catch (error) {
    console.error('Error fetching user rankings:', error);
    res.status(500).json({ error: 'Failed to fetch user rankings' });
  }
});

router.get('/top-posts', async (req, res) => {
  try {
    const { days = '30', limit = '10' } = req.query;
    
    const topPosts = await engagementService.getTopPosts(
      parseInt(days as string), 
      parseInt(limit as string)
    );
    
    res.json(topPosts);
  } catch (error) {
    console.error('Error fetching top posts:', error);
    res.status(500).json({ error: 'Failed to fetch top posts' });
  }
});

router.get('/user-activation', async (req, res) => {
  try {
    const { days = '30' } = req.query;
    
    const activationMetrics = await engagementService.getUserActivationMetrics(
      parseInt(days as string)
    );
    
    res.json(activationMetrics);
  } catch (error) {
    console.error('Error fetching user activation metrics:', error);
    res.status(500).json({ error: 'Failed to fetch user activation metrics' });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const { channelId } = req.body;
    await engagementService.syncChannelData(channelId);
    res.json({ message: 'Sync initiated successfully' });
  } catch (error) {
    console.error('Error initiating sync:', error);
    res.status(500).json({ error: 'Failed to initiate sync' });
  }
});

router.post('/sync/all', async (req, res) => {
  try {
    await engagementService.syncAllChannels();
    res.json({ message: 'All channels sync initiated successfully' });
  } catch (error) {
    console.error('Error initiating full sync:', error);
    res.status(500).json({ error: 'Failed to initiate full sync' });
  }
});

export { router as engagementRouter };
import { Router } from 'express';
import { SlackService } from '../services/SlackService';

const router = Router();
const slackService = new SlackService();

router.get('/channels', async (req, res) => {
  try {
    const channels = await slackService.getChannels();
    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.get('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = '100', oldest } = req.query;
    
    const messages = await slackService.getChannelMessages(
      channelId,
      parseInt(limit as string),
      oldest as string
    );
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await slackService.getUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export { router as slackRouter };
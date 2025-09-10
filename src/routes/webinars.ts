import { Router } from 'express';
import multer from 'multer';
import { WebinarService } from '../services/WebinarService';

const router = Router();
const webinarService = new WebinarService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Get all webinars
router.get('/', async (req, res) => {
  try {
    const webinars = await webinarService.getWebinars();
    res.json(webinars);
  } catch (error) {
    console.error('Error fetching webinars:', error);
    res.status(500).json({ error: 'Failed to fetch webinars' });
  }
});

// Get webinar hosts
router.get('/hosts', async (req, res) => {
  try {
    const hosts = await webinarService.getWebinarHosts();
    res.json(hosts);
  } catch (error) {
    console.error('Error fetching webinar hosts:', error);
    res.status(500).json({ error: 'Failed to fetch webinar hosts' });
  }
});

// Get webinar statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await webinarService.getWebinarStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching webinar statistics:', error);
    res.status(500).json({ error: 'Failed to fetch webinar statistics' });
  }
});

// Get webinar by ID (must be last to avoid conflicts)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const webinar = await webinarService.getWebinar(parseInt(id));

    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }

    res.json(webinar);
  } catch (error) {
    console.error('Error fetching webinar:', error);
    res.status(500).json({ error: 'Failed to fetch webinar' });
  }
});

// Upload CSV and create webinar
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file provided' });
    }

    const { webinarName, webinarHost } = req.body;

    if (!webinarName || !webinarHost) {
      return res.status(400).json({
        error: 'Webinar name and host are required'
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await webinarService.uploadCSV(
      csvContent,
      webinarName,
      webinarHost
    );

    res.json(result);
  } catch (error) {
    console.error('Error uploading CSV:', error);
    res.status(500).json({
      error: 'Failed to process CSV file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete webinar
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await webinarService.deleteWebinar(parseInt(id));
    res.json({ message: 'Webinar deleted successfully' });
  } catch (error) {
    console.error('Error deleting webinar:', error);
    res.status(500).json({ error: 'Failed to delete webinar' });
  }
});

export { router as webinarRouter };

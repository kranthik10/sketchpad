import express from 'express';
import collabRoutes from './collab.routes.js';
import monitorRoutes from './monitor.routes.js';

const router = express.Router();

router.get('/health', (_request, response) => {
  response.json({ ok: true });
});

router.use('/collab', collabRoutes);
router.use('/monitor', monitorRoutes);

export default router;

import express from 'express';
import collabRoutes from './collab.routes.js';

const router = express.Router();

router.get('/health', (_request, response) => {
  response.json({ ok: true });
});

router.use('/collab', collabRoutes);

export default router;

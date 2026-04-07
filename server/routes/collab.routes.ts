import express from 'express';
import { startSession, stopSession } from '../controllers/collab.controller.js';

const router = express.Router();

router.post('/start-session', startSession);
router.post('/stop-session', stopSession);

export default router;

import express from 'express';
import { getCodeReview } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/review', getCodeReview);

export default router;
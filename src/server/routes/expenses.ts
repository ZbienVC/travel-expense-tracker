import express, { Request, Response, Router } from 'express';
import { prisma } from '../index';
import { extractReceiptData } from '../services/visionService';
import logger from '../logger';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router: Router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP allowed.'));
    }
  },
});

/**
 * POST /api/expenses/scan
 * Scan receipt image and extract data
 * Body: { file: image, userId: string, tripId?: string }
 */
router.post('/scan', upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, tripId } = req.body;

    if (!userId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract receipt data using Vision API
    logger.info(`Processing receipt for user ${userId}`);
    const receiptData = await extractReceiptData(req.file.path);

    if (!receiptData.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: receiptData.error || 'Failed to process receipt',
      });
    }

    // Move file to permanent storage
    const uploadDir = path.join(process.cwd(), 'uploads', userId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `receipt-${Date.now()}.jpg`;
    const permanentPath = path.join(uploadDir, fileName);
    fs.renameSync(req.file.path, permanentPath);

    const receiptUrl = `/uploads/${userId}/${fileName}`;

    res.json({
      success: true,
      data: {
        ...receiptData.data,
        receiptUrl,
        confidence: receiptData.data?.confidence || 0,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    logger.error(`Receipt scan error: ${error}`);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

/**
 * POST /api/expenses
 * Create expense (with optional OCR pre-filled data)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, tripId, amount, category, description, date, receiptUrl, ocrData } = req.body;

    if (!userId || !amount || !category || !date) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, category, date',
      });
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        tripId: tripId || null,
        amount: parseFloat(amount),
        currency: 'USD',
        category,
        description: description || '',
        date: new Date(date),
        receiptUrl: receiptUrl || null,
        ocrData: ocrData ? JSON.stringify(ocrData) : null,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    logger.error(`Expense creation error: ${error}`);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

/**
 * GET /api/expenses/trip/:tripId
 * Get all expenses for a trip
 */
router.get('/trip/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const expenses = await prisma.expense.findMany({
      where: { tripId },
      orderBy: { date: 'desc' },
    });

    res.json(expenses);
  } catch (error) {
    logger.error(`Expense fetch error: ${error}`);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

/**
 * GET /api/expenses/:id
 * Get single expense
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    logger.error(`Expense fetch error: ${error}`);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

/**
 * PUT /api/expenses/:id
 * Update expense
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, category, description, date } = req.body;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        ...(category && { category }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
      },
    });

    res.json(expense);
  } catch (error) {
    logger.error(`Expense update error: ${error}`);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete expense
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.expense.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error(`Expense delete error: ${error}`);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;

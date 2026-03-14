import vision from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';
import logger from '../logger';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_VISION_KEY_PATH,
});

export interface OCRResult {
  success: boolean;
  text: string;
  confidence?: number;
  fullResponse?: vision.protos.google.cloud.vision.v1.TextAnnotation;
  error?: string;
}

/**
 * Extract text from image file using Google Vision API
 * @param imagePath - Local file path or GCS URI
 * @returns OCR extracted text and metadata
 */
export async function extractTextFromImage(imagePath: string): Promise<OCRResult> {
  try {
    // Validate input
    if (!imagePath) {
      throw new Error('Image path is required');
    }

    // Read image from file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Call Vision API
    const request = {
      image: {
        content: base64Image,
      },
      features: [
        {
          type: 'DOCUMENT_TEXT_DETECTION',
        },
        {
          type: 'TEXT_DETECTION',
        },
      ],
    };

    const [result] = await client.annotateImage(request);
    const annotations = result.textAnnotations;

    if (!annotations || annotations.length === 0) {
      logger.warn(`No text detected in image: ${imagePath}`);
      return {
        success: true,
        text: '',
        confidence: 0,
      };
    }

    // Full text is in first annotation
    const fullText = annotations[0].description || '';
    const confidence = annotations[0].confidence || 0;

    logger.info(`Successfully extracted ${fullText.length} chars from image: ${imagePath}`);

    return {
      success: true,
      text: fullText,
      confidence: confidence,
      fullResponse: annotations[0],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Vision API error for ${imagePath}: ${errorMessage}`);

    return {
      success: false,
      text: '',
      error: errorMessage,
    };
  }
}

/**
 * Extract text from receipt image with receipt-specific processing
 * @param imagePath - Local file path or GCS URI
 * @returns Parsed receipt data
 */
export async function extractReceiptData(imagePath: string) {
  const ocr = await extractTextFromImage(imagePath);

  if (!ocr.success) {
    return {
      success: false,
      data: null,
      error: ocr.error,
    };
  }

  // Parse receipt text to extract amount, date, merchant
  const parsed = parseReceiptText(ocr.text);

  return {
    success: true,
    data: {
      rawText: ocr.text,
      confidence: ocr.confidence,
      ...parsed,
    },
    error: null,
  };
}

/**
 * Parse receipt text to extract structured data
 */
function parseReceiptText(text: string) {
  // This is a basic parser - can be enhanced with ML/regex patterns
  const lines = text.split('\n');

  // Extract amount (look for currency symbols and numbers)
  const amountMatch = text.match(/(?:[\$€£]|USD|EUR|GBP)\s*(\d+[\.,]\d{2})/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;

  // Extract date (simple ISO-like patterns)
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? new Date(dateMatch[1]) : null;

  // Extract merchant name (usually near top)
  const merchant = lines[0] || '';

  return {
    amount,
    date,
    merchant: merchant.trim(),
    itemCount: lines.length,
  };
}

/**
 * Batch process multiple receipt images
 */
export async function batchExtractReceipts(imagePaths: string[]) {
  const results = await Promise.all(
    imagePaths.map(async (path) => {
      const result = await extractReceiptData(path);
      return {
        path,
        ...result,
      };
    })
  );

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  logger.info(`Batch OCR: ${successful.length} succeeded, ${failed.length} failed`);

  return { results, successful, failed };
}

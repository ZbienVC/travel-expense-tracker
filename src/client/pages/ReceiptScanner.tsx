import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Scanner.css';

interface OCRResult {
  rawText: string;
  merchant: string;
  amount: number | null;
  date: string | null;
  itemCount: number;
  confidence: number;
  receiptUrl: string;
}

export default function ReceiptScanner({ userId }: { userId: string }) {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleScan = async () => {
    if (!file || !tripId || !userId) {
      setError('Missing required data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('userId', userId);
      formData.append('tripId', tripId);

      const response = await fetch('/api/expenses/scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan receipt');
      }

      const result = await response.json();
      setOcrResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!ocrResult || !tripId || !userId) {
      setError('Missing OCR result');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tripId,
          amount: ocrResult.amount || 0,
          category: 'food', // Default category, can be overridden in form
          description: ocrResult.merchant || 'Receipt expense',
          date: ocrResult.date || new Date().toISOString(),
          receiptUrl: ocrResult.receiptUrl,
          ocrData: {
            merchant: ocrResult.merchant,
            rawText: ocrResult.rawText,
            confidence: ocrResult.confidence,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create expense');
      }

      // Redirect to dashboard
      navigate(`/trip/${tripId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setOcrResult(null);
    setError(null);
  };

  return (
    <div className="scanner-container">
      <h1>📸 Receipt Scanner</h1>
      <p className="description">Take a photo or upload an image of your receipt</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="scanner-grid">
        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-area">
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Receipt preview" className="receipt-preview" />
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📷</div>
                <p>Click to select receipt image</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
              disabled={loading || submitting}
            />
          </div>

          {file && !loading && !ocrResult && (
            <button onClick={handleScan} className="btn btn-primary btn-lg">
              {loading ? 'Scanning...' : 'Scan Receipt'}
            </button>
          )}

          {ocrResult && (
            <button onClick={handleReset} className="btn btn-secondary">
              Scan Another
            </button>
          )}
        </div>

        {/* OCR Result Section */}
        {loading && (
          <div className="result-section">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Extracting receipt data...</p>
            </div>
          </div>
        )}

        {ocrResult && (
          <div className="result-section">
            <div className="ocr-result">
              <h2>Extracted Data</h2>

              <div className="result-item">
                <label>Merchant</label>
                <input
                  type="text"
                  value={ocrResult.merchant}
                  readOnly
                  className="result-input"
                />
              </div>

              <div className="result-item">
                <label>Amount</label>
                <div className="amount-display">
                  ${ocrResult.amount?.toFixed(2) || '0.00'}
                </div>
              </div>

              <div className="result-item">
                <label>Date</label>
                <div className="date-display">
                  {ocrResult.date
                    ? new Date(ocrResult.date).toLocaleDateString()
                    : 'Date not found'}
                </div>
              </div>

              <div className="result-item">
                <label>Confidence</label>
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{ width: `${ocrResult.confidence * 100}%` }}
                  ></div>
                </div>
                <span className="confidence-text">
                  {(ocrResult.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="result-item">
                <label>Raw Text</label>
                <textarea
                  value={ocrResult.rawText}
                  readOnly
                  className="result-textarea"
                  rows={6}
                />
              </div>

              <div className="result-actions">
                <button
                  onClick={handleCreateExpense}
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                >
                  {submitting ? 'Creating...' : '✓ Create Expense'}
                </button>
                <button onClick={handleReset} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

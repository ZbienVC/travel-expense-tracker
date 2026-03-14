import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/DistanceTracker.css';

interface TravelSegment {
  id: string;
  type: string;
  origin: string;
  destination: string;
  distanceMiles: number | null;
  date: string;
  notes: string | null;
}

interface DistanceResult {
  success: boolean;
  data?: {
    distanceMiles: number;
    distanceKm: number;
    durationMinutes: number;
    origin: string;
    destination: string;
  };
  error?: string;
}

const TRANSPORT_TYPES = ['flight', 'car', 'train', 'bus', 'walking', 'other'];

export default function DistanceTracker({ userId }: { userId: string }) {
  const { tripId } = useParams<{ tripId: string }>();
  const [segments, setSegments] = useState<TravelSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'car',
    origin: '',
    destination: '',
    distanceMiles: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calcResult, setCalcResult] = useState<DistanceResult['data'] | null>(null);

  useEffect(() => {
    fetchSegments();
  }, [tripId]);

  const fetchSegments = async () => {
    if (!tripId) return;
    try {
      const response = await fetch(`/api/segments/trip/${tripId}`);
      if (!response.ok) throw new Error('Failed to fetch segments');
      const data = await response.json();
      setSegments(data.segments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load segments');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateDistance = async () => {
    if (!formData.origin || !formData.destination) {
      setError('Please enter origin and destination');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const response = await fetch('/api/segments/calculate-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: formData.origin,
          destination: formData.destination,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate distance');
      }

      const result = await response.json();
      setCalcResult(result.data);
      setFormData((prev) => ({
        ...prev,
        distanceMiles: result.data.distanceMiles.toString(),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate distance');
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tripId || !formData.origin || !formData.destination || !formData.date) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          type: formData.type,
          origin: formData.origin,
          destination: formData.destination,
          distanceMiles: formData.distanceMiles ? parseFloat(formData.distanceMiles) : null,
          date: formData.date,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add segment');
      }

      // Reset form and refresh segments
      setFormData({
        type: 'car',
        origin: '',
        destination: '',
        distanceMiles: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setCalcResult(null);
      await fetchSegments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add segment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm('Delete this segment?')) return;

    try {
      const response = await fetch(`/api/segments/${segmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete segment');

      setSegments((prev) => prev.filter((s) => s.id !== segmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete segment');
    }
  };

  const totalDistance = segments.reduce((sum, s) => sum + (s.distanceMiles || 0), 0);

  if (loading) return <div className="loading">Loading distance tracker...</div>;

  return (
    <div className="distance-tracker">
      <h1>🚗 Distance Tracker</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* Summary Card */}
      <div className="summary-card">
        <div className="summary-item">
          <div className="summary-label">Total Distance</div>
          <div className="summary-value">{totalDistance.toFixed(1)} mi</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Segments</div>
          <div className="summary-value">{segments.length}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Avg per Segment</div>
          <div className="summary-value">
            {segments.length > 0 ? (totalDistance / segments.length).toFixed(1) : '0'} mi
          </div>
        </div>
      </div>

      {/* Add Segment Form */}
      <div className="form-section">
        <h2>Add Travel Segment</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Transport Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="form-control"
              >
                {TRANSPORT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Origin (City/Airport) *</label>
              <input
                type="text"
                placeholder="e.g., New York, JFK"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Destination (City/Airport) *</label>
              <input
                type="text"
                placeholder="e.g., Boston, BOS"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          {/* Distance Calculator */}
          {['car', 'train', 'bus'].includes(formData.type) && (
            <div className="calculator-section">
              <button
                type="button"
                onClick={handleCalculateDistance}
                disabled={calculating || !formData.origin || !formData.destination}
                className="btn btn-secondary"
              >
                {calculating ? 'Calculating...' : '📏 Calculate Distance'}
              </button>

              {calcResult && (
                <div className="calc-result">
                  <div className="result-stat">
                    <span className="label">Distance:</span>
                    <span className="value">{calcResult.distanceMiles.toFixed(1)} mi</span>
                  </div>
                  <div className="result-stat">
                    <span className="label">Duration:</span>
                    <span className="value">{calcResult.durationMinutes} min</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Distance (Miles)</label>
              <input
                type="number"
                placeholder="0"
                step="0.1"
                value={formData.distanceMiles}
                onChange={(e) => setFormData({ ...formData, distanceMiles: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <input
                type="text"
                placeholder="Optional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary btn-lg">
            {submitting ? 'Adding...' : '➕ Add Segment'}
          </button>
        </form>
      </div>

      {/* Segments List */}
      <div className="segments-list">
        <h2>Travel Segments ({segments.length})</h2>
        {segments.length === 0 ? (
          <p className="empty-state">No segments added yet</p>
        ) : (
          <div className="segments">
            {segments.map((segment) => (
              <div key={segment.id} className="segment-card">
                <div className="segment-header">
                  <div className="transport-type">{segment.type.toUpperCase()}</div>
                  <div className="segment-date">
                    {new Date(segment.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="segment-route">
                  <div className="route-point">{segment.origin}</div>
                  <div className="route-arrow">→</div>
                  <div className="route-point">{segment.destination}</div>
                </div>
                {segment.distanceMiles && (
                  <div className="segment-distance">📏 {segment.distanceMiles.toFixed(1)} mi</div>
                )}
                {segment.notes && <div className="segment-notes">{segment.notes}</div>}
                <button
                  onClick={() => handleDeleteSegment(segment.id)}
                  className="btn btn-delete btn-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

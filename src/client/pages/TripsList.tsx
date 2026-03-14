import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/TripsList.css';

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  summary: {
    totalExpenses: number;
    expenseCount: number;
    totalMiles: number;
    segmentCount: number;
  };
}

export default function TripsList({ userId }: { userId: string }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTripForm, setShowNewTripForm] = useState(false);

  const [newTrip, setNewTrip] = useState({
    name: '',
    destination: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, [userId]);

  const fetchTrips = async () => {
    try {
      const response = await fetch(`/api/trips/user/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch trips');
      const data = await response.json();
      setTrips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTrip.name || !newTrip.startDate || !newTrip.endDate) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: newTrip.name,
          destination: newTrip.destination || null,
          startDate: newTrip.startDate,
          endDate: newTrip.endDate,
        }),
      });

      if (!response.ok) throw new Error('Failed to create trip');

      // Reset form and refresh
      setNewTrip({
        name: '',
        destination: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setShowNewTripForm(false);
      await fetchTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Delete this trip? This will also delete all associated expenses and segments.'))
      return;

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete trip');

      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip');
    }
  };

  if (loading) return <div className="loading">Loading trips...</div>;

  return (
    <div className="trips-container">
      <div className="trips-header">
        <h1>🏖️ Travel Expense Tracker</h1>
        <p className="subtitle">Track expenses across your trips</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* New Trip Form */}
      {showNewTripForm && (
        <div className="new-trip-form">
          <h2>Create New Trip</h2>
          <form onSubmit={handleCreateTrip}>
            <div className="form-group">
              <label>Trip Name *</label>
              <input
                type="text"
                placeholder="e.g., Paris Summer 2024"
                value={newTrip.name}
                onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Destination</label>
                <input
                  type="text"
                  placeholder="e.g., Paris, France"
                  value={newTrip.destination}
                  onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={newTrip.startDate}
                  onChange={(e) => setNewTrip({ ...newTrip, startDate: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={newTrip.endDate}
                  onChange={(e) => setNewTrip({ ...newTrip, endDate: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? 'Creating...' : '✓ Create Trip'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewTripForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Trip Button */}
      {!showNewTripForm && (
        <button
          onClick={() => setShowNewTripForm(true)}
          className="btn btn-primary btn-lg create-trip-btn"
        >
          ➕ Create New Trip
        </button>
      )}

      {/* Trips Grid */}
      {trips.length === 0 ? (
        <div className="empty-state">
          <p>No trips yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map((trip) => {
            const startDate = new Date(trip.startDate);
            const endDate = new Date(trip.endDate);
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <Link key={trip.id} to={`/trip/${trip.id}`} className="trip-card-link">
                <div className="trip-card">
                  <div className="trip-header">
                    <h2>{trip.name}</h2>
                    {trip.destination && <p className="destination">📍 {trip.destination}</p>}
                  </div>

                  <div className="trip-dates">
                    {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                    <span className="trip-duration">({days} days)</span>
                  </div>

                  <div className="trip-stats">
                    <div className="stat">
                      <div className="stat-label">Spent</div>
                      <div className="stat-value">${trip.summary.totalExpenses.toFixed(2)}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Expenses</div>
                      <div className="stat-value">{trip.summary.expenseCount}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Distance</div>
                      <div className="stat-value">{trip.summary.totalMiles.toFixed(0)} mi</div>
                    </div>
                  </div>

                  <div className="trip-actions">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteTrip(trip.id);
                      }}
                      className="btn btn-sm btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

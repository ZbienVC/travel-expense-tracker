import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import Navigation from './components/Navigation';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ReceiptScanner from './pages/ReceiptScanner';
import DistanceTracker from './pages/DistanceTracker';
import ExpenseForm from './pages/ExpenseForm';
import TripsList from './pages/TripsList';

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple user ID from localStorage or generate one
    const stored = localStorage.getItem('userId');
    if (stored) {
      setUserId(stored);
    } else {
      const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', newId);
      setUserId(newId);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!userId) {
    return <div className="error">Failed to initialize user</div>;
  }

  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<TripsList userId={userId} />} />
            <Route path="/trip/:tripId" element={<AnalyticsDashboard userId={userId} />} />
            <Route path="/trip/:tripId/expenses" element={<ExpenseForm userId={userId} />} />
            <Route path="/trip/:tripId/scan" element={<ReceiptScanner userId={userId} />} />
            <Route path="/trip/:tripId/distance" element={<DistanceTracker userId={userId} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

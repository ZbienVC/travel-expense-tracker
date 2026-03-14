import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import '../styles/Dashboard.css';

interface AnalyticsData {
  trip: {
    id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalExpenses: number;
    expenseCount: number;
    tripDays: number;
    totalMiles: number;
    costPerDay: number;
    costPerMile: number;
  };
  categoryBreakdown: Record<string, number>;
  dailySpending: Record<string, number>;
  largestCategories: Array<{ category: string; amount: number; percentage: number }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function AnalyticsDashboard({ userId }: { userId: string }) {
  const { tripId } = useParams<{ tripId: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/analytics/trip/${tripId}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const analytics = await response.json();
        setData(analytics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [tripId]);

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="error">No analytics data</div>;

  const dailySpendingArray = Object.entries(data.dailySpending).map(([date, amount]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: Math.round(amount * 100) / 100,
  }));

  const categoryArray = Object.entries(data.categoryBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(value * 100) / 100,
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{data.trip.name}</h1>
        <p className="destination">📍 {data.trip.destination || 'Destination TBA'}</p>
        <p className="dates">
          {new Date(data.trip.startDate).toLocaleDateString()} -{' '}
          {new Date(data.trip.endDate).toLocaleDateString()}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Spent</div>
          <div className="metric-value">${data.summary.totalExpenses.toFixed(2)}</div>
          <div className="metric-subtext">{data.summary.expenseCount} expenses</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Cost Per Day</div>
          <div className="metric-value">${data.summary.costPerDay.toFixed(2)}</div>
          <div className="metric-subtext">{data.summary.tripDays} days</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Cost Per Mile</div>
          <div className="metric-value">${data.summary.costPerMile.toFixed(2)}</div>
          <div className="metric-subtext">{data.summary.totalMiles.toFixed(0)} miles</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Expenses</div>
          <div className="metric-value">{data.summary.expenseCount}</div>
          <div className="metric-subtext">recorded</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-container">
        {/* Category Breakdown Pie Chart */}
        <div className="chart-wrapper">
          <h2>Expenses by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryArray}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryArray.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Spending Line Chart */}
        <div className="chart-wrapper">
          <h2>Daily Spending Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySpendingArray}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#82ca9d"
                name="Daily Spend"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Comparison Bar Chart */}
        <div className="chart-wrapper">
          <h2>Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryArray}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Bar dataKey="value" fill="#8884d8" name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Largest Categories */}
      <div className="largest-categories">
        <h2>Top Expense Categories</h2>
        <div className="category-list">
          {data.largestCategories.map((cat) => (
            <div key={cat.category} className="category-item">
              <div className="category-info">
                <span className="category-name">{cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</span>
                <span className="category-percentage">{cat.percentage.toFixed(1)}%</span>
              </div>
              <div className="category-amount">${cat.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <Link to={`/trip/${tripId}/expenses`} className="btn btn-primary">
          ➕ Add Expense
        </Link>
        <Link to={`/trip/${tripId}/scan`} className="btn btn-secondary">
          📸 Scan Receipt
        </Link>
        <Link to={`/trip/${tripId}/distance`} className="btn btn-tertiary">
          🚗 Track Distance
        </Link>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/ExpenseForm.css';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  receiptUrl: string | null;
}

const CATEGORIES = ['food', 'transport', 'accommodation', 'activity', 'other'];

const MERCHANT_CATEGORIES: Record<string, string> = {
  'mc donalds': 'food',
  burger: 'food',
  pizza: 'food',
  restaurant: 'food',
  starbucks: 'food',
  coffee: 'food',
  uber: 'transport',
  lyft: 'transport',
  taxi: 'transport',
  airline: 'transport',
  hotel: 'accommodation',
  airbnb: 'accommodation',
  motel: 'accommodation',
  museum: 'activity',
  ticket: 'activity',
  cinema: 'activity',
};

export default function ExpenseForm({ userId }: { userId: string }) {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    category: 'food',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, [tripId]);

  const fetchExpenses = async () => {
    if (!tripId) return;
    try {
      const response = await fetch(`/api/expenses/trip/${tripId}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const suggestCategory = (description: string): string => {
    const lower = description.toLowerCase();
    for (const [keyword, category] of Object.entries(MERCHANT_CATEGORIES)) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
    return 'other';
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
      category: suggestCategory(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tripId || !formData.amount || !formData.date) {
      setError('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingId) {
        // Update expense
        const response = await fetch(`/api/expenses/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            date: formData.date,
          }),
        });

        if (!response.ok) throw new Error('Failed to update expense');
      } else {
        // Create new expense
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            tripId,
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            date: formData.date,
          }),
        });

        if (!response.ok) throw new Error('Failed to create expense');
      }

      // Reset form and refresh
      setFormData({
        amount: '',
        category: 'food',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setEditingId(null);
      await fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
      date: new Date(expense.date).toISOString().split('T')[0],
    });
    setEditingId(expense.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete expense');

      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    }
  };

  const handleCancel = () => {
    setFormData({
      amount: '',
      category: 'food',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) return <div className="loading">Loading expenses...</div>;

  return (
    <div className="expense-form-container">
      <h1>💰 Expenses</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* Summary */}
      <div className="expense-summary">
        <div className="summary-stat">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">${totalExpenses.toFixed(2)}</div>
        </div>
        <div className="summary-stat">
          <div className="stat-label">Expenses</div>
          <div className="stat-value">{expenses.length}</div>
        </div>
        <div className="summary-stat">
          <div className="stat-label">Avg Expense</div>
          <div className="stat-value">
            ${expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="form-section">
        <h2>{editingId ? 'Edit Expense' : 'Add New Expense'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Description *</label>
            <input
              type="text"
              placeholder="e.g., Dinner at restaurant"
              value={formData.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount (USD) *</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-control"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
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

          <div className="form-actions">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Saving...' : editingId ? '💾 Update' : '➕ Add Expense'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/trip/${tripId}`)}
              className="btn btn-tertiary"
            >
              ← Back to Dashboard
            </button>
          </div>
        </form>
      </div>

      {/* Expenses List */}
      <div className="expenses-section">
        <h2>Expense List ({expenses.length})</h2>
        {expenses.length === 0 ? (
          <p className="empty-state">No expenses yet. Add one above!</p>
        ) : (
          <div className="expenses-list">
            {expenses
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((expense) => (
                <div key={expense.id} className="expense-item">
                  <div className="expense-main">
                    <div className="expense-info">
                      <h3>{expense.description}</h3>
                      <p className="expense-meta">
                        <span className="expense-category">
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                        </span>
                        <span className="expense-date">
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <div className="expense-amount">${expense.amount.toFixed(2)}</div>
                  </div>
                  {expense.receiptUrl && (
                    <div className="receipt-indicator">📷 Receipt scanned</div>
                  )}
                  <div className="expense-actions">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="btn btn-sm btn-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="btn btn-sm btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

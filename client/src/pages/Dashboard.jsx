import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import RequestCard from '../components/RequestCard';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/requests?limit=6');
        // Filter out user's own requests for dashboard recommendations
        const others = res.data.filter(req => req.creator._id !== user._id);
        setRecentRequests(others.slice(0, 6));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    if (user) {
      fetchRequests();
    }
  }, [user]);

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <header className="dashboard-header">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Hey {user?.name.split(' ')[0]} 👋</h1>
        <p style={{ color: 'var(--text-muted)' }}>Looking for someone to...</p>
      </header>

      <div className="categories">
        <Link to="/requests?category=Learning" className="category-card glass-panel">
          <div className="category-icon">🧠</div>
          <h3>Learn</h3>
        </Link>
        <Link to="/requests?category=Building" className="category-card glass-panel">
          <div className="category-icon">💻</div>
          <h3>Build</h3>
        </Link>
        <Link to="/requests?category=Sports" className="category-card glass-panel">
          <div className="category-icon">🏸</div>
          <h3>Play</h3>
        </Link>
        <Link to="/requests?category=Other" className="category-card glass-panel">
          <div className="category-icon">🎨</div>
          <h3>Other</h3>
        </Link>
      </div>

      <div className="section-title">
        <h2>Recent Partner Requests</h2>
        <Link to="/requests" style={{ color: 'var(--primary)', fontSize: '1rem' }}>View All →</Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading requests...</div>
      ) : recentRequests.length > 0 ? (
        <div className="grid-container">
          {recentRequests.map(request => (
            <RequestCard key={request._id} request={request} />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', marginTop: '2rem' }}>
          <h3>No recent requests found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>Be the first to create one!</p>
          <Link to="/create-request" className="btn btn-primary">Create a Request</Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

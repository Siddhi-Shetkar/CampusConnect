import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import RequestCard from '../components/RequestCard';

const MyRequests = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyRequests = async () => {
      try {
        // Find requests where the creator is the current user
        const res = await api.get('/requests');
        const myRequests = res.data.filter(req => req.creator._id === user._id);
        setRequests(myRequests);
      } catch (err) {
        console.error('Error fetching my requests', err);
      }
      setLoading(false);
    };

    if (user) {
      fetchMyRequests();
    }
  }, [user]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/requests/${id}`, { status: newStatus });
      setRequests(requests.map(req => req._id === id ? { ...req, status: newStatus } : req));
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>My Requests</h1>
        <Link to="/create-request" className="btn btn-primary">Create New Request</Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      ) : requests.length > 0 ? (
        <div className="grid-container">
          {requests.map(request => (
            <div key={request._id} style={{ position: 'relative' }}>
              <RequestCard request={request} />
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
                <select 
                  value={request.status} 
                  onChange={(e) => handleStatusChange(request._id, e.target.value)}
                  style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    background: request.status === 'Open' ? 'rgba(16,185,129,0.9)' : 'rgba(245,158,11,0.9)',
                    color: 'white',
                    border: 'none',
                    fontSize: '0.8rem',
                    marginBottom: 0
                  }}
                >
                  <option value="Open">Open</option>
                  <option value="Filled">Filled</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h3>No active requests</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>You haven't created any partner requests yet.</p>
          <Link to="/create-request" className="btn btn-primary">Create Your First Request</Link>
        </div>
      )}
    </div>
  );
};

export default MyRequests;

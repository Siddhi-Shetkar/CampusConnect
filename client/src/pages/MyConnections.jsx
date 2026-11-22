import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import ConnectionCard from '../components/ConnectionCard';

const MyConnections = () => {
  const { user } = useContext(AuthContext);
  const [connections, setConnections] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConnectionsData = async () => {
    try {
      const [connectionsRes, requestsRes] = await Promise.all([
        api.get('/connections'),
        api.get('/connections/received')
      ]);
      setConnections(connectionsRes.data);
      setReceivedRequests(requestsRes.data);
    } catch (err) {
      console.error('Error fetching connections data', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchConnectionsData();
    }
  }, [user]);

  const handleAction = async (id, status) => {
    try {
      await api.put(`/connections/${id}`, { status });
      fetchConnectionsData(); // Refresh the list
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Connections</h1>

      {receivedRequests.length > 0 && (
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Pending Requests</h2>
          <div className="grid-container">
            {receivedRequests.map(req => (
              <div key={req._id} className="card glass-panel" style={{ borderLeft: '4px solid var(--warning)' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{req.sender.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>wants to connect for: <strong>{req.partnerRequest.title}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => handleAction(req._id, 'accepted')} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }}>Accept</button>
                  <button onClick={() => handleAction(req._id, 'rejected')} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>My Partners</h2>
        {connections.length > 0 ? (
          <div className="grid-container">
            {connections.map(connection => {
              const partner = connection.sender._id === user._id ? connection.receiver : connection.sender;
              return <ConnectionCard key={connection._id} partner={partner} request={connection.partnerRequest} />;
            })}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
            <h3>No connections yet</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Send requests to find partners!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyConnections;

import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AuthContext from '../context/AuthContext';

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await api.get(`/requests/${id}`);
        setRequest(res.data);
      } catch (err) {
        setMessage('Request not found');
      }
      setLoading(false);
    };
    fetchRequest();
  }, [id]);

  const handleSendRequest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post('/connections', { partnerRequestId: id });
      setMessage('Partner request sent successfully!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error sending request');
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      setActionLoading(true);
      try {
        await api.delete(`/requests/${id}`);
        navigate('/my-requests');
      } catch (err) {
        setMessage('Error deleting request');
        setActionLoading(false);
      }
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>;
  if (!request) return <div style={{ textAlign: 'center', padding: '4rem' }}>{message || 'Request not found'}</div>;

  const isOwner = user && request.creator._id === user._id;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <span className="badge" style={{ marginBottom: '1rem', display: 'inline-block' }}>{request.category}</span>
            <h1 style={{ fontSize: '2rem' }}>{request.title}</h1>
          </div>
          <span style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '0.5rem', 
            background: request.status === 'Open' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            color: request.status === 'Open' ? 'var(--success)' : 'var(--warning)',
            fontWeight: '600'
          }}>
            {request.status}
          </span>
        </div>

        {message && (
          <div style={{ 
            color: message.includes('success') ? 'var(--success)' : 'var(--danger)', 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            background: message.includes('success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
            borderRadius: '0.5rem' 
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>Description</h3>
              <p style={{ fontSize: '1.1rem', whiteSpace: 'pre-line' }}>{request.description}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Activity</span>
                <p style={{ fontWeight: '500' }}>{request.activity}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Skill Level</span>
                <p style={{ fontWeight: '500' }}>{request.skillLevel}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Availability</span>
                <p style={{ fontWeight: '500' }}>{request.availability}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Frequency</span>
                <p style={{ fontWeight: '500' }}>{request.frequency}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Location</span>
                <p style={{ fontWeight: '500' }}>{request.location || 'Not specified'}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>People Needed</span>
                <p style={{ fontWeight: '500' }}>{request.peopleNeeded}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Posted By</h3>
              <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{request.creator.name}</p>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{request.creator.college} • {request.creator.year}</p>
              
              {request.creator.skills && request.creator.skills.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Skills</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {request.creator.skills.map((skill, index) => (
                      <span key={index} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.25rem' }}>{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              {isOwner ? (
                <button 
                  onClick={handleDelete} 
                  className="btn" 
                  style={{ width: '100%', background: 'var(--danger)', color: 'white' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Delete Request'}
                </button>
              ) : (
                <button 
                  onClick={handleSendRequest} 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={actionLoading || request.status !== 'Open'}
                >
                  {actionLoading ? 'Sending...' : (request.status !== 'Open' ? 'Request Closed' : 'Send Partner Request')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetails;

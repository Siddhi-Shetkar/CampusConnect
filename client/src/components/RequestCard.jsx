import { Link } from 'react-router-dom';

const RequestCard = ({ request }) => {
  return (
    <div className="card glass-panel">
      <div className="card-header">
        <div>
          <span className="badge">{request.category}</span>
          <h3 className="card-title" style={{ marginTop: '0.5rem' }}>{request.title}</h3>
        </div>
      </div>
      
      <div className="card-meta">
        <span>👤 {request.creator?.name || 'Anonymous'}</span>
        <span>🎓 {request.creator?.college || 'College N/A'}</span>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        {request.description.length > 100 ? `${request.description.substring(0, 100)}...` : request.description}
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <span>🎯 {request.skillLevel}</span>
        <span>🕒 {request.availability}</span>
      </div>

      <Link to={`/requests/${request._id}`} className="btn btn-secondary" style={{ width: '100%' }}>
        View Request
      </Link>
    </div>
  );
};

export default RequestCard;

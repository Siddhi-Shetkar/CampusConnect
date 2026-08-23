const ConnectionCard = ({ partner, request }) => {
  return (
    <div className="card glass-panel" style={{ borderLeft: '4px solid var(--success)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          borderRadius: '50%', 
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          {partner.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{partner.name}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{partner.college}</p>
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Connected for:</p>
        <p style={{ fontWeight: '500' }}>{request.title}</p>
        <span className="badge" style={{ marginTop: '0.5rem', display: 'inline-block' }}>{request.category}</span>
      </div>

      <button className="btn btn-primary" style={{ width: '100%' }}>
        Message (Coming Soon)
      </button>
    </div>
  );
};

export default ConnectionCard;

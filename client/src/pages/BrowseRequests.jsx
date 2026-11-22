import { useState, useEffect } from 'react';
import api from '../services/api';
import RequestCard from '../components/RequestCard';

const BrowseRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    activity: '',
    skillLevel: '',
    search: ''
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.activity) queryParams.append('activity', filters.activity);
      if (filters.skillLevel) queryParams.append('skillLevel', filters.skillLevel);
      if (filters.search) queryParams.append('search', filters.search);

      const res = await api.get(`/requests?${queryParams.toString()}`);
      setRequests(res.data);
    } catch (err) {
      console.error('Error fetching requests', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [filters.category, filters.skillLevel]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Find Partners</h1>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="text"
              placeholder="Search by keyword or activity..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Categories</option>
              <option value="Learning">Learning</option>
              <option value="Building">Building</option>
              <option value="Sports">Sports</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <select
              value={filters.skillLevel}
              onChange={(e) => setFilters({ ...filters, skillLevel: e.target.value })}
              style={{ marginBottom: 0 }}
            >
              <option value="">All Skill Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Any">Any</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading requests...</div>
      ) : requests.length > 0 ? (
        <div className="grid-container">
          {requests.map(request => (
            <RequestCard key={request._id} request={request} />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h3>No requests found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
};

export default BrowseRequests;

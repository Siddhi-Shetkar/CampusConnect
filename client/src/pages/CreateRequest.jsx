import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateRequest = () => {
  const [formData, setFormData] = useState({
    category: 'Learning',
    activity: '',
    title: '',
    description: '',
    skillLevel: 'Any',
    availability: '',
    frequency: 'Flexible',
    location: '',
    peopleNeeded: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/requests', formData);
      navigate('/my-requests');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request');
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>Create Partner Request</h1>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '0.5rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Category</label>
              <select name="category" value={formData.category} onChange={handleChange} required>
                <option value="Learning">Learning</option>
                <option value="Building">Building</option>
                <option value="Sports">Sports</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Activity</label>
              <input 
                type="text" 
                name="activity" 
                placeholder="e.g. DSA, Badminton, Hackathon" 
                value={formData.activity} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Title</label>
            <input 
              type="text" 
              name="title" 
              placeholder="e.g. Looking for a DSA partner for Graphs and DP" 
              value={formData.title} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Description</label>
            <textarea 
              name="description" 
              rows="4" 
              placeholder="Describe what you're looking for..." 
              value={formData.description} 
              onChange={handleChange} 
              required 
            ></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Skill Level</label>
              <select name="skillLevel" value={formData.skillLevel} onChange={handleChange} required>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Any">Any</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Frequency</label>
              <select name="frequency" value={formData.frequency} onChange={handleChange} required>
                <option value="Once">Once</option>
                <option value="Few times a week">Few times a week</option>
                <option value="Daily">Daily</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Availability</label>
              <input 
                type="text" 
                name="availability" 
                placeholder="e.g. Evenings (6 PM - 9 PM)" 
                value={formData.availability} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Location (Optional)</label>
              <input 
                type="text" 
                name="location" 
                placeholder="e.g. Library, Online" 
                value={formData.location} 
                onChange={handleChange} 
              />
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequest;

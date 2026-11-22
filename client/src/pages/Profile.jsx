import { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    year: '',
    bio: '',
    skills: '',
    interests: '',
    lookingFor: '',
    availability: '',
    skillLevel: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        college: user.college || '',
        year: user.year || '',
        bio: user.bio || '',
        skills: user.skills?.join(', ') || '',
        interests: user.interests?.join(', ') || '',
        lookingFor: user.lookingFor?.join(', ') || '',
        availability: user.availability || '',
        skillLevel: user.skillLevel || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const dataToSubmit = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        interests: formData.interests.split(',').map(s => s.trim()).filter(Boolean),
        lookingFor: formData.lookingFor.split(',').map(s => s.trim()).filter(Boolean),
      };

      const res = await api.put('/users/profile', dataToSubmit);
      setUser(res.data);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error updating profile');
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>Your Profile</h1>
        
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
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>College</label>
              <input type="text" name="college" value={formData.college} onChange={handleChange} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Year</label>
              <input type="text" name="year" placeholder="e.g. 3rd Year" value={formData.year} onChange={handleChange} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>General Skill Level</label>
              <select name="skillLevel" value={formData.skillLevel} onChange={handleChange}>
                <option value="">Select Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Bio</label>
            <textarea name="bio" rows="3" placeholder="Tell us about yourself..." value={formData.bio} onChange={handleChange}></textarea>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Skills (comma separated)</label>
            <input type="text" name="skills" placeholder="e.g. C++, React, Python" value={formData.skills} onChange={handleChange} />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Interests (comma separated)</label>
            <input type="text" name="interests" placeholder="e.g. Hackathons, AI, Badminton" value={formData.interests} onChange={handleChange} />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Looking For (comma separated)</label>
            <input type="text" name="lookingFor" placeholder="e.g. DSA Partner, Project Teammate" value={formData.lookingFor} onChange={handleChange} />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Availability</label>
            <input type="text" name="availability" placeholder="e.g. Weekends, Evenings" value={formData.availability} onChange={handleChange} />
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;

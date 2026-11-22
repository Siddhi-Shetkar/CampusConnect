import { Link } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);

  return (
    <div>
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <h1 className="hero-title">
            Find the right person to<br />
            learn, build, compete, and play with.
          </h1>
          <p className="hero-subtitle">
            Find DSA partners, project teammates, hackathon teams, sports partners, and people with similar interests across your campus.
          </p>
          <div className="hero-buttons">
            <Link to="/requests" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Find a Partner
            </Link>
            <Link to={user ? "/create-request" : "/login"} className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Create a Request
            </Link>
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem' }}>Categories</h2>
        <div className="categories">
          <div className="category-card glass-panel">
            <div className="category-icon">🧠</div>
            <h3>Learning</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>DSA, Study Groups, Exam Prep</p>
          </div>
          <div className="category-card glass-panel">
            <div className="category-icon">💻</div>
            <h3>Building</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Projects, Hackathons</p>
          </div>
          <div className="category-card glass-panel">
            <div className="category-icon">🏸</div>
            <h3>Sports</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Badminton, Football, Gym</p>
          </div>
          <div className="category-card glass-panel">
            <div className="category-icon">🎨</div>
            <h3>Other</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Music, Photography, Clubs</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar glass-panel">
      <div className="container nav-container">
        <Link to={user ? '/dashboard' : '/'} className="logo">
          CampusConnect
        </Link>
        <div className="nav-links">
          <Link to="/requests" className="nav-link">Find Partners</Link>
          {user ? (
            <>
              <Link to="/create-request" className="nav-link">Create Request</Link>
              <Link to="/my-requests" className="nav-link">My Requests</Link>
              <Link to="/connections" className="nav-link">Connections</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

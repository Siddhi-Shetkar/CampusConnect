import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CreateRequest from './pages/CreateRequest';
import BrowseRequests from './pages/BrowseRequests';
import RequestDetails from './pages/RequestDetails';
import MyRequests from './pages/MyRequests';
import MyConnections from './pages/MyConnections';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/create-request" element={<PrivateRoute><CreateRequest /></PrivateRoute>} />
            <Route path="/requests" element={<BrowseRequests />} />
            <Route path="/requests/:id" element={<RequestDetails />} />
            <Route path="/my-requests" element={<PrivateRoute><MyRequests /></PrivateRoute>} />
            <Route path="/connections" element={<PrivateRoute><MyConnections /></PrivateRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

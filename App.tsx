import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import IssueList from './pages/IssueList';
import IssueForm from './pages/IssueForm';
import IssueDetail from './pages/IssueDetail';
import Login from './pages/Login';
import Users from './pages/Users';
import Profile from './pages/Profile';
import MonthlyReport from './pages/MonthlyReport';
import ResetPassword from './pages/ResetPassword';
import SplashScreen from './components/SplashScreen';
import { StorageService } from './services/storageService';

// Component to listen for Supabase Auth Events (like Password Recovery)
const AuthListener: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const subscription = StorageService.onAuthChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Redirect to password reset page when recovery link is clicked
        navigate('/reset-password');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  return null;
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate system initialization time (5 seconds)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Router>
      <AuthListener />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/issues" element={<IssueList />} />
        <Route path="/create" element={<IssueForm />} />
        <Route path="/issues/edit/:id" element={<IssueForm />} />
        <Route path="/issues/:id" element={<IssueDetail />} />
        <Route path="/users" element={<Users />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reports" element={<MonthlyReport />} />
        
        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
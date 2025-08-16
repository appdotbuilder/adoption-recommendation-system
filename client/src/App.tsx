import './App.css';
import { useState, useEffect } from 'react';
import { AuthProvider } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { ApplicationForm } from './components/ApplicationForm';
import { AdminDashboard } from './components/AdminDashboard';
import { ApplicationList } from './components/ApplicationList';
import { ApplicationDetails } from './components/ApplicationDetails';
import type { User } from '../../server/src/schema';

export type Page = 'login' | 'dashboard' | 'applications' | 'new-application' | 'admin-dashboard' | 'application-details';

interface AppState {
  currentPage: Page;
  selectedApplicationId?: number;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>({
    currentPage: 'login'
  });

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setAppState({
          currentPage: parsedUser.role === 'admin_dinas_sosial' ? 'admin-dashboard' : 'dashboard'
        });
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setAppState({
      currentPage: loggedInUser.role === 'admin_dinas_sosial' ? 'admin-dashboard' : 'dashboard'
    });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setAppState({ currentPage: 'login' });
  };

  const navigateTo = (page: Page, applicationId?: number) => {
    setAppState({
      currentPage: page,
      selectedApplicationId: applicationId
    });
  };

  const renderCurrentPage = () => {
    if (!user && appState.currentPage !== 'login') {
      return <LoginForm onLogin={handleLogin} />;
    }

    switch (appState.currentPage) {
      case 'login':
        return <LoginForm onLogin={handleLogin} />;
      case 'dashboard':
        return <Dashboard user={user!} onNavigate={navigateTo} />;
      case 'applications':
        return <ApplicationList user={user!} onNavigate={navigateTo} />;
      case 'new-application':
        return <ApplicationForm user={user!} onNavigate={navigateTo} />;
      case 'admin-dashboard':
        return <AdminDashboard user={user!} onNavigate={navigateTo} />;
      case 'application-details':
        return (
          <ApplicationDetails
            applicationId={appState.selectedApplicationId!}
            user={user!}
            onNavigate={navigateTo}
          />
        );
      default:
        return <Dashboard user={user!} onNavigate={navigateTo} />;
    }
  };

  return (
    <AuthProvider>
      <Layout user={user} onLogout={handleLogout} onNavigate={navigateTo}>
        {renderCurrentPage()}
      </Layout>
    </AuthProvider>
  );
}

export default App;
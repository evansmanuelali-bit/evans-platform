import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ClientHome from './pages/ClientHome.jsx';
import Admin from './pages/Admin.jsx';

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center bg-ink">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/app'} replace />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route
        path="/app"
        element={
          <Protected role="CLIENT">
            <ClientHome />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected role="ADMIN">
            <Admin />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to={user ? (user.role === 'ADMIN' ? '/admin' : '/app') : '/'} replace />} />
    </Routes>
  );
}

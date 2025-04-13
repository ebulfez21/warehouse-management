import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const PrivateRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission?: keyof UserPermissions }) => {
  const { user, isAdmin, userData } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !isAdmin && !userData?.permissions[requiredPermission]) {
    return <Navigate to="/" />;
  }

  return children;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin } = useAuth();
  
  if (!user || !isAdmin) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route 
              path="products" 
              element={
                <PrivateRoute requiredPermission="canAddProducts">
                  <Products />
                </PrivateRoute>
              } 
            />
            <Route 
              path="reports" 
              element={
                <PrivateRoute requiredPermission="canViewReports">
                  <Reports />
                </PrivateRoute>
              } 
            />
            <Route
              path="users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
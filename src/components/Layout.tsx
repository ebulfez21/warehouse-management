import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, BarChart2, LogOut, Users } from 'lucide-react';

function Layout() {
  const { signOut, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string)  => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">Anbar</h1>
        </div>
        <nav className="mt-6">
          <Link
            to="/"
            className={`flex items-center px-6 py-3 ${
              isActive('/') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5 mr-3" />
            <span>Əsas Səhifə</span>
          </Link>
          <Link
            to="/products"
            className={`flex items-center px-6 py-3 ${
              isActive('/products') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5 mr-3" />
            <span>Məhsullar</span>
          </Link>
          <Link
            to="/reports"
            className={`flex items-center px-6 py-3 ${
              isActive('/reports') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart2 className="w-5 h-5 mr-3" />
            <span>Hesabatlar</span>
          </Link>
          {isAdmin && (
            <Link
              to="/users"
              className={`flex items-center px-6 py-3 ${
                isActive('/users') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              <span>İstifadəçilər</span>
            </Link>
          )}
        </nav>
        <div className="absolute  w-64 p-6">
          <button
            onClick={() => signOut()}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Çıxış</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;
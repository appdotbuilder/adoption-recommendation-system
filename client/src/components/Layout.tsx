import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Home, FileText, PlusCircle, Users } from 'lucide-react';
import type { User as UserType } from '../../../server/src/schema';
import type { Page } from '../App';

interface LayoutProps {
  children: ReactNode;
  user: UserType | null;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
}

export function Layout({ children, user, onLogout, onNavigate }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">👨‍👩‍👧‍👦</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Sistem Rekomendasi Adopsi
                </h1>
                <p className="text-xs text-gray-500">Dinas Sosial</p>
              </div>
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                {/* Navigation */}
                <nav className="flex space-x-2">
                  {user.role === 'calon_pengangkut' ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('dashboard')}
                        className="flex items-center space-x-1"
                      >
                        <Home className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('applications')}
                        className="flex items-center space-x-1"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Aplikasi Saya</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('new-application')}
                        className="flex items-center space-x-1"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Buat Aplikasi</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('admin-dashboard')}
                        className="flex items-center space-x-1"
                      >
                        <Users className="w-4 h-4" />
                        <span>Dashboard Admin</span>
                      </Button>
                    </>
                  )}
                </nav>

                {/* User info */}
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {user.full_name}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {user.role === 'calon_pengangkut' ? 'Calon Pengangkut' : 'Admin Dinas Sosial'}
                    </Badge>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLogout}
                    className="flex items-center space-x-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2024 Sistem Rekomendasi Adopsi - Dinas Sosial
          </p>
        </div>
      </footer>
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { FileText, PlusCircle, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { User, Application } from '../../../server/src/schema';
import type { Page } from '../App';

interface DashboardProps {
  user: User;
  onNavigate: (page: Page, applicationId?: number) => void;
}

export function Dashboard({ user, onNavigate }: DashboardProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getApplications.query({
        userRole: user.role,
        userId: user.id,
        limit: 10,
        offset: 0
      });
      // Handle both array response and paginated response
      const apps = Array.isArray(result) ? result : (result as any)?.applications || [];
      setApplications(apps);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.role, user.id]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4" />;
      case 'submitted':
        return <FileText className="w-4 h-4" />;
      case 'under_review':
        return <AlertCircle className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'submitted':
        return 'Terkirim';
      case 'under_review':
        return 'Dalam Review';
      case 'approved':
        return 'Disetujui';
      case 'rejected':
        return 'Ditolak';
      case 'completed':
        return 'Selesai';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'submitted':
        return 'default';
      case 'under_review':
        return 'outline';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'completed':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getApplicationProgress = (status: string) => {
    switch (status) {
      case 'draft':
        return 20;
      case 'submitted':
        return 40;
      case 'under_review':
        return 60;
      case 'approved':
        return 80;
      case 'completed':
        return 100;
      case 'rejected':
        return 100;
      default:
        return 0;
    }
  };

  const stats = {
    total: applications.length,
    draft: applications.filter(app => app.status === 'draft').length,
    submitted: applications.filter(app => app.status === 'submitted').length,
    under_review: applications.filter(app => app.status === 'under_review').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    completed: applications.filter(app => app.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white p-6">
        <h1 className="text-2xl font-bold mb-2">
          Selamat Datang, {user.full_name}! 👋
        </h1>
        <p className="text-blue-100">
          Kelola aplikasi adopsi Anda dan pantau perkembangannya di sini.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('new-application')}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Buat Aplikasi Baru</CardTitle>
                <CardDescription>Ajukan permohonan adopsi baru</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('applications')}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Lihat Semua Aplikasi</CardTitle>
                <CardDescription>Kelola aplikasi yang sudah ada</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Aplikasi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.submitted + stats.under_review}</div>
            <div className="text-sm text-gray-500">Dalam Proses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-500">Disetujui</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Selesai</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Aplikasi Terbaru</CardTitle>
          <CardDescription>
            {applications.length > 0 
              ? `Menampilkan ${Math.min(applications.length, 5)} aplikasi terbaru`
              : 'Belum ada aplikasi'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg"></div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Belum Ada Aplikasi</p>
              <p className="text-sm">Mulai dengan membuat aplikasi adopsi pertama Anda</p>
              <Button 
                className="mt-4" 
                onClick={() => onNavigate('new-application')}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Buat Aplikasi Baru
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 5).map((application: Application) => (
                <div
                  key={application.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onNavigate('application-details', application.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(application.status)}
                        <h3 className="font-semibold">{application.full_name}</h3>
                        <Badge variant={getStatusVariant(application.status)}>
                          {getStatusLabel(application.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Preferensi: {application.preferred_child_gender === 'no_preference' ? 'Tidak ada preferensi' : application.preferred_child_gender === 'male' ? 'Laki-laki' : 'Perempuan'}, 
                        Usia {application.preferred_child_age_min}-{application.preferred_child_age_max} tahun
                      </p>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={getApplicationProgress(application.status)} 
                          className="flex-1 h-2"
                        />
                        <span className="text-xs text-gray-500">
                          {getApplicationProgress(application.status)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {application.created_at.toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
              
              {applications.length > 5 && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => onNavigate('applications')}
                >
                  Lihat Semua Aplikasi ({applications.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/utils/trpc';
import { ArrowLeft, Search, Filter, Eye, Edit, FileText, Clock, CheckCircle, AlertCircle, XCircle, Plus } from 'lucide-react';
import type { User, Application, ApplicationStatus } from '../../../server/src/schema';
import type { Page } from '../App';

interface ApplicationListProps {
  user: User;
  onNavigate: (page: Page, applicationId?: number) => void;
}

export function ApplicationList({ user, onNavigate }: ApplicationListProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');

  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getApplications.query({
        userRole: user.role,
        userId: user.id,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
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
  }, [user.role, user.id, statusFilter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const filteredApplications = applications.filter(app =>
    app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.reason_for_adoption.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'submitted':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'under_review':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Aplikasi Saya
            </h1>
            <p className="text-gray-600">
              Kelola semua aplikasi adopsi Anda
            </p>
          </div>
        </div>
        <Button onClick={() => onNavigate('new-application')}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Aplikasi Baru
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari berdasarkan nama atau alasan adopsi..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ApplicationStatus | 'all')}
              >
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Terkirim</SelectItem>
                  <SelectItem value="under_review">Dalam Review</SelectItem>
                  <SelectItem value="approved">Disetujui</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Daftar Aplikasi ({filteredApplications.length})
          </CardTitle>
          <CardDescription>
            {applications.length > 0 
              ? `Menampilkan ${filteredApplications.length} dari ${applications.length} aplikasi`
              : 'Belum ada aplikasi'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
              ))}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {applications.length === 0 ? 'Belum Ada Aplikasi' : 'Tidak Ditemukan'}
              </h3>
              <p className="text-gray-500 mb-6">
                {applications.length === 0 
                  ? 'Mulai dengan membuat aplikasi adopsi pertama Anda'
                  : 'Coba ubah filter atau kata kunci pencarian'
                }
              </p>
              {applications.length === 0 && (
                <Button onClick={() => onNavigate('new-application')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Aplikasi Baru
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Pemohon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Preferensi Anak</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead>Tanggal Update</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application: Application) => (
                    <TableRow key={application.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.full_name}</div>
                          <div className="text-sm text-gray-500">
                            {application.occupation}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(application.status)}
                          <Badge variant={getStatusVariant(application.status)}>
                            {getStatusLabel(application.status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {application.preferred_child_gender === 'no_preference' 
                              ? 'Tidak ada preferensi' 
                              : application.preferred_child_gender === 'male' 
                              ? 'Laki-laki' 
                              : 'Perempuan'
                            }
                          </div>
                          <div className="text-gray-500">
                            {application.preferred_child_age_min}-{application.preferred_child_age_max} tahun
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {application.created_at.toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {application.updated_at.toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigate('application-details', application.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Lihat
                          </Button>
                          {application.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigate('application-details', application.id)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
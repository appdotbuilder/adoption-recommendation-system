import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Eye,
  Filter,
  Search,
  TrendingUp,
  Calendar,
  UserCheck,
  UserX,
  MessageSquare
} from 'lucide-react';
import type { User, Application, ApplicationStatus, ReviewApplicationInput } from '../../../server/src/schema';
import type { Page } from '../App';

interface AdminDashboardProps {
  user: User;
  onNavigate: (page: Page, applicationId?: number) => void;
}

export function AdminDashboard({ user, onNavigate }: AdminDashboardProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('submitted');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewApplicationInput>({
    id: 0,
    status: 'under_review',
    admin_notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getApplications.query({
        userRole: user.role,
        userId: user.id,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
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
    app.occupation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.reason_for_adoption.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: applications.length,
    pending: applications.filter(app => ['submitted', 'under_review'].includes(app.status)).length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    completed: applications.filter(app => app.status === 'completed').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
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

  const getUrgencyColor = (createdAt: Date) => {
    const daysSinceSubmission = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceSubmission > 7) return 'text-red-600';
    if (daysSinceSubmission > 3) return 'text-orange-600';
    return 'text-gray-600';
  };

  const openReviewDialog = (application: Application) => {
    setSelectedApplication(application);
    setReviewData({
      id: application.id,
      status: 'under_review',
      admin_notes: application.admin_notes || ''
    });
    setReviewDialogOpen(true);
    setError('');
  };

  const handleReview = async () => {
    if (!selectedApplication) return;

    setIsSubmitting(true);
    setError('');

    try {
      await trpc.reviewApplication.mutate({
        ...reviewData,
        adminId: user.id
      });
      
      setReviewDialogOpen(false);
      setSelectedApplication(null);
      await loadApplications(); // Refresh the list
    } catch (error: any) {
      setError(error.message || 'Gagal memproses review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male':
        return 'Laki-laki';
      case 'female':
        return 'Perempuan';
      case 'no_preference':
        return 'Tidak ada preferensi';
      default:
        return gender;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white p-6">
        <h1 className="text-2xl font-bold mb-2">
          Dashboard Admin Dinas Sosial 👨‍💼
        </h1>
        <p className="text-purple-100">
          Kelola dan review aplikasi adopsi yang masuk
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Aplikasi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Perlu Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-500">Disetujui</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <UserX className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-500">Ditolak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Selesai</div>
          </CardContent>
        </Card>
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
                  placeholder="Cari berdasarkan nama, pekerjaan, atau alasan adopsi..."
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
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Daftar Aplikasi ({filteredApplications.length})</span>
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
              <p className="text-gray-500">
                {applications.length === 0 
                  ? 'Aplikasi adopsi akan muncul di sini setelah diajukan'
                  : 'Coba ubah filter atau kata kunci pencarian'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pemohon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Preferensi Anak</TableHead>
                    <TableHead>Penghasilan</TableHead>
                    <TableHead>Tanggal Masuk</TableHead>
                    <TableHead>Urgency</TableHead>
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
                            {application.occupation} • {application.phone}
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
                            {getGenderLabel(application.preferred_child_gender)}
                          </div>
                          <div className="text-gray-500">
                            {application.preferred_child_age_min}-{application.preferred_child_age_max} tahun
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{formatCurrency(application.monthly_income)}</div>
                        {application.spouse_income && (
                          <div className="text-gray-500">
                            + {formatCurrency(application.spouse_income)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {application.created_at.toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${getUrgencyColor(application.created_at)}`}>
                          {Math.floor((Date.now() - application.created_at.getTime()) / (1000 * 60 * 60 * 24))} hari
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigate('application-details', application.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Detail
                          </Button>
                          {['submitted', 'under_review'].includes(application.status) && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openReviewDialog(application)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Review
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

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Aplikasi</DialogTitle>
            <DialogDescription>
              Review dan berikan keputusan untuk aplikasi dari {selectedApplication?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Keputusan</label>
              <Select
                value={reviewData.status}
                onValueChange={(value) =>
                  setReviewData((prev: ReviewApplicationInput) => ({ 
                    ...prev, 
                    status: value as 'approved' | 'rejected' | 'under_review'
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keputusan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_review">Dalam Review</SelectItem>
                  <SelectItem value="approved">Setujui</SelectItem>
                  <SelectItem value="rejected">Tolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan (Opsional)</label>
              <Textarea
                placeholder="Berikan catatan atau alasan keputusan..."
                value={reviewData.admin_notes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setReviewData((prev: ReviewApplicationInput) => ({ 
                    ...prev, 
                    admin_notes: e.target.value 
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleReview} disabled={isSubmitting}>
              {isSubmitting ? 'Memproses...' : 'Simpan Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
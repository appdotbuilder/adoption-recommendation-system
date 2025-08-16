import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Phone, 
  Briefcase, 
  DollarSign, 
  Heart,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  Users,
  Baby
} from 'lucide-react';
import type { User as UserType, Application, ApplicationStatusHistory, Document } from '../../../server/src/schema';
import type { Page } from '../App';

interface ApplicationDetailsProps {
  applicationId: number;
  user: UserType;
  onNavigate: (page: Page) => void;
}

export function ApplicationDetails({ applicationId, user, onNavigate }: ApplicationDetailsProps) {
  const [application, setApplication] = useState<Application | null>(null);
  const [statusHistory, setStatusHistory] = useState<ApplicationStatusHistory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadApplicationDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const [appResult, historyResult, docsResult] = await Promise.all([
        trpc.getApplicationById.query({
          id: applicationId,
          userRole: user.role,
          userId: user.id
        }),
        trpc.getApplicationStatusHistory.query({
          applicationId: applicationId,
          userRole: user.role,
          userId: user.id
        }),
        trpc.getDocuments.query({
          applicationId: applicationId,
          userRole: user.role,
          userId: user.id
        })
      ]);

      setApplication(appResult);
      setStatusHistory(historyResult);
      setDocuments(docsResult);
    } catch (error: any) {
      console.error('Failed to load application details:', error);
      setError(error.message || 'Gagal memuat detail aplikasi');
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, user.role, user.id]);

  useEffect(() => {
    loadApplicationDetails();
  }, [loadApplicationDetails]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'submitted':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'under_review':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-100 h-8 w-64 rounded"></div>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="bg-gray-100 h-4 w-3/4 rounded"></div>
                <div className="bg-gray-100 h-4 w-1/2 rounded"></div>
                <div className="bg-gray-100 h-4 w-2/3 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('applications')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Aplikasi tidak ditemukan'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(user.role === 'admin_dinas_sosial' ? 'admin-dashboard' : 'applications')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Detail Aplikasi Adopsi
            </h1>
            <p className="text-gray-600">
              ID: #{application.id} • Dibuat: {application.created_at.toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(application.status)}
          <Badge variant="outline" className="text-sm px-3 py-1">
            {getStatusLabel(application.status)}
          </Badge>
        </div>
      </div>

      {/* Status Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Progress Aplikasi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Status: {getStatusLabel(application.status)}</span>
              <span>{getApplicationProgress(application.status)}%</span>
            </div>
            <Progress value={getApplicationProgress(application.status)} className="h-2" />
          </div>
          {application.admin_notes && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Catatan Admin:</p>
              <p className="text-sm text-blue-800 mt-1">{application.admin_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Informasi Pribadi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nama Lengkap</Label>
                  <Value>{application.full_name}</Value>
                </div>
                <div>
                  <Label>Tanggal Lahir</Label>
                  <Value>{application.date_of_birth.toLocaleDateString('id-ID')}</Value>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tempat Lahir</Label>
                  <Value>{application.place_of_birth}</Value>
                </div>
                <div>
                  <Label>No. Telepon</Label>
                  <Value className="flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>{application.phone}</span>
                  </Value>
                </div>
              </div>
              <div>
                <Label>Alamat</Label>
                <Value className="flex items-start space-x-1">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                  <span>{application.address}</span>
                </Value>
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5" />
                <span>Informasi Pekerjaan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Pekerjaan</Label>
                  <Value>{application.occupation}</Value>
                </div>
                <div>
                  <Label>Penghasilan Bulanan</Label>
                  <Value className="flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>{formatCurrency(application.monthly_income)}</span>
                  </Value>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spouse Information */}
          {(application.spouse_name || application.spouse_occupation || application.spouse_income) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Informasi Pasangan</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nama Pasangan</Label>
                    <Value>{application.spouse_name || '-'}</Value>
                  </div>
                  <div>
                    <Label>Pekerjaan Pasangan</Label>
                    <Value>{application.spouse_occupation || '-'}</Value>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Penghasilan Pasangan</Label>
                    <Value>
                      {application.spouse_income ? formatCurrency(application.spouse_income) : '-'}
                    </Value>
                  </div>
                  <div>
                    <Label>Jumlah Anak</Label>
                    <Value>{application.number_of_children} anak</Value>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adoption Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Baby className="w-5 h-5" />
                <span>Preferensi Adopsi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Alasan Adopsi</Label>
                <Value className="flex items-start space-x-1">
                  <Heart className="w-4 h-4 mt-1 flex-shrink-0" />
                  <span className="whitespace-pre-wrap">{application.reason_for_adoption}</span>
                </Value>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Jenis Kelamin</Label>
                  <Value>{getGenderLabel(application.preferred_child_gender)}</Value>
                </div>
                <div>
                  <Label>Usia Minimal</Label>
                  <Value>{application.preferred_child_age_min} tahun</Value>
                </div>
                <div>
                  <Label>Usia Maksimal</Label>
                  <Value>{application.preferred_child_age_max} tahun</Value>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Riwayat Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusHistory.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada riwayat perubahan status</p>
              ) : (
                <div className="space-y-3">
                  {statusHistory.map((history: ApplicationStatusHistory) => (
                    <div key={history.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(history.new_status)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {getStatusLabel(history.new_status)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {history.created_at.toLocaleDateString('id-ID')}
                        </div>
                        {history.notes && (
                          <div className="text-xs text-gray-600 mt-1">
                            {history.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Dokumen</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada dokumen yang diunggah</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((document: Document) => (
                    <div key={document.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{document.document_type}</div>
                        <div className="text-xs text-gray-500">{document.file_name}</div>
                      </div>
                      <div className="flex-shrink-0">
                        {document.is_verified ? (
                          <Badge variant="default" className="text-xs">Terverifikasi</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Belum Verifikasi</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {user.role === 'calon_pengangkut' && application.status === 'draft' && (
            <Card>
              <CardHeader>
                <CardTitle>Aksi Cepat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" size="sm">
                  Edit Aplikasi
                </Button>
                <Button variant="default" className="w-full" size="sm">
                  Kirim untuk Review
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper components
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-gray-600 mb-1">{children}</div>;
}

function Value({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm text-gray-900 ${className}`}>{children}</div>;
}
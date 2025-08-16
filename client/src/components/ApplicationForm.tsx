import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { ArrowLeft, Save, Send } from 'lucide-react';
import type { User, CreateApplicationInput } from '../../../server/src/schema';
import type { Page } from '../App';

interface ApplicationFormProps {
  user: User;
  onNavigate: (page: Page) => void;
}

export function ApplicationForm({ user, onNavigate }: ApplicationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [formData, setFormData] = useState<CreateApplicationInput>({
    full_name: '',
    date_of_birth: new Date(),
    place_of_birth: '',
    address: '',
    phone: '',
    occupation: '',
    monthly_income: 0,
    spouse_name: null,
    spouse_occupation: null,
    spouse_income: null,
    number_of_children: 0,
    reason_for_adoption: '',
    preferred_child_age_min: 0,
    preferred_child_age_max: 18,
    preferred_child_gender: 'no_preference'
  });

  const handleSubmit = async (e: React.FormEvent, shouldSubmit: boolean = false) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await trpc.createApplication.mutate({
        ...formData,
        userId: user.id
      });

      if (shouldSubmit) {
        // Submit the application after creating
        await trpc.submitApplication.mutate({
          applicationId: response.id,
          userId: user.id
        });
        setSuccess('Aplikasi berhasil dibuat dan dikirim untuk review!');
      } else {
        setSuccess('Aplikasi berhasil disimpan sebagai draft!');
      }

      // Navigate back to dashboard after short delay
      setTimeout(() => {
        onNavigate('dashboard');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            Formulir Aplikasi Adopsi
          </h1>
          <p className="text-gray-600">
            Lengkapi semua informasi yang diperlukan untuk permohonan adopsi
          </p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pribadi</CardTitle>
            <CardDescription>
              Masukkan informasi pribadi Anda dengan lengkap dan akurat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  placeholder="Nama lengkap sesuai KTP"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Tanggal Lahir *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      date_of_birth: new Date(e.target.value) 
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="place_of_birth">Tempat Lahir *</Label>
                <Input
                  id="place_of_birth"
                  value={formData.place_of_birth}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ ...prev, place_of_birth: e.target.value }))
                  }
                  placeholder="Kota tempat lahir"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">No. Telepon *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="08xxxxxxxxxx"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat Lengkap *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateApplicationInput) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Alamat lengkap tempat tinggal"
                required
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pekerjaan</CardTitle>
            <CardDescription>
              Informasi tentang pekerjaan dan penghasilan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occupation">Pekerjaan *</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ ...prev, occupation: e.target.value }))
                  }
                  placeholder="Jabatan atau profesi"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_income">Penghasilan Bulanan (Rp) *</Label>
                <Input
                  id="monthly_income"
                  type="number"
                  value={formData.monthly_income}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      monthly_income: parseFloat(e.target.value) || 0 
                    }))
                  }
                  placeholder="5000000"
                  min="0"
                  step="100000"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spouse Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pasangan (Opsional)</CardTitle>
            <CardDescription>
              Jika sudah menikah, mohon lengkapi informasi pasangan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spouse_name">Nama Pasangan</Label>
                <Input
                  id="spouse_name"
                  value={formData.spouse_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      spouse_name: e.target.value || null 
                    }))
                  }
                  placeholder="Nama lengkap pasangan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spouse_occupation">Pekerjaan Pasangan</Label>
                <Input
                  id="spouse_occupation"
                  value={formData.spouse_occupation || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      spouse_occupation: e.target.value || null 
                    }))
                  }
                  placeholder="Pekerjaan pasangan"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spouse_income">Penghasilan Pasangan (Rp)</Label>
                <Input
                  id="spouse_income"
                  type="number"
                  value={formData.spouse_income || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      spouse_income: parseFloat(e.target.value) || null 
                    }))
                  }
                  placeholder="3000000"
                  min="0"
                  step="100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_children">Jumlah Anak *</Label>
                <Input
                  id="number_of_children"
                  type="number"
                  value={formData.number_of_children}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      number_of_children: parseInt(e.target.value) || 0 
                    }))
                  }
                  min="0"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adoption Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferensi Adopsi</CardTitle>
            <CardDescription>
              Tentukan preferensi Anda untuk anak yang akan diadopsi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason_for_adoption">Alasan Adopsi *</Label>
              <Textarea
                id="reason_for_adoption"
                value={formData.reason_for_adoption}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateApplicationInput) => ({ 
                    ...prev, 
                    reason_for_adoption: e.target.value 
                  }))
                }
                placeholder="Jelaskan alasan Anda ingin mengadopsi anak (minimal 50 karakter)"
                required
                rows={4}
                minLength={50}
              />
              <p className="text-xs text-gray-500">
                {formData.reason_for_adoption.length}/50 karakter minimum
              </p>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferred_child_age_min">Usia Minimal *</Label>
                <Input
                  id="preferred_child_age_min"
                  type="number"
                  value={formData.preferred_child_age_min}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      preferred_child_age_min: parseInt(e.target.value) || 0 
                    }))
                  }
                  min="0"
                  max="17"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_child_age_max">Usia Maksimal *</Label>
                <Input
                  id="preferred_child_age_max"
                  type="number"
                  value={formData.preferred_child_age_max}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      preferred_child_age_max: parseInt(e.target.value) || 18 
                    }))
                  }
                  min="1"
                  max="18"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_child_gender">Jenis Kelamin *</Label>
                <Select
                  value={formData.preferred_child_gender}
                  onValueChange={(value) =>
                    setFormData((prev: CreateApplicationInput) => ({ 
                      ...prev, 
                      preferred_child_gender: value as 'male' | 'female' | 'no_preference'
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih preferensi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_preference">Tidak Ada Preferensi</SelectItem>
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate('dashboard')}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            variant="outline"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Menyimpan...' : 'Simpan Draft'}
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isLoading || formData.reason_for_adoption.length < 50}
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? 'Mengirim...' : 'Simpan & Kirim'}
          </Button>
        </div>
      </form>
    </div>
  );
}
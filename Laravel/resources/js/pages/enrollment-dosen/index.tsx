import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle, RotateCcw, Upload, Camera } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface EnrollmentStatus {
    status_enrollment: string;
    jarak_lulus: Record<string, number>;
    semua_jarak_lulus: boolean;
}

interface Props {
    status: EnrollmentStatus;
    flash?: { success?: string; error?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Enrollment Wajah', href: '/enrollment-dosen' }];

const statusConfig = {
    pending_upload:     { label: 'Belum Upload',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
    pending_verifikasi: { label: 'Siap Verifikasi', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    aktif:              { label: 'Enrollment Aktif', className: 'bg-green-100 text-green-800 border-green-200' },
} as const;

export default function EnrollmentDosenIndex({ status, flash }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadForm = useForm<{ foto: File[] }>({ foto: [] });
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
        if (flash?.error && !shownMessages.has(flash.error)) {
            toast.error(flash.error);
            shownMessages.add(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const cfg = statusConfig[status.status_enrollment as keyof typeof statusConfig] ?? statusConfig.pending_upload;
    const jarakKeys = Object.keys(status.jarak_lulus);

    function handleUploadSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (uploadForm.data.foto.length !== 5) {
            toast.error('Pilih tepat 5 foto.');
            return;
        }
        uploadForm.post('/enrollment-dosen/upload-foto', {
            forceFormData: true,
            onError: (errors) => {
                const msg = Object.values(errors)[0];
                if (msg) toast.error(msg);
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Enrollment Wajah" />
            <div className="p-4 max-w-2xl space-y-6">

                {/* Status Card */}
                <div className="rounded-xl border border-sidebar-border/70 p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Status Enrollment</h2>
                        <Badge variant="outline" className={cfg.className}>
                            {cfg.label}
                        </Badge>
                    </div>

                    {status.status_enrollment === 'pending_verifikasi' && (
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Jarak yang sudah diverifikasi: {jarakKeys.length}/3
                            </p>
                            <div className="flex gap-2">
                                {(['dekat', 'sedang', 'jauh'] as const).map(j => (
                                    <Badge key={j} variant="outline"
                                        className={jarakKeys.includes(j)
                                            ? 'bg-green-100 text-green-800 border-green-200'
                                            : 'bg-gray-100 text-gray-500'}>
                                        {jarakKeys.includes(j) ? `✓ ${j}` : j}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {status.status_enrollment === 'aktif' && (
                        <p className="text-sm text-green-700">
                            Enrollment selesai. Wajah Anda terdaftar dan sistem dapat mengenali Anda saat absensi.
                        </p>
                    )}
                </div>

                {/* Upload Form (jika pending_upload) */}
                {status.status_enrollment === 'pending_upload' && (
                    <div className="rounded-xl border border-sidebar-border/70 p-6 space-y-4">
                        <div>
                            <h3 className="font-semibold">Langkah 1: Upload Foto Wajah</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Upload <strong>tepat 5 foto</strong> wajah Anda dalam kondisi pencahayaan baik.
                                Format: JPG/PNG, maks 5MB per foto.
                            </p>
                        </div>
                        <form onSubmit={handleUploadSubmit} className="space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpg,image/jpeg,image/png"
                                multiple
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                onChange={e => {
                                    const files = Array.from(e.target.files ?? []);
                                    uploadForm.setData('foto', files);
                                }}
                            />
                            {uploadForm.data.foto.length > 0 && uploadForm.data.foto.length !== 5 && (
                                <p className="text-xs text-red-500">
                                    {uploadForm.data.foto.length} foto dipilih — harus tepat 5.
                                </p>
                            )}
                            {uploadForm.data.foto.length === 5 && (
                                <p className="text-xs text-green-600">5 foto siap diupload.</p>
                            )}
                            <Button
                                type="submit"
                                disabled={uploadForm.processing || uploadForm.data.foto.length !== 5}
                                className="w-full"
                            >
                                <Upload className="size-4 mr-2" />
                                {uploadForm.processing ? 'Mengupload...' : 'Upload Foto'}
                            </Button>
                        </form>
                    </div>
                )}

                {/* Verifikasi Wajah (jika pending_verifikasi) */}
                {status.status_enrollment === 'pending_verifikasi' && (
                    <div className="rounded-xl border border-sidebar-border/70 p-6 space-y-3">
                        <h3 className="font-semibold">Langkah 2: Verifikasi Wajah</h3>
                        <p className="text-sm text-muted-foreground">
                            Lakukan verifikasi wajah dari 3 jarak berbeda (dekat, sedang, jauh) menggunakan webcam.
                        </p>
                        <Button
                            onClick={() => router.visit('/enrollment-dosen/verifikasi')}
                            className="w-full"
                        >
                            <Camera className="size-4 mr-2" />
                            Mulai Verifikasi Wajah
                        </Button>
                    </div>
                )}

                {/* Sukses */}
                {status.status_enrollment === 'aktif' && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                        <CheckCircle className="size-6 text-green-600 shrink-0" />
                        <div>
                            <p className="font-semibold text-green-800">Enrollment Berhasil</p>
                            <p className="text-sm text-green-700">Absensi wajah Anda sudah aktif.</p>
                        </div>
                    </div>
                )}

                {/* Tombol Reset */}
                {status.status_enrollment !== 'pending_upload' && (
                    <ConfirmDialog
                        title="Reset Enrollment?"
                        description="Semua foto dan encoding wajah Anda akan dihapus. Anda harus mengulang proses enrollment dari awal."
                        confirmLabel="Ya, Reset"
                        onConfirm={() => router.delete('/enrollment-dosen/reset')}
                        trigger={
                            <Button variant="outline" className="hover:bg-red-50 hover:text-red-600">
                                <RotateCcw className="size-4 mr-2" />
                                Reset Enrollment
                            </Button>
                        }
                    />
                )}
            </div>
        </AppLayout>
    );
}

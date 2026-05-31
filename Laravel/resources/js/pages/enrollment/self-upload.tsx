import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Camera, CheckCircle, ImagePlus, Info, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface Props {
    mahasiswa: { id: number; nama: string; nim: string; kelas?: { nama: string } };
    status: { status_akun: string; jarak_lulus: string[]; semua_jarak_lulus: boolean };
    flash?: { success?: string; error?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Upload Foto Enrollment', href: '/enrollment/self-upload' }];

export default function SelfUploadPage({ mahasiswa, status, flash }: Props) {
    const [previews, setPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [shownMessages] = useState(new Set<string>());

    const form = useForm<{ foto: File[] }>({ foto: [] });

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

    function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length !== 5) {
            toast.error('Pilih tepat 5 foto sekaligus.');
            return;
        }
        form.setData('foto', files);
        setPreviews(files.map(f => URL.createObjectURL(f)));
    }

    function removeFile(index: number) {
        const newFiles = form.data.foto.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);
        form.setData('foto', newFiles);
        setPreviews(newPreviews);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (form.data.foto.length !== 5) {
            toast.error('Harus memilih tepat 5 foto.');
            return;
        }
        form.post('/enrollment/self-upload', {
            forceFormData: true,
            onSuccess: () => {
                setPreviews([]);
                form.reset();
            },
            onError: (errors) => {
                const msg = errors.foto ?? errors[Object.keys(errors)[0]] ?? 'Terjadi kesalahan.';
                toast.error(msg);
            },
        });
    }

    const sudahUpload = status.status_akun !== 'pending_upload';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Upload Foto Enrollment" />
            <div className="p-4 max-w-2xl mx-auto space-y-4">

                {/* Info mahasiswa */}
                <div>
                    <h1 className="text-xl font-semibold">Upload Foto Wajah</h1>
                    <p className="text-sm text-muted-foreground">
                        {mahasiswa.nama} · {mahasiswa.nim} · {mahasiswa.kelas?.nama}
                    </p>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant="outline" className={
                        status.status_akun === 'aktif'               ? 'bg-green-50 text-green-700 border-green-200' :
                        status.status_akun === 'pending_verifikasi'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                       'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }>
                        {status.status_akun === 'aktif'              ? 'Aktif — Enrollment selesai' :
                         status.status_akun === 'pending_verifikasi' ? 'Foto sudah diupload — Menunggu verifikasi admin' :
                                                                       'Belum upload foto'}
                    </Badge>
                </div>

                {/* Panduan */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Info className="h-4 w-4 text-blue-500" />
                            Panduan Upload Foto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                        <p>• Upload tepat <strong>5 foto</strong> wajah Anda (pilih semua sekaligus)</p>
                        <p>• Pastikan wajah terlihat jelas, pencahayaan cukup, dan tidak memakai masker</p>
                        <p>• Format: JPG atau PNG, maksimal 2MB per foto</p>
                        <p>• Setelah upload, admin akan melakukan verifikasi wajah di 3 jarak</p>
                    </CardContent>
                </Card>

                {sudahUpload ? (
                    <Card>
                        <CardContent className="pt-6 text-center space-y-4">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                            <p className="font-medium">Foto sudah diupload.</p>
                            {status.status_akun === 'aktif' ? (
                                <p className="text-sm text-green-700 font-medium">Enrollment Anda sudah aktif ✓</p>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground">
                                        Langkah berikutnya: verifikasi wajah Anda di 3 jarak (dekat, sedang, jauh).
                                    </p>
                                    <Button onClick={() => router.visit('/enrollment/self-verify')}>
                                        <Camera className="h-4 w-4 mr-2" />
                                        Mulai Verifikasi Wajah
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Area pilih foto */}
                        <div
                            className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                            <p className="font-medium">Klik untuk pilih 5 foto</p>
                            <p className="text-sm text-muted-foreground mt-1">JPG / PNG, maks 2MB per foto</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpg,image/jpeg,image/png"
                                multiple
                                className="hidden"
                                onChange={handleFiles}
                            />
                        </div>

                        {/* Preview grid */}
                        {previews.length > 0 && (
                            <div className="grid grid-cols-5 gap-2">
                                {previews.map((src, i) => (
                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border group">
                                        <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] rounded px-1">{i + 1}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {form.errors.foto && (
                            <p className="text-sm text-red-500">{form.errors.foto}</p>
                        )}

                        {previews.length === 5 && (
                            <Button type="submit" className="w-full" disabled={form.processing}>
                                <Upload className="h-4 w-4 mr-2" />
                                {form.processing ? 'Mengupload...' : 'Upload 5 Foto'}
                            </Button>
                        )}
                    </form>
                )}
            </div>
        </AppLayout>
    );
}

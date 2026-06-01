import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface FotoPreview { index: number; url: string }
interface Props {
    mahasiswa: { id: number; nim: string; nama: string; kelas?: { nama: string } };
    foto_previews: FotoPreview[];
    jarak_lulus: string[];
    semua_lulus: boolean;
    status_akun: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Enrollment', href: '/enrollment' },
    { title: 'Detail Enrollment', href: '#' },
];

const JARAK = [
    { key: 'dekat', label: 'Jarak Dekat', desc: '~30cm dari kamera' },
    { key: 'sedang', label: 'Jarak Sedang', desc: '~60cm dari kamera' },
    { key: 'jauh', label: 'Jarak Jauh', desc: '~100cm dari kamera' },
];

export default function EnrollmentDetail({ mahasiswa, foto_previews, jarak_lulus, semua_lulus, status_akun }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Enrollment — ${mahasiswa.nama}`} />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon"
                        onClick={() => router.get('/enrollment')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">{mahasiswa.nama}</h1>
                        <p className="text-sm text-muted-foreground">
                            {mahasiswa.nim} · {mahasiswa.kelas?.nama ?? '-'}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <Badge variant="outline"
                            className={status_akun === 'aktif'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'}>
                            {status_akun === 'aktif' ? 'Enrollment Aktif' : 'Menunggu Verifikasi'}
                        </Badge>
                    </div>
                </div>

                {/* Two column layout */}
                <div className="grid md:grid-cols-2 gap-5">

                    {/* Foto Preview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                                Foto Wajah Enrollment ({foto_previews.length}/5)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {foto_previews.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-8">
                                    Belum ada foto yang diupload.
                                </div>
                            ) : (
                                <div className="grid grid-cols-5 gap-2">
                                    {foto_previews.map(f => (
                                        <div key={f.index}
                                            className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                            <img src={f.url} alt={`Foto ${f.index + 1}`}
                                                className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hasil Verifikasi */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Hasil Verifikasi Wajah</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {JARAK.map(j => {
                                const lulus = jarak_lulus.includes(j.key);
                                return (
                                    <div key={j.key}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${
                                            lulus
                                                ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
                                                : 'bg-muted/40 border-border'
                                        }`}>
                                        <div className="flex items-center gap-2.5">
                                            {lulus
                                                ? <CheckCircle className="size-4 text-green-600 shrink-0" />
                                                : <XCircle className="size-4 text-muted-foreground shrink-0" />
                                            }
                                            <div>
                                                <p className="text-sm font-medium">{j.label}</p>
                                                <p className="text-xs text-muted-foreground">{j.desc}</p>
                                            </div>
                                        </div>
                                        {lulus && (
                                            <Badge variant="outline"
                                                className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                Lulus
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Actions */}
                            <div className="pt-3 flex gap-2">
                                {semua_lulus && status_akun !== 'aktif' && (
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => router.patch(`/enrollment/${mahasiswa.id}/approve`)}>
                                        <CheckCircle className="size-4 mr-1.5" />
                                        Approve Enrollment
                                    </Button>
                                )}
                                <ConfirmDialog
                                    title="Reset Enrollment?"
                                    description={`Semua foto dan encoding wajah ${mahasiswa.nama} akan dihapus permanen. Mahasiswa harus mengulang enrollment dari awal.`}
                                    confirmLabel="Ya, Reset"
                                    onConfirm={() => router.delete(`/enrollment/${mahasiswa.id}/reset`)}
                                    trigger={
                                        <Button variant="outline"
                                            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                                            Reset Enrollment
                                        </Button>
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

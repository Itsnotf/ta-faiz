import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface FotoPreview { index: number; url: string; }
interface Props {
    mahasiswa: { id: number; nim: string; nama: string; kelas?: { nama: string } };
    foto_previews: FotoPreview[];
    jarak_lulus: Record<string, number>;
    semua_lulus: boolean;
    status_akun: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Enrollment', href: '/enrollment' },
    { title: 'Detail', href: '#' },
];

const jarakList = [
    { key: 'dekat', label: 'Jarak Dekat (~30cm)' },
    { key: 'sedang', label: 'Jarak Sedang (~60cm)' },
    { key: 'jauh', label: 'Jarak Jauh (~1m)' },
];

export default function EnrollmentDetail({ mahasiswa, foto_previews, jarak_lulus, semua_lulus, status_akun }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Enrollment — ${mahasiswa.nama}`} />
            <div className="p-4 space-y-4 max-w-4xl">

                {/* Back */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.get('/enrollment')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">{mahasiswa.nama}</h1>
                        <p className="text-sm text-muted-foreground">
                            {mahasiswa.nim} · {mahasiswa.kelas?.nama ?? '-'}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* Foto Preview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Foto Enrollment ({foto_previews.length}/5)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {foto_previews.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Belum ada foto yang diupload.</p>
                            ) : (
                                <div className="grid grid-cols-5 gap-2">
                                    {foto_previews.map(f => (
                                        <div key={f.index} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                            <img src={f.url} alt={`Foto ${f.index}`}
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
                            <CardTitle className="text-base">Hasil Verifikasi 3 Jarak</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {jarakList.map(j => {
                                const confidence = jarak_lulus[j.key];
                                const lulus = confidence !== undefined;
                                return (
                                    <div key={j.key} className={`flex items-center justify-between p-3 rounded-lg border ${
                                        lulus ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
                                              : 'bg-muted/50 border-border'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            {lulus
                                                ? <CheckCircle className="size-4 text-green-600" />
                                                : <XCircle className="size-4 text-muted-foreground" />
                                            }
                                            <span className="text-sm font-medium">{j.label}</span>
                                        </div>
                                        {lulus && (
                                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                                {Math.round(confidence * 100)}% confidence
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Actions */}
                            <div className="pt-2 flex gap-2">
                                {semua_lulus && status_akun !== 'aktif' && (
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => router.patch(`/enrollment/${mahasiswa.id}/approve`)}>
                                        <CheckCircle className="size-4 mr-1.5" /> Approve Enrollment
                                    </Button>
                                )}
                                <ConfirmDialog
                                    title="Reset Enrollment?"
                                    description="Semua foto dan encoding wajah mahasiswa ini akan dihapus. Mahasiswa harus mengulang proses enrollment dari awal."
                                    confirmLabel="Ya, Reset"
                                    onConfirm={() => router.delete(`/enrollment/${mahasiswa.id}/reset`)}
                                    trigger={
                                        <Button variant="outline" className="hover:bg-red-50 hover:text-red-600">
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

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle, Info, XCircle } from 'lucide-react';

interface FotoPreview { index: number; url: string }
interface Props {
    mahasiswa: { nama: string; nim: string };
    foto_previews: FotoPreview[];
    jarak_lulus: string[];
    semua_lulus: boolean;
    status_akun: string;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Status Enrollment', href: '/enrollment/self-status' }];

const JARAK = [
    { key: 'dekat', label: 'Jarak Dekat',  desc: '~30cm dari kamera' },
    { key: 'sedang', label: 'Jarak Sedang', desc: '~60cm dari kamera' },
    { key: 'jauh',   label: 'Jarak Jauh',   desc: '~100cm dari kamera' },
];

export default function SelfStatusPage({ mahasiswa, foto_previews, jarak_lulus, semua_lulus, status_akun }: Props) {
    const isAktif = status_akun === 'aktif';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Status Enrollment Wajah" />
            <div className="p-6 space-y-5">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Status Enrollment Wajah</h1>
                        <p className="text-sm text-muted-foreground">
                            {mahasiswa.nama} · {mahasiswa.nim}
                        </p>
                    </div>
                    <Badge variant="outline" className={isAktif
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }>
                        {isAktif ? 'Enrollment Aktif' : 'Belum Aktif'}
                    </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-5">

                    {/* Foto Preview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                                Foto Wajah Terdaftar ({foto_previews.length}/5)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {foto_previews.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Belum ada foto yang diupload.
                                </p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-5 gap-2">
                                        {foto_previews.map(f => (
                                            <div key={f.index}
                                                className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                                <img src={f.url} alt={`Foto ${f.index + 1}`}
                                                    className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                    {isAktif && (
                                        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                            <Info className="size-4 text-blue-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-700">
                                                Jika foto tidak sesuai dengan penampilan Anda saat ini dan
                                                menyebabkan masalah absensi, hubungi admin jurusan untuk
                                                mereset enrollment.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hasil Verifikasi */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Hasil Verifikasi 3 Jarak</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {JARAK.map(j => {
                                const lulus = jarak_lulus.includes(j.key);
                                return (
                                    <div key={j.key}
                                        className={`flex items-center gap-2.5 p-3 rounded-lg border ${
                                            lulus
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-muted/40 border-border'
                                        }`}>
                                        {lulus
                                            ? <CheckCircle className="size-4 text-green-600 shrink-0" />
                                            : <XCircle className="size-4 text-muted-foreground shrink-0" />
                                        }
                                        <div>
                                            <p className="text-sm font-medium">{j.label}</p>
                                            <p className="text-xs text-muted-foreground">{j.desc}</p>
                                        </div>
                                        {lulus && (
                                            <Badge variant="outline"
                                                className="ml-auto bg-green-50 text-green-700 border-green-200 text-xs">
                                                Lulus
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}

                            {!isAktif && foto_previews.length === 5 && (
                                <div className="pt-1 p-3 rounded-lg bg-orange-50 border border-orange-200">
                                    <p className="text-xs text-orange-700">
                                        {semua_lulus
                                            ? 'Semua jarak telah diverifikasi. Enrollment aktif secara otomatis.'
                                            : 'Selesaikan verifikasi semua jarak untuk mengaktifkan enrollment.'}
                                    </p>
                                </div>
                            )}

                            {foto_previews.length === 0 && (
                                <div className="pt-1 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                    <p className="text-xs text-gray-600">
                                        Upload 5 foto wajah terlebih dahulu untuk memulai enrollment.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

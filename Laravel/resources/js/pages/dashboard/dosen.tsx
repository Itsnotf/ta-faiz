import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertCircle, Camera, CheckCircle, ClipboardList } from 'lucide-react';

interface JadwalHariIni {
    id: number;
    mata_kuliah: string;
    kelas: string;
    ruangan: string;
    jam_mulai: string;
    jam_selesai: string;
    status_hadir: 'hadir' | 'alpa' | 'belum';
}

interface AbsensiStats {
    hadir?: number;
    alpa?: number;
}

interface Props {
    dosen: { nama: string; nip: string; status_enrollment: string } | null;
    jadwal_hari_ini: JadwalHariIni[];
    absensi_stats: AbsensiStats;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const statusHadirConfig = {
    hadir:  { label: 'Hadir',  className: 'bg-green-100 text-green-800 border-green-200' },
    alpa:   { label: 'Alpa',   className: 'bg-red-100 text-red-800 border-red-200' },
    belum:  { label: 'Belum',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
} as const;

export default function DosenDashboard({ dosen, jadwal_hari_ini, absensi_stats }: Props) {
    if (!dosen) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Dashboard Dosen" />
                <div className="p-8 text-center text-muted-foreground">
                    Akun dosen belum terhubung. Hubungi administrator.
                </div>
            </AppLayout>
        );
    }

    const hadirCount = absensi_stats.hadir ?? 0;
    const alpaCount  = absensi_stats.alpa ?? 0;
    const totalCount = hadirCount + alpaCount;
    const pctHadir   = totalCount > 0 ? Math.round(hadirCount / totalCount * 100) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Dosen" />
            <div className="flex flex-col gap-4 p-4">

                {/* Banner Enrollment */}
                {dosen.status_enrollment !== 'aktif' && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-amber-800 text-sm">Enrollment wajah belum aktif</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                {dosen.status_enrollment === 'pending_upload'
                                    ? 'Upload 5 foto wajah untuk mendaftarkan diri ke sistem absensi.'
                                    : 'Lanjutkan verifikasi wajah dari 3 jarak berbeda.'}
                            </p>
                        </div>
                        <Button size="sm" variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                            onClick={() => router.visit('/enrollment-dosen')}>
                            <Camera className="size-3.5 mr-1.5" />
                            {dosen.status_enrollment === 'pending_upload' ? 'Upload Foto' : 'Verifikasi Wajah'}
                        </Button>
                    </div>
                )}

                {/* Header */}
                <div>
                    <h1 className="text-xl font-semibold">{dosen.nama}</h1>
                    <p className="text-sm text-muted-foreground">NIP: {dosen.nip}</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <Card>
                        <CardContent className="rounded-xl pt-4 text-center bg-green-50 text-green-700">
                            <p className="text-2xl font-bold">{hadirCount}</p>
                            <p className="text-sm">Hadir Bulan Ini</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="rounded-xl pt-4 text-center bg-red-50 text-red-700">
                            <p className="text-2xl font-bold">{alpaCount}</p>
                            <p className="text-sm">Alpa Bulan Ini</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className={`rounded-xl pt-4 text-center ${pctHadir >= 80 ? 'bg-green-50 text-green-700' : pctHadir >= 75 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                            <p className="text-2xl font-bold">{pctHadir}%</p>
                            <p className="text-sm">Kehadiran</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Jadwal Hari Ini */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Jadwal Mengajar Hari Ini</CardTitle>
                        {dosen.status_enrollment === 'aktif' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                <CheckCircle className="size-3 mr-1" /> Enrollment Aktif
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        {jadwal_hari_ini.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                Tidak ada jadwal mengajar hari ini.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Jam</TableHead>
                                        <TableHead>Mata Kuliah</TableHead>
                                        <TableHead>Kelas</TableHead>
                                        <TableHead>Ruangan</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {jadwal_hari_ini.map(j => {
                                        const cfg = statusHadirConfig[j.status_hadir] ?? statusHadirConfig.belum;
                                        return (
                                            <TableRow key={j.id}>
                                                <TableCell className="font-mono text-sm">
                                                    {j.jam_mulai} – {j.jam_selesai}
                                                </TableCell>
                                                <TableCell className="font-medium">{j.mata_kuliah}</TableCell>
                                                <TableCell>{j.kelas}</TableCell>
                                                <TableCell className="text-muted-foreground">{j.ruangan}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cfg.className}>
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Link ke Koreksi */}
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.visit('/koreksi-dosen')}>
                        <ClipboardList className="size-4 mr-2" />
                        Lihat Absensi & Koreksi
                    </Button>
                    {dosen.status_enrollment !== 'aktif' && (
                        <Button variant="outline" onClick={() => router.visit('/enrollment-dosen')}>
                            <Camera className="size-4 mr-2" />
                            Enrollment Wajah
                        </Button>
                    )}
                </div>

            </div>
        </AppLayout>
    );
}

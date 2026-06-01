import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Lock } from 'lucide-react';

interface SesiInfo {
    id: number; tanggal: string; status: string;
    mulai_at: string | null; selesai_at: string | null;
}
interface JadwalInfo { id: number; mata_kuliah: string; kelas: string; ruangan: string; }
interface DosenInfo {
    nama: string; status: string; hadir_at: string | null;
    confidence: number | null; is_locked: boolean;
}
interface MahasiswaRow {
    mahasiswa_id: number; nim: string; nama: string;
    status: string; hadir_at: string | null;
    confidence: number | null; is_locked: boolean;
}
interface Props {
    sesi: SesiInfo; jadwal: JadwalInfo;
    dosen: DosenInfo; mahasiswa_list: MahasiswaRow[];
}

const mhsStatusConfig: Record<string, { label: string; className: string }> = {
    hadir: { label: 'Hadir',  className: 'bg-green-100 text-green-800 border-green-200' },
    alpa:  { label: 'Alpa',   className: 'bg-red-100 text-red-800 border-red-200' },
    izin:  { label: 'Izin',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
    sakit: { label: 'Sakit',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    belum: { label: 'Belum',  className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function SesiDetailPage({ sesi, jadwal, dosen, mahasiswa_list }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rekap Absensi', href: '/absensi' },
        { title: jadwal.mata_kuliah, href: `/absensi/${jadwal.id}` },
        { title: sesi.tanggal, href: `/absensi/${jadwal.id}/${sesi.id}` },
    ];

    const dosenStatusCfg = dosen.status === 'hadir'
        ? { label: 'Hadir', className: 'bg-green-100 text-green-800 border-green-200' }
        : dosen.status === 'alpa'
        ? { label: 'Alpa', className: 'bg-red-100 text-red-800 border-red-200' }
        : { label: 'Belum Tercatat', className: 'bg-gray-100 text-gray-500 border-gray-200' };

    const stats = {
        hadir: mahasiswa_list.filter(m => m.status === 'hadir').length,
        alpa:  mahasiswa_list.filter(m => m.status === 'alpa').length,
        izin:  mahasiswa_list.filter(m => m.status === 'izin').length,
        sakit: mahasiswa_list.filter(m => m.status === 'sakit').length,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detail Sesi — ${sesi.tanggal}`} />
            <div className="p-4 space-y-4">

                {/* Back + Header */}
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"
                        onClick={() => router.get(`/absensi/${jadwal.id}`)}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">{jadwal.mata_kuliah}</h1>
                        <p className="text-sm text-muted-foreground">
                            {jadwal.kelas} · {jadwal.ruangan} · {sesi.tanggal}
                            {sesi.mulai_at && ` · ${sesi.mulai_at}${sesi.selesai_at ? `–${sesi.selesai_at}` : ''}`}
                        </p>
                    </div>
                </div>

                {/* Dosen Card — prominent di atas */}
                <Card className={`border-2 ${
                    dosen.status === 'hadir' ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
                    : dosen.status === 'alpa' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                    : 'border-border'
                }`}>
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Kehadiran Dosen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{dosen.nama}</p>
                                {dosen.hadir_at && (
                                    <p className="text-sm text-muted-foreground">
                                        Terdeteksi pukul {dosen.hadir_at}
                                        {dosen.confidence && ` · Confidence: ${dosen.confidence}%`}
                                    </p>
                                )}
                            </div>
                            <Badge variant="outline" className={`text-sm px-3 py-1 ${dosenStatusCfg.className}`}>
                                {dosenStatusCfg.label}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Mahasiswa */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Hadir',  value: stats.hadir, cls: 'text-green-700 bg-green-50 border-green-200' },
                        { label: 'Alpa',   value: stats.alpa,  cls: 'text-red-700 bg-red-50 border-red-200' },
                        { label: 'Izin',   value: stats.izin,  cls: 'text-blue-700 bg-blue-50 border-blue-200' },
                        { label: 'Sakit',  value: stats.sakit, cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
                    ].map(c => (
                        <div key={c.label} className={`rounded-xl border p-3 text-center ${c.cls}`}>
                            <p className="text-2xl font-bold">{c.value}</p>
                            <p className="text-xs mt-0.5">{c.label} / {mahasiswa_list.length}</p>
                        </div>
                    ))}
                </div>

                {/* Tabel Mahasiswa */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>NIM</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Waktu Hadir</TableHead>
                                <TableHead>Confidence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mahasiswa_list.map(row => {
                                const cfg = mhsStatusConfig[row.status] ?? mhsStatusConfig.belum;
                                return (
                                    <TableRow key={row.mahasiswa_id}>
                                        <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                                        <TableCell className="font-medium">{row.nama}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className={cfg.className}>
                                                    {cfg.label}
                                                </Badge>
                                                {row.is_locked && (
                                                    <Lock className="size-3 text-muted-foreground" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-muted-foreground">
                                            {row.hadir_at ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {row.confidence != null ? `${row.confidence}%` : '—'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

            </div>
        </AppLayout>
    );
}

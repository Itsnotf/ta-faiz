import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Lock } from 'lucide-react';

interface SesiInfo { id: number; tanggal: string; status: string; mulai_at: string | null; selesai_at: string | null }
interface JadwalInfo { id: number; mata_kuliah: string; kelas: string; ruangan: string }
interface DosenInfo { nama: string; status: string; hadir_at: string | null; confidence: number | null; is_locked: boolean }
interface MahasiswaRow { mahasiswa_id: number; nim: string; nama: string; status: string; hadir_at: string | null; confidence: number | null; is_locked: boolean }
interface Props { sesi: SesiInfo; jadwal: JadwalInfo; dosen: DosenInfo; mahasiswa_list: MahasiswaRow[] }

const mhsStatusCfg: Record<string, { label: string; cls: string }> = {
    hadir: { label: 'Hadir', cls: 'bg-green-50 text-green-700 border-green-200' },
    alpa:  { label: 'Alpa',  cls: 'bg-red-50 text-red-700 border-red-200' },
    izin:  { label: 'Izin',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    sakit: { label: 'Sakit', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    belum: { label: 'Belum', cls: 'bg-gray-50 text-gray-400 border-gray-200' },
};

export default function SesiDetailPage({ sesi, jadwal, dosen, mahasiswa_list }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rekap Absensi', href: '/absensi' },
        { title: jadwal.mata_kuliah, href: `/absensi/${jadwal.id}` },
        { title: sesi.tanggal, href: `/absensi/${jadwal.id}/${sesi.id}` },
    ];

    const stats = {
        hadir: mahasiswa_list.filter(m => m.status === 'hadir').length,
        alpa:  mahasiswa_list.filter(m => m.status === 'alpa').length,
        izin:  mahasiswa_list.filter(m => m.status === 'izin').length,
        sakit: mahasiswa_list.filter(m => m.status === 'sakit').length,
    };

    const dosenCardCls = dosen.status === 'hadir'
        ? 'border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/10'
        : dosen.status === 'alpa'
        ? 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10'
        : 'border-l-4 border-l-gray-300';

    const dosenBadgeCls = dosen.status === 'hadir'
        ? 'bg-green-50 text-green-700 border-green-200'
        : dosen.status === 'alpa'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-gray-50 text-gray-400 border-gray-200';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sesi ${sesi.tanggal} — ${jadwal.mata_kuliah}`} />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"
                        onClick={() => router.get(`/absensi/${jadwal.id}`)}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">{jadwal.mata_kuliah}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {jadwal.kelas} · {jadwal.ruangan} · {sesi.tanggal}
                            {sesi.mulai_at && ` · ${sesi.mulai_at}${sesi.selesai_at ? `–${sesi.selesai_at}` : ''}`}
                        </p>
                    </div>
                </div>

                {/* Dosen Card — prominent di atas, full width */}
                <Card className={`overflow-hidden ${dosenCardCls}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                    Kehadiran Dosen
                                </p>
                                <p className="font-semibold text-base">{dosen.nama}</p>
                                {dosen.hadir_at && (
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Terdeteksi pukul {dosen.hadir_at}
                                        {dosen.confidence && ` · Confidence ${dosen.confidence}%`}
                                    </p>
                                )}
                            </div>
                            <Badge variant="outline" className={`text-sm px-3 py-1 ${dosenBadgeCls}`}>
                                {dosen.status === 'hadir' ? 'Hadir' : dosen.status === 'alpa' ? 'Alpa' : 'Belum Tercatat'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Stat Cards Mahasiswa */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Hadir',  value: stats.hadir, accent: 'border-l-green-500',  text: 'text-green-700' },
                        { label: 'Alpa',   value: stats.alpa,  accent: 'border-l-red-500',    text: 'text-red-700' },
                        { label: 'Izin',   value: stats.izin,  accent: 'border-l-blue-500',   text: 'text-blue-700' },
                        { label: 'Sakit',  value: stats.sakit, accent: 'border-l-yellow-500', text: 'text-yellow-700' },
                    ].map(c => (
                        <Card key={c.label} className={`border-l-4 ${c.accent} overflow-hidden`}>
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</p>
                                <p className={`text-3xl font-bold mt-1 ${c.text}`}>{c.value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">dari {mahasiswa_list.length} mahasiswa</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabel Mahasiswa */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>NIM</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Waktu Hadir</TableHead>
                                <TableHead>Confidence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mahasiswa_list.map(row => {
                                const cfg = mhsStatusCfg[row.status] ?? mhsStatusCfg.belum;
                                return (
                                    <TableRow key={row.mahasiswa_id}>
                                        <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                                        <TableCell className="font-medium">{row.nama}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
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

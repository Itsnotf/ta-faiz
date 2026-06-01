import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/stat-card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { BookOpen, CheckCircle, Users, XCircle } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';

interface SesiAktif {
    id: number; mata_kuliah: string; kelas: string;
    dosen: string; ruangan: string; mulai_at: string;
    hadir: number; total: number;
}

interface KeteranganPending {
    id: number; mahasiswa_nama: string;
    mata_kuliah: string; tanggal: string;
    jenis: 'izin' | 'sakit';
}

interface AbsensiRow {
    nama: string; nim: string; mata_kuliah: string;
    status: string; hadir_at: string | null;
}

interface StatDosenHariIni {
    total: number;
    hadir: number;
    belum_hadir: { nama: string; mata_kuliah: string; kelas: string; jam_mulai: string; jam_selesai: string }[];
}

interface Props {
    statHadir: number;
    statAlpa: number;
    statKetPending: number;
    statEnrollment: number;
    sesiAktif: SesiAktif[];
    keteranganPending: KeteranganPending[];
    absensiHariIni: AbsensiRow[];
    kehadiranMingguIni: { hadir: number; alpa: number; izin_sakit: number };
    statDosenHariIni: StatDosenHariIni;
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const statusConfig: Record<string, { label: string; className: string }> = {
    hadir:  { label: 'Hadir',  className: 'bg-green-50 text-green-700 border-green-200' },
    alpa:   { label: 'Alpa',   className: 'bg-red-50 text-red-700 border-red-200' },
    izin:   { label: 'Izin',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
    sakit:  { label: 'Sakit',  className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};

const donutConfig = {
    hadir:      { label: 'Hadir',      color: '#22c55e' },
    alpa:       { label: 'Alpa',       color: '#ef4444' },
    izin_sakit: { label: 'Izin/Sakit', color: '#3b82f6' },
} satisfies ChartConfig;

export default function AdminJurusanDashboard({
    statHadir, statAlpa, statKetPending, statEnrollment,
    sesiAktif, keteranganPending, absensiHariIni, kehadiranMingguIni,
    statDosenHariIni,
}: Props) {

    const donutData = [
        { name: 'hadir',      value: kehadiranMingguIni.hadir,      fill: donutConfig.hadir.color },
        { name: 'alpa',       value: kehadiranMingguIni.alpa,       fill: donutConfig.alpa.color },
        { name: 'izin_sakit', value: kehadiranMingguIni.izin_sakit, fill: donutConfig.izin_sakit.color },
    ];
    const totalMinggu = donutData.reduce((s, d) => s + d.value, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Admin Jurusan" />
            <div className="flex flex-col gap-6 p-6">

                {/* Stat Cards — pakai StatCard standard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Hadir Hari Ini"   value={statHadir}      accent="green"  context="mahasiswa hadir" />
                    <StatCard label="Alpa Hari Ini"    value={statAlpa}       accent="red"    context="mahasiswa alpa" />
                    <StatCard label="Keterangan Masuk" value={statKetPending} accent="orange" context="menunggu review" />
                    <StatCard label="Sudah Enrollment" value={statEnrollment} accent="purple" context="akun aktif" />
                </div>

                {/* Dosen Hari Ini */}
                {statDosenHariIni.total > 0 && (
                    <Card>
                        <CardHeader className="pb-2 pt-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Kehadiran Dosen Hari Ini</CardTitle>
                                <Badge variant="outline"
                                    className={statDosenHariIni.hadir === statDosenHariIni.total
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-orange-50 text-orange-700 border-orange-200'}>
                                    {statDosenHariIni.hadir} / {statDosenHariIni.total} hadir
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {statDosenHariIni.belum_hadir.length === 0 ? (
                                <p className="text-sm text-green-700 flex items-center gap-1.5">
                                    <CheckCircle className="size-4" /> Semua dosen telah hadir hari ini.
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Dosen belum hadir ({statDosenHariIni.belum_hadir.length}):
                                    </p>
                                    {statDosenHariIni.belum_hadir.slice(0, 5).map((d, i) => (
                                        <div key={i}
                                            className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                                            <div>
                                                <p className="font-medium">{d.nama}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {d.mata_kuliah} · {d.kelas} · {d.jam_mulai}–{d.jam_selesai}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                                Belum Hadir
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">

                    {/* Sesi Aktif */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <BookOpen className="h-4 w-4" />
                                Sesi Berlangsung
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {sesiAktif.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Tidak ada sesi berlangsung.</p>
                            ) : sesiAktif.map((s) => {
                                const pct = s.total > 0 ? Math.round((s.hadir / s.total) * 100) : 0;
                                return (
                                    <div key={s.id} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{s.mata_kuliah}</span>
                                            <span className="text-muted-foreground">{s.hadir}/{s.total}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{s.kelas} · {s.ruangan} · {s.mulai_at}</div>
                                        <div className="h-2 w-full rounded-full bg-muted">
                                            <div className="h-2 rounded-full bg-green-500 transition-all"
                                                style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="text-xs text-muted-foreground text-right">{pct}% hadir</p>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Donut Chart Kehadiran Minggu Ini */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Kehadiran Minggu Ini</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {totalMinggu === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Belum ada data minggu ini.</p>
                            ) : (
                                <>
                                    <ChartContainer config={donutConfig} className="mx-auto h-48">
                                        <PieChart>
                                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                            <Pie data={donutData} dataKey="value" nameKey="name"
                                                innerRadius={55} outerRadius={80} paddingAngle={2}>
                                                {donutData.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ChartContainer>
                                    <div className="flex justify-center gap-4 mt-2">
                                        {donutData.map((d) => (
                                            <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                                <span className="inline-block h-3 w-3 rounded-full" style={{ background: d.fill }} />
                                                <span className="text-muted-foreground">
                                                    {donutConfig[d.name as keyof typeof donutConfig].label}: {d.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Keterangan Pending */}
                {keteranganPending.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Keterangan Pending</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => router.visit('/keterangan/admin')}>
                                Lihat Semua
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {keteranganPending.map((k) => (
                                <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <p className="font-medium text-sm">{k.mahasiswa_nama}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {k.mata_kuliah} · {k.tanggal} ·{' '}
                                            <Badge variant="outline" className={k.jenis === 'sakit'
                                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200 text-xs'
                                                : 'bg-blue-50 text-blue-700 border-blue-200 text-xs'}>
                                                {k.jenis}
                                            </Badge>
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8"
                                            onClick={() => router.post(`/keterangan/${k.id}/approve`, { _method: 'PATCH' })}>
                                            <CheckCircle className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" variant="destructive" className="h-8"
                                            onClick={() => router.post(`/keterangan/${k.id}/reject`, { _method: 'PATCH' })}>
                                            <XCircle className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Absensi Hari Ini */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4" />
                            Absensi Hari Ini
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={() => router.visit('/absensi')}>
                            Rekap Lengkap
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>NIM</TableHead>
                                    <TableHead>Mata Kuliah</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Waktu</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {absensiHariIni.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                            Belum ada absensi hari ini.
                                        </TableCell>
                                    </TableRow>
                                ) : absensiHariIni.map((row, i) => {
                                    const cfg = statusConfig[row.status] ?? statusConfig.alpa;
                                    return (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{row.nama}</TableCell>
                                            <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                                            <TableCell>{row.mata_kuliah}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{row.hadir_at ?? '—'}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}

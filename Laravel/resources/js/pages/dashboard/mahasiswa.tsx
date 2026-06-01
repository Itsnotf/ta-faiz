import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/stat-card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertCircle, Camera, CheckCircle, Circle, Info, Upload } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface Matkul  { mata_kuliah: string; hadir: number; total: number; persen: number }
interface JadwalRow { id: number; mata_kuliah: string; hari: string; jam_mulai: string; jam_selesai: string }
interface JadwalHariIni { mata_kuliah: string; dosen: string; ruangan: string; jam_mulai: string; jam_selesai: string; status_sesi: string }
interface AbsensiRow { mata_kuliah: string; tanggal: string; status: string; hadir_at: string | null }
interface EnrollmentStatus { status_akun: string; jarak_lulus: string[]; semua_jarak_lulus: boolean }

interface Props {
    mahasiswa: { nama: string; nim: string; kelas: string; prodi: string };
    stat: { hadir: number; alpa: number; izin: number; sakit: number; rata_rata: number };
    kehadiran_per_matkul: Matkul[];
    warning_matkul: Matkul[];
    jadwal_minggu_ini: JadwalRow[];
    jadwal_hari_ini: JadwalHariIni[];
    hari_ini: string | null;
    riwayat_terbaru: AbsensiRow[];
    enrollment_status: EnrollmentStatus;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const statusConfig: Record<string, { label: string; className: string }> = {
    hadir: { label: 'Hadir',  className: 'bg-green-100 text-green-800 border-green-200' },
    alpa:  { label: 'Alpa',   className: 'bg-red-100 text-red-700 border-red-200' },
    izin:  { label: 'Izin',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
    sakit: { label: 'Sakit',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
};

const barConfig = {
    persen: { label: 'Kehadiran (%)' },
} satisfies ChartConfig;

function matkulColor(pct: number) {
    if (pct >= 80) return '#22c55e';
    if (pct >= 75) return '#eab308';
    return '#ef4444';
}

const STEPS = [
    { label: 'Upload Foto',        key: 'upload' },
    { label: 'Generate Encoding',  key: 'encoding' },
    { label: 'Verifikasi Jarak',   key: 'verifikasi' },
    { label: 'Approve Admin',      key: 'approve' },
];

function getStepStatus(status_akun: string, jarak_lulus: string[], semua_jarak_lulus: boolean) {
    return [
        status_akun !== 'pending_upload',
        status_akun !== 'pending_upload',
        semua_jarak_lulus,
        status_akun === 'aktif',
    ];
}

export default function MahasiswaDashboard({
    mahasiswa, stat, kehadiran_per_matkul, warning_matkul,
    jadwal_minggu_ini, jadwal_hari_ini, hari_ini, riwayat_terbaru, enrollment_status,
}: Props) {

    const { status_akun, jarak_lulus, semua_jarak_lulus } = enrollment_status;
    const stepDone = getStepStatus(status_akun, jarak_lulus, semua_jarak_lulus);

    const barData = kehadiran_per_matkul.map(m => ({
        name: m.mata_kuliah.length > 20 ? m.mata_kuliah.slice(0, 18) + '…' : m.mata_kuliah,
        persen: m.persen,
        fill: matkulColor(m.persen),
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Mahasiswa" />
            <div className="flex flex-col gap-4 p-4">

                {/* Banner Enrollment */}
                {status_akun !== 'aktif' && (
                    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-800 text-sm">Enrollment belum selesai</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                                Absensi otomatis hanya bekerja jika wajah sudah terdaftar.{' '}
                                {status_akun === 'pending_upload' && 'Silakan hubungi admin untuk upload foto.'}
                                {status_akun === 'pending_verifikasi' && 'Admin sedang memproses verifikasi wajah.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Header Mahasiswa */}
                <div>
                    <h1 className="text-xl font-semibold">{mahasiswa.nama}</h1>
                    <p className="text-sm text-muted-foreground">{mahasiswa.nim} · {mahasiswa.kelas} · {mahasiswa.prodi}</p>
                </div>

                {/* Jadwal Hari Ini — paling atas */}
                {hari_ini && (
                    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base capitalize">Jadwal Hari Ini — {hari_ini}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {jadwal_hari_ini.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Tidak ada jadwal kuliah hari ini.</p>
                            ) : (
                                <div className="space-y-2">
                                    {jadwal_hari_ini.map((j, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                                            <div>
                                                <p className="font-medium">{j.mata_kuliah}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {j.dosen} · {j.ruangan} · {j.jam_mulai}–{j.jam_selesai}
                                                </p>
                                            </div>
                                            <Badge variant="outline"
                                                className={j.status_sesi === 'berlangsung'
                                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                                    : j.status_sesi === 'selesai'
                                                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                    : 'bg-muted text-muted-foreground'}>
                                                {j.status_sesi === 'berlangsung' ? 'Sedang Berlangsung'
                                                    : j.status_sesi === 'selesai' ? 'Selesai'
                                                    : 'Belum Dimulai'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Warning Kehadiran — jika ada yang < 80% */}
                {warning_matkul.length > 0 && (
                    <Card className="border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-red-800 text-sm">
                                        {warning_matkul.length} mata kuliah kehadiran di bawah 80%
                                    </p>
                                    <div className="mt-1.5 space-y-0.5">
                                        {warning_matkul.map((m, i) => (
                                            <p key={i} className="text-xs text-red-700">
                                                {m.mata_kuliah} — {m.persen}% ({m.hadir}/{m.total} pertemuan)
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Hadir"  value={stat.hadir}  accent="green"  context={`${stat.rata_rata}% rata-rata`} />
                    <StatCard label="Alpa"   value={stat.alpa}   accent="red"    context="pertemuan tidak hadir" />
                    <StatCard label="Izin"   value={stat.izin}   accent="blue"   context="dengan keterangan" />
                    <StatCard label="Sakit"  value={stat.sakit}  accent="yellow" context="dengan keterangan" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">

                    {/* Bar Chart per Matkul */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Kehadiran per Mata Kuliah</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {barData.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">Belum ada data absensi.</p>
                            ) : (
                                <ChartContainer config={barConfig} className="h-52 w-full">
                                    <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 28 }}>
                                        <CartesianGrid horizontal={false} />
                                        <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="persen" radius={4} />
                                    </BarChart>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Stepper Enrollment */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Status Enrollment Wajah</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="relative space-y-4 border-l border-muted ml-3">
                                {STEPS.map((step, i) => (
                                    <li key={step.key} className="pl-6">
                                        <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                                            stepDone[i]
                                                ? 'border-green-500 bg-green-100'
                                                : 'border-muted bg-background'
                                        }`}>
                                            {stepDone[i]
                                                ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                                : <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                                            }
                                        </span>
                                        <p className={`text-sm font-medium ${stepDone[i] ? 'text-green-700' : 'text-muted-foreground'}`}>
                                            {step.label}
                                        </p>
                                        {step.key === 'verifikasi' && jarak_lulus.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {['dekat', 'sedang', 'jauh'].map(j => (
                                                    <Badge key={j} variant="outline" className={jarak_lulus.includes(j)
                                                        ? 'text-xs bg-green-50 text-green-700 border-green-200'
                                                        : 'text-xs bg-gray-50 text-gray-400 border-gray-200'}>
                                                        {j}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        {step.key === 'upload' && status_akun === 'pending_upload' && (
                                            <button
                                                className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                                onClick={() => router.visit('/enrollment/self-upload')}
                                            >
                                                <Upload className="h-3 w-3" /> Upload foto sekarang
                                            </button>
                                        )}
                                        {step.key === 'verifikasi' && status_akun === 'pending_verifikasi' && !semua_jarak_lulus && (
                                            <button
                                                className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                                onClick={() => router.visit('/enrollment/self-verify')}
                                            >
                                                <Camera className="h-3 w-3" /> Mulai verifikasi wajah
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                {/* Jadwal Minggu Ini */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Jadwal Minggu Ini</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hari</TableHead>
                                    <TableHead>Mata Kuliah</TableHead>
                                    <TableHead>Jam</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jadwal_minggu_ini.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                            Tidak ada jadwal minggu ini.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    jadwal_minggu_ini.map(j => (
                                        <TableRow key={j.id} className={j.hari === hari_ini ? 'bg-blue-50 dark:bg-blue-950/30' : ''}>
                                            <TableCell className="capitalize font-medium">
                                                {j.hari}
                                                {j.hari === hari_ini && (
                                                    <Badge className="ml-2 text-[10px] bg-blue-100 text-blue-700 border-blue-200" variant="outline">Hari ini</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{j.mata_kuliah}</TableCell>
                                            <TableCell className="font-mono text-sm">{j.jam_mulai} – {j.jam_selesai}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Riwayat Terbaru */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Riwayat Absensi Terbaru</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mata Kuliah</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Waktu</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {riwayat_terbaru.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                            Belum ada riwayat absensi.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    riwayat_terbaru.map((r, i) => {
                                        const cfg = statusConfig[r.status] ?? statusConfig.alpa;
                                        return (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{r.mata_kuliah}</TableCell>
                                                <TableCell>{r.tanggal}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{r.hadir_at ?? '—'}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}

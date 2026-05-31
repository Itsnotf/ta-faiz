import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { BookOpen, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface JurusanKehadiran {
    nama: string;
    persen_hadir: number;
    total_alpa: number;
    total_izin_sakit: number;
}

interface JurusanEnrollment {
    nama: string;
    persen_selesai: number;
    aktif: number;
    total: number;
}

interface AktivitasItem {
    type: 'alpa' | 'enrollment';
    label: string;
    timestamp: string;
}

interface Props {
    totalMahasiswaAktif: number;
    rataKehadiran: number;
    sesiHariIni: number;
    sesiBerlangsung: number;
    enrollmentPct: number;
    kehadiranPerJurusan: JurusanKehadiran[];
    enrollmentPerJurusan: JurusanEnrollment[];
    aktivitasTerbaru: AktivitasItem[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const barConfig = {
    persen_hadir: { label: 'Kehadiran (%)' },
} satisfies ChartConfig;

function kehadiranColor(pct: number) {
    if (pct >= 85) return '#22c55e';
    if (pct >= 75) return '#eab308';
    return '#ef4444';
}

export default function SuperAdminDashboard({
    totalMahasiswaAktif, rataKehadiran, sesiHariIni, sesiBerlangsung,
    enrollmentPct, kehadiranPerJurusan, enrollmentPerJurusan, aktivitasTerbaru,
}: Props) {
    const [activeRuangan, setActiveRuangan] = useState<number[]>([]);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_PYTHON_SERVICE_URL ?? 'http://localhost:8001'}/session/status`)
            .then(res => setActiveRuangan(res.data.active_ruangan ?? []))
            .catch(() => setActiveRuangan([]));
    }, []);

    const barData = kehadiranPerJurusan.map(j => ({
        nama: j.nama,
        persen_hadir: j.persen_hadir,
        fill: kehadiranColor(j.persen_hadir),
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Super Admin" />
            <div className="flex flex-col gap-6 p-4">

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                        { title: 'Mahasiswa Aktif',   value: totalMahasiswaAktif, icon: GraduationCap, cls: 'text-blue-600' },
                        { title: 'Rata Kehadiran',    value: `${rataKehadiran}%`, icon: TrendingUp,    cls: 'text-green-600' },
                        { title: 'Sesi Hari Ini',     value: sesiHariIni,         icon: BookOpen,      cls: 'text-purple-600' },
                        { title: 'Berlangsung',       value: sesiBerlangsung,     icon: Users,         cls: 'text-orange-600' },
                    ].map(({ title, value, icon: Icon, cls }) => (
                        <Card key={title}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                                <Icon className={`h-5 w-5 ${cls}`} />
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">

                    {/* Bar Chart Kehadiran per Jurusan */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Kehadiran per Jurusan</CardTitle>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green-500" /> ≥85%</span>
                                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-yellow-500" /> 75–84%</span>
                                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500" /> &lt;75%</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {barData.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">Belum ada data.</p>
                            ) : (
                                <ChartContainer config={barConfig} className="h-48 w-full">
                                    <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 24 }}>
                                        <CartesianGrid horizontal={false} />
                                        <YAxis dataKey="nama" type="category" width={100} tick={{ fontSize: 11 }} />
                                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="persen_hadir" radius={4} />
                                    </BarChart>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Enrollment per Jurusan */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Enrollment per Jurusan
                                <span className="ml-2 text-sm font-normal text-muted-foreground">({enrollmentPct}% total selesai)</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {enrollmentPerJurusan.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Belum ada data.</p>
                            ) : (
                                enrollmentPerJurusan.map(j => (
                                    <div key={j.nama} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{j.nama}</span>
                                            <span className="text-muted-foreground">{j.aktif}/{j.total}</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted">
                                            <div
                                                className="h-2 rounded-full bg-blue-500 transition-all"
                                                style={{ width: `${j.persen_selesai}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-right text-muted-foreground">{j.persen_selesai}%</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">

                    {/* Feed Aktivitas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {aktivitasTerbaru.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {aktivitasTerbaru.map((a, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                                a.type === 'enrollment' ? 'bg-blue-500' : 'bg-red-500'
                                            }`}>
                                                {a.type === 'enrollment' ? 'E' : 'A'}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm truncate">{a.label}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(a.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {/* Status Python / Kamera Aktif */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Status Python Service</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activeRuangan.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Tidak ada ruangan yang aktif saat ini.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {activeRuangan.map((rid) => (
                                        <li key={rid} className="flex items-center gap-2 text-sm">
                                            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                            Ruangan ID {rid} — kamera aktif
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="mt-3 flex items-center gap-1.5">
                                <Badge variant="outline" className={activeRuangan.length > 0
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-gray-50 text-gray-500 border-gray-200'}>
                                    {activeRuangan.length > 0 ? 'Online' : 'Idle'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Python service :8001</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}

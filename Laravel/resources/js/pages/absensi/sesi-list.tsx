import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, ChevronRight, Clock, Users } from 'lucide-react';

interface JadwalInfo {
    id: number; mata_kuliah: string; hari: string;
    jam_mulai: string; jam_selesai: string;
    kelas: string; dosen: string; ruangan: string;
    total_mahasiswa: number;
    window_menit: number; window_dosen_menit: number;
}
interface SesiRow {
    id: number; tanggal: string; status: string;
    hadir: number; alpa: number; izin: number; sakit: number;
    total: number; persen_hadir: number;
    status_dosen: string; dosen_hadir_at: string | null;
}
interface Props { jadwal: JadwalInfo; sesi_list: SesiRow[] }

function PersenBar({ persen }: { persen: number }) {
    const color = persen >= 80 ? 'bg-green-500' : persen >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${persen}%` }} />
            </div>
            <span className="text-sm font-medium tabular-nums">{persen}%</span>
        </div>
    );
}

const dosenStatusCfg: Record<string, { label: string; cls: string }> = {
    hadir: { label: 'Hadir', cls: 'bg-green-50 text-green-700 border-green-200' },
    alpa:  { label: 'Alpa',  cls: 'bg-red-50 text-red-700 border-red-200' },
    belum: { label: '—',     cls: 'bg-gray-50 text-gray-400 border-gray-200' },
};

export default function SesiListPage({ jadwal, sesi_list }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rekap Absensi', href: '/absensi' },
        { title: jadwal.mata_kuliah, href: `/absensi/${jadwal.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Rekap — ${jadwal.mata_kuliah}`} />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"
                        onClick={() => router.get('/absensi')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold">{jadwal.mata_kuliah}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {jadwal.kelas} · {jadwal.dosen} · {jadwal.ruangan}
                            · <span className="capitalize">{jadwal.hari}</span> {jadwal.jam_mulai}–{jadwal.jam_selesai}
                        </p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Pertemuan', value: sesi_list.length,              icon: Clock,  accent: 'border-l-blue-500' },
                        { label: 'Total Mahasiswa', value: jadwal.total_mahasiswa,         icon: Users,  accent: 'border-l-purple-500' },
                        { label: 'Window Mahasiswa', value: `${jadwal.window_menit} menit`, icon: Clock,  accent: 'border-l-green-500' },
                        { label: 'Window Dosen',    value: `${jadwal.window_dosen_menit} menit`, icon: Clock, accent: 'border-l-orange-500' },
                    ].map(c => (
                        <Card key={c.label} className={`border-l-4 ${c.accent} overflow-hidden`}>
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</p>
                                <p className="text-2xl font-bold mt-1">{c.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabel Sesi */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>Tanggal</TableHead>
                                <TableHead className="text-center text-green-700">Hadir</TableHead>
                                <TableHead className="text-center text-red-700">Alpa</TableHead>
                                <TableHead className="text-center text-blue-700">Izin</TableHead>
                                <TableHead className="text-center text-yellow-700">Sakit</TableHead>
                                <TableHead>% Kehadiran</TableHead>
                                <TableHead className="text-center">Dosen</TableHead>
                                <TableHead>Status Sesi</TableHead>
                                <TableHead className="w-8"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sesi_list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-20">
                                        Belum ada sesi untuk jadwal ini. Sesi akan muncul otomatis saat perkuliahan berlangsung.
                                    </TableCell>
                                </TableRow>
                            ) : sesi_list.map(s => {
                                const dsn = dosenStatusCfg[s.status_dosen] ?? dosenStatusCfg.belum;
                                return (
                                    <TableRow key={s.id}
                                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                                        onClick={() => router.get(`/absensi/${jadwal.id}/${s.id}`)}>
                                        <TableCell className="font-medium">{s.tanggal}</TableCell>
                                        <TableCell className="text-center font-semibold text-green-700">{s.hadir}</TableCell>
                                        <TableCell className="text-center font-semibold text-red-700">{s.alpa}</TableCell>
                                        <TableCell className="text-center font-semibold text-blue-700">{s.izin}</TableCell>
                                        <TableCell className="text-center font-semibold text-yellow-700">{s.sakit}</TableCell>
                                        <TableCell><PersenBar persen={s.persen_hadir} /></TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`text-xs ${dsn.cls}`}>
                                                {dsn.label}
                                                {s.dosen_hadir_at && (
                                                    <span className="ml-1 opacity-70">{s.dosen_hadir_at}</span>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline"
                                                className={s.status === 'berlangsung'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 text-xs'}>
                                                {s.status === 'berlangsung' ? 'Berlangsung' : 'Selesai'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className="size-4 text-muted-foreground" />
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

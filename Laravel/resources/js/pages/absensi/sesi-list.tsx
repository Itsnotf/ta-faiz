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

interface Props {
    jadwal: JadwalInfo;
    sesi_list: SesiRow[];
}

const dosenStatusConfig: Record<string, { label: string; className: string }> = {
    hadir: { label: 'Hadir', className: 'bg-green-100 text-green-800 border-green-200' },
    alpa:  { label: 'Alpa',  className: 'bg-red-100 text-red-800 border-red-200' },
    belum: { label: 'Belum', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function PersenBar({ persen }: { persen: number }) {
    const color = persen >= 80 ? 'bg-green-500' : persen >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${persen}%` }} />
            </div>
            <span className="text-sm font-medium">{persen}%</span>
        </div>
    );
}

export default function SesiListPage({ jadwal, sesi_list }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Rekap Absensi', href: '/absensi' },
        { title: jadwal.mata_kuliah, href: `/absensi/${jadwal.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Rekap — ${jadwal.mata_kuliah}`} />
            <div className="p-4 space-y-4">

                {/* Back + Header */}
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"
                        onClick={() => router.get('/absensi')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">{jadwal.mata_kuliah}</h1>
                        <p className="text-sm text-muted-foreground">
                            {jadwal.kelas} · {jadwal.dosen} · {jadwal.ruangan}
                            · <span className="capitalize">{jadwal.hari}</span> {jadwal.jam_mulai}–{jadwal.jam_selesai}
                        </p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Pertemuan', value: sesi_list.length, icon: Clock },
                        { label: 'Total Mahasiswa', value: jadwal.total_mahasiswa, icon: Users },
                        { label: 'Window Mahasiswa', value: `${jadwal.window_menit} menit`, icon: Clock },
                        { label: 'Window Dosen', value: `${jadwal.window_dosen_menit} menit`, icon: Clock },
                    ].map(c => (
                        <Card key={c.label} className="border-border/50">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">{c.label}</p>
                                <p className="text-xl font-bold mt-0.5">{c.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabel Sesi */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Tanggal</TableHead>
                                <TableHead className="text-center">Hadir</TableHead>
                                <TableHead className="text-center">Alpa</TableHead>
                                <TableHead className="text-center">Izin</TableHead>
                                <TableHead className="text-center">Sakit</TableHead>
                                <TableHead>% Kehadiran</TableHead>
                                <TableHead className="text-center">Status Dosen</TableHead>
                                <TableHead>Status Sesi</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sesi_list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-16">
                                        Belum ada sesi yang berlangsung untuk jadwal ini.
                                        Sesi akan muncul otomatis saat jadwal berlangsung.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sesi_list.map(s => {
                                    const dosenCfg = dosenStatusConfig[s.status_dosen] ?? dosenStatusConfig.belum;
                                    return (
                                        <TableRow key={s.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => router.get(`/absensi/${jadwal.id}/${s.id}`)}>
                                            <TableCell className="font-medium">{s.tanggal}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-green-700 font-medium">{s.hadir}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-red-700 font-medium">{s.alpa}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-blue-700 font-medium">{s.izin}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-yellow-700 font-medium">{s.sakit}</span>
                                            </TableCell>
                                            <TableCell><PersenBar persen={s.persen_hadir} /></TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={dosenCfg.className}>
                                                    {dosenCfg.label}
                                                    {s.dosen_hadir_at && (
                                                        <span className="ml-1 opacity-70">{s.dosen_hadir_at}</span>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline"
                                                    className={s.status === 'berlangsung'
                                                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                                                        : 'bg-gray-100 text-gray-600 border-gray-200'}>
                                                    {s.status === 'berlangsung' ? 'Berlangsung' : 'Selesai'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <ChevronRight className="size-4 text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}

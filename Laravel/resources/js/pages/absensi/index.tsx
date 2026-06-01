import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronRight, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

interface JadwalRow {
    id: number;
    mata_kuliah: string;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    kelas: string;
    prodi: string;
    dosen: string;
    ruangan: string;
    total_sesi: number;
    total_mahasiswa: number;
    persen_hadir: number | null;
    status_dosen_terakhir: string | null;
}

interface Props {
    jadwal_list: JadwalRow[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Rekap Absensi', href: '/absensi' }];

const HARI_ORDER = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const HARI_LABELS: Record<string, string> = {
    senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu',
    kamis: 'Kamis', jumat: 'Jumat', sabtu: 'Sabtu',
};

function PersenBadge({ persen }: { persen: number | null }) {
    if (persen === null) return <span className="text-sm text-muted-foreground">—</span>;
    const cls = persen >= 80
        ? 'bg-green-100 text-green-800 border-green-200'
        : persen >= 60
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-red-100 text-red-800 border-red-200';
    return <Badge variant="outline" className={cls}>{persen}%</Badge>;
}

function DosenStatusBadge({ status }: { status: string | null }) {
    if (!status || status === 'belum') return (
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-xs">—</Badge>
    );
    if (status === 'hadir') return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">Hadir</Badge>
    );
    return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">Alpa</Badge>
    );
}

export default function AbsensiPage({ jadwal_list }: Props) {
    const [search, setSearch] = useState('');
    const [filterHari, setFilterHari] = useState<string>('semua');

    const filtered = useMemo(() => {
        return jadwal_list.filter(j => {
            const matchSearch = search === '' ||
                j.mata_kuliah.toLowerCase().includes(search.toLowerCase()) ||
                j.kelas.toLowerCase().includes(search.toLowerCase()) ||
                j.dosen.toLowerCase().includes(search.toLowerCase());
            const matchHari = filterHari === 'semua' || j.hari === filterHari;
            return matchSearch && matchHari;
        });
    }, [jadwal_list, search, filterHari]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rekap Absensi" />
            <div className="p-4 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold">Rekap Absensi</h1>
                        <p className="text-sm text-muted-foreground">
                            {jadwal_list.length} jadwal — klik baris untuk melihat rekap per sesi
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            className="pl-8"
                            placeholder="Cari mata kuliah, kelas, dosen..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1">
                        {['semua', ...HARI_ORDER].map(h => (
                            <Button
                                key={h}
                                size="sm"
                                variant={filterHari === h ? 'default' : 'outline'}
                                onClick={() => setFilterHari(h)}
                                className="capitalize"
                            >
                                {h === 'semua' ? 'Semua' : HARI_LABELS[h]}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Tabel Jadwal */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Mata Kuliah</TableHead>
                                <TableHead>Kelas / Prodi</TableHead>
                                <TableHead>Dosen</TableHead>
                                <TableHead>Jadwal</TableHead>
                                <TableHead className="text-center">Total Sesi</TableHead>
                                <TableHead className="text-center">% Hadir Mhs</TableHead>
                                <TableHead className="text-center">Dosen Sesi Terakhir</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-16">
                                        {jadwal_list.length === 0
                                            ? 'Belum ada jadwal yang tersedia.'
                                            : 'Tidak ada jadwal yang cocok dengan filter.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map(j => (
                                    <TableRow
                                        key={j.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => router.get(`/absensi/${j.id}`)}
                                    >
                                        <TableCell className="font-medium">{j.mata_kuliah}</TableCell>
                                        <TableCell>
                                            <p className="font-medium text-sm">{j.kelas}</p>
                                            <p className="text-xs text-muted-foreground">{j.prodi}</p>
                                        </TableCell>
                                        <TableCell className="text-sm">{j.dosen}</TableCell>
                                        <TableCell>
                                            <p className="text-sm font-medium capitalize">{j.hari}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {j.jam_mulai} – {j.jam_selesai}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="font-medium">{j.total_sesi}</span>
                                            <span className="text-xs text-muted-foreground ml-1">pertemuan</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <PersenBadge persen={j.persen_hadir} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <DosenStatusBadge status={j.status_dosen_terakhir} />
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className="size-4 text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}

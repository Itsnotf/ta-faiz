import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface RekapMatkul {
    mata_kuliah: string;
    hadir: number;
    alpa: number;
    izin: number;
    sakit: number;
    total_pertemuan: number;
    persen_hadir: number;
}

interface Props {
    mahasiswa: { id: number; nama: string; nim: string };
    rekap: RekapMatkul[];
    filters: { dari?: string; sampai?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Laporan', href: '/laporan' },
    { title: 'Detail Mahasiswa', href: '#' },
];

function pctClass(pct: number) {
    if (pct >= 80) return 'text-green-700 font-semibold';
    if (pct >= 75) return 'text-yellow-700 font-semibold';
    return 'text-red-700 font-bold';
}

export default function LaporanMahasiswaPage({ mahasiswa, rekap, filters }: Props) {

    function applyDateFilter(key: string, val: string) {
        router.get(`/laporan/mahasiswa/${mahasiswa.id}`, { ...filters, [key]: val }, { preserveState: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Laporan — ${mahasiswa.nama}`} />
            <div className="p-4 space-y-4">

                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/laporan')}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">{mahasiswa.nama}</h1>
                        <p className="text-sm text-muted-foreground font-mono">{mahasiswa.nim}</p>
                    </div>
                </div>

                {/* Date Filter */}
                <div className="flex gap-3 items-end">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Dari Tanggal</p>
                        <input
                            type="date"
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={filters.dari ?? ''}
                            onChange={e => applyDateFilter('dari', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Sampai Tanggal</p>
                        <input
                            type="date"
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={filters.sampai ?? ''}
                            onChange={e => applyDateFilter('sampai', e.target.value)}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mata Kuliah</TableHead>
                            <TableHead className="text-center">Hadir</TableHead>
                            <TableHead className="text-center">Alpa</TableHead>
                            <TableHead className="text-center">Izin</TableHead>
                            <TableHead className="text-center">Sakit</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">% Hadir</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rekap.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                                    Tidak ada data untuk periode ini.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rekap.map(row => (
                                <TableRow key={row.mata_kuliah}>
                                    <TableCell className="font-medium">{row.mata_kuliah}</TableCell>
                                    <TableCell className="text-center">{row.hadir}</TableCell>
                                    <TableCell className="text-center">{row.alpa}</TableCell>
                                    <TableCell className="text-center">{row.izin}</TableCell>
                                    <TableCell className="text-center">{row.sakit}</TableCell>
                                    <TableCell className="text-center text-muted-foreground">{row.total_pertemuan}</TableCell>
                                    <TableCell className={`text-center ${pctClass(row.persen_hadir)}`}>
                                        {row.persen_hadir}%
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </AppLayout>
    );
}

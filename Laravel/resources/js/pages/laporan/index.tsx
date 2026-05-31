import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface Kelas  { id: number; nama: string; prodi?: { nama: string } }
interface Jadwal { id: number; mata_kuliah: string; hari: string; jam_mulai: string }
interface RekapRow {
    mahasiswa_id: number;
    nim: string;
    nama: string;
    hadir: number;
    alpa: number;
    izin: number;
    sakit: number;
    total_pertemuan: number;
    persen_hadir: number;
}

interface Props {
    kelasList:  Kelas[];
    jadwalList: Jadwal[];
    rekap:      RekapRow[];
    filters: { kelas_id?: string; jadwal_id?: string; dari?: string; sampai?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Laporan Kehadiran', href: '/laporan' }];

function pctClass(pct: number) {
    if (pct >= 80) return 'text-green-700';
    if (pct >= 75) return 'text-yellow-700';
    return 'text-red-700 font-semibold';
}

export default function LaporanPage({ kelasList, jadwalList, rekap, filters }: Props) {

    function setFilter(key: string, val: string) {
        const params: Record<string, string> = { ...filters } as any;
        params[key] = val;
        if (key === 'kelas_id') { delete params.jadwal_id; }
        router.get('/laporan', params, { preserveState: true });
    }

    function buildExportUrl(type: 'pdf' | 'excel') {
        const params = new URLSearchParams(filters as any).toString();
        return `/laporan/export/${type}?${params}`;
    }

    const totalHadir  = rekap.reduce((s, r) => s + r.hadir, 0);
    const totalAlpa   = rekap.reduce((s, r) => s + r.alpa, 0);
    const totalIzin   = rekap.reduce((s, r) => s + r.izin, 0);
    const totalSakit  = rekap.reduce((s, r) => s + r.sakit, 0);
    const totalPtm    = rekap[0]?.total_pertemuan ?? 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Laporan Kehadiran" />
            <div className="p-4 space-y-4">

                {/* Filter Bar */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Kelas</p>
                        <Select value={filters.kelas_id ?? ''} onValueChange={v => setFilter('kelas_id', v)}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Pilih Kelas..." />
                            </SelectTrigger>
                            <SelectContent>
                                {kelasList.map(k => (
                                    <SelectItem key={k.id} value={String(k.id)}>
                                        {k.nama}{k.prodi ? ` — ${k.prodi.nama}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Jadwal / Mata Kuliah</p>
                        <Select value={filters.jadwal_id ?? ''} onValueChange={v => setFilter('jadwal_id', v)} disabled={!filters.kelas_id}>
                            <SelectTrigger className="w-60">
                                <SelectValue placeholder="Pilih Jadwal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {jadwalList.map(j => (
                                    <SelectItem key={j.id} value={String(j.id)}>
                                        {j.mata_kuliah} ({j.hari} {j.jam_mulai.slice(0, 5)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Dari Tanggal</p>
                        <input
                            type="date"
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={filters.dari ?? ''}
                            onChange={e => setFilter('dari', e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Sampai Tanggal</p>
                        <input
                            type="date"
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={filters.sampai ?? ''}
                            onChange={e => setFilter('sampai', e.target.value)}
                        />
                    </div>

                    {rekap.length > 0 && (
                        <div className="flex gap-2 ml-auto">
                            <Button variant="outline" size="sm" asChild>
                                <a href={buildExportUrl('pdf')} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-4 w-4 mr-1.5" />
                                    Export PDF
                                </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <a href={buildExportUrl('excel')} target="_blank" rel="noopener noreferrer">
                                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                                    Export Excel
                                </a>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Summary */}
                {rekap.length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Hadir',  value: totalHadir,  cls: 'text-green-700 bg-green-50' },
                            { label: 'Alpa',   value: totalAlpa,   cls: 'text-red-700 bg-red-50' },
                            { label: 'Izin',   value: totalIzin,   cls: 'text-blue-700 bg-blue-50' },
                            { label: 'Sakit',  value: totalSakit,  cls: 'text-yellow-700 bg-yellow-50' },
                        ].map(c => (
                            <div key={c.label} className={`rounded-xl border p-3 text-center ${c.cls}`}>
                                <p className="text-2xl font-bold">{c.value}</p>
                                <p className="text-sm">{c.label} (total {totalPtm} pertemuan)</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabel Rekap */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>NIM</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead className="text-center">Hadir</TableHead>
                            <TableHead className="text-center">Alpa</TableHead>
                            <TableHead className="text-center">Izin</TableHead>
                            <TableHead className="text-center">Sakit</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">% Hadir</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rekap.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                                    {filters.jadwal_id
                                        ? 'Tidak ada data untuk jadwal ini.'
                                        : 'Pilih kelas dan jadwal untuk melihat rekap.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rekap.map(row => (
                                <TableRow key={row.mahasiswa_id}>
                                    <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                                    <TableCell className="font-medium">{row.nama}</TableCell>
                                    <TableCell className="text-center">{row.hadir}</TableCell>
                                    <TableCell className="text-center">{row.alpa}</TableCell>
                                    <TableCell className="text-center">{row.izin}</TableCell>
                                    <TableCell className="text-center">{row.sakit}</TableCell>
                                    <TableCell className="text-center text-muted-foreground">{row.total_pertemuan}</TableCell>
                                    <TableCell className={`text-center font-semibold ${pctClass(row.persen_hadir)}`}>
                                        {row.persen_hadir}%
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => router.visit(`/laporan/mahasiswa/${row.mahasiswa_id}`)}
                                        >
                                            Detail
                                        </Button>
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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';

interface Kelas  { id: number; nama: string; prodi?: { nama: string } }
interface Jadwal { id: number; mata_kuliah: string; hari: string; jam_mulai: string; jam_selesai: string }
interface Sesi   { id: number; tanggal: string; status: string }
interface RekapRow {
    mahasiswa_id: number;
    nim: string;
    nama: string;
    status: string;
    hadir_at: string | null;
    confidence: number | null;
    is_locked: boolean;
}

interface Props {
    kelasList:  Kelas[];
    jadwalList: Jadwal[];
    sesiList:   Sesi[];
    rekap:      RekapRow[];
    filters: { kelas_id?: string; jadwal_id?: string; sesi_id?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Rekap Absensi', href: '/absensi' }];

const statusConfig: Record<string, { label: string; className: string }> = {
    hadir:  { label: 'Hadir',  className: 'bg-green-100 text-green-800 border-green-200' },
    alpa:   { label: 'Alpa',   className: 'bg-red-100 text-red-700 border-red-200' },
    izin:   { label: 'Izin',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
    sakit:  { label: 'Sakit',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    belum:  { label: 'Belum',  className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function AbsensiPage({ kelasList, jadwalList, sesiList, rekap, filters }: Props) {

    function setFilter(key: string, val: string) {
        const params: Record<string, string> = { ...filters };
        params[key] = val;
        // Reset downstream filters
        if (key === 'kelas_id') { delete params.jadwal_id; delete params.sesi_id; }
        if (key === 'jadwal_id') { delete params.sesi_id; }
        router.get('/absensi', params, { preserveState: true });
    }

    const hadir  = rekap.filter(r => r.status === 'hadir').length;
    const alpa   = rekap.filter(r => r.status === 'alpa').length;
    const izin   = rekap.filter(r => r.status === 'izin').length;
    const sakit  = rekap.filter(r => r.status === 'sakit').length;
    const total  = rekap.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rekap Absensi" />
            <div className="p-4 space-y-4">

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-3">
                    <Select value={filters.kelas_id ?? ''} onValueChange={v => setFilter('kelas_id', v)}>
                        <SelectTrigger className="w-52">
                            <SelectValue placeholder="Pilih Kelas..." />
                        </SelectTrigger>
                        <SelectContent>
                            {kelasList.map(k => (
                                <SelectItem key={k.id} value={String(k.id)}>
                                    {k.nama} {k.prodi ? `— ${k.prodi.nama}` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.jadwal_id ?? ''} onValueChange={v => setFilter('jadwal_id', v)} disabled={!filters.kelas_id}>
                        <SelectTrigger className="w-60">
                            <SelectValue placeholder="Pilih Jadwal..." />
                        </SelectTrigger>
                        <SelectContent>
                            {jadwalList.map(j => (
                                <SelectItem key={j.id} value={String(j.id)}>
                                    {j.mata_kuliah} ({j.hari} {j.jam_mulai.slice(0,5)})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filters.sesi_id ?? ''} onValueChange={v => setFilter('sesi_id', v)} disabled={!filters.jadwal_id}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Pilih Tanggal..." />
                        </SelectTrigger>
                        <SelectContent>
                            {sesiList.map(s => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.tanggal} ({s.status})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Summary Cards */}
                {rekap.length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Hadir',  value: hadir,  cls: 'text-green-700 bg-green-50' },
                            { label: 'Alpa',   value: alpa,   cls: 'text-red-700 bg-red-50' },
                            { label: 'Izin',   value: izin,   cls: 'text-blue-700 bg-blue-50' },
                            { label: 'Sakit',  value: sakit,  cls: 'text-yellow-700 bg-yellow-50' },
                        ].map(c => (
                            <div key={c.label} className={`rounded-xl border p-3 text-center ${c.cls}`}>
                                <p className="text-2xl font-bold">{c.value}</p>
                                <p className="text-sm">{c.label} / {total}</p>
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
                            <TableHead>Status</TableHead>
                            <TableHead>Waktu Hadir</TableHead>
                            <TableHead>Confidence</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rekap.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                    {filters.sesi_id
                                        ? 'Tidak ada data untuk sesi ini.'
                                        : 'Pilih kelas → jadwal → tanggal sesi untuk melihat rekap.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rekap.map(row => {
                                const cfg = statusConfig[row.status] ?? statusConfig.belum;
                                return (
                                    <TableRow key={row.mahasiswa_id}>
                                        <TableCell className="font-mono text-sm">{row.nim}</TableCell>
                                        <TableCell className="font-medium">{row.nama}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cfg.className}>
                                                {cfg.label}
                                            </Badge>
                                            {row.is_locked && (
                                                <span className="ml-1 text-xs text-red-500">🔒</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {row.hadir_at ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {row.confidence != null ? `${row.confidence}%` : '—'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </AppLayout>
    );
}

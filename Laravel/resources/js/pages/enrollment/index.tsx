import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/confirm-dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Kelas, type Mahasiswa } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Eye, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface DosenEnrollment {
    id: number; nip: string; nama: string; email: string;
    status_enrollment: 'pending_upload' | 'pending_verifikasi' | 'aktif';
    enrollment_verifikasi_count: number;
}
type MahasiswaWithCount = Mahasiswa & { enrollment_verifikasi_count: number };

interface Props {
    mahasiswa: { data: MahasiswaWithCount[]; links: any[] };
    dosen_list: DosenEnrollment[];
    kelas: Kelas[];
    filters: { kelas_id?: string };
    flash?: { success?: string; error?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Enrollment', href: '/enrollment' }];

const mhsStatusCfg = {
    pending_upload:     { label: 'Belum Upload',  cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    aktif:              { label: 'Aktif',          cls: 'bg-green-50 text-green-700 border-green-200' },
} as const;

const dosenStatusCfg = {
    pending_upload:     { label: 'Belum Upload',  cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    aktif:              { label: 'Aktif',          cls: 'bg-green-50 text-green-700 border-green-200' },
} as const;

function VerifProgress({ count }: { count: number }) {
    return (
        <div className="flex items-center gap-1">
            {['D', 'S', 'J'].map((label, idx) => (
                <div key={label}
                    className={`w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center border ${
                        count > idx
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-muted border-border text-muted-foreground'
                    }`}>
                    {label}
                </div>
            ))}
        </div>
    );
}

export default function EnrollmentIndex({ mahasiswa, dosen_list, kelas, filters, flash }: Props) {
    const [searchDosen, setSearchDosen] = useState('');
    const [shown] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shown.has(flash.success)) { toast.success(flash.success); shown.add(flash.success); }
        if (flash?.error   && !shown.has(flash.error))   { toast.error(flash.error);   shown.add(flash.error); }
    }, [flash?.success, flash?.error]);

    const filteredDosen = useMemo(() =>
        dosen_list.filter(d =>
            d.nama.toLowerCase().includes(searchDosen.toLowerCase()) ||
            d.nip.toLowerCase().includes(searchDosen.toLowerCase())
        ),
        [dosen_list, searchDosen]
    );

    const mhsPending   = mahasiswa.data.filter(m => m.status_akun !== 'aktif').length;
    const dosenPending = dosen_list.filter(d => d.status_enrollment !== 'aktif').length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Enrollment" />
            <div className="p-6 space-y-5">

                <div>
                    <h1 className="text-xl font-semibold">Enrollment Wajah</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Kelola proses pendaftaran wajah untuk pengenalan otomatis
                    </p>
                </div>

                <Tabs defaultValue="mahasiswa">
                    <TabsList className="mb-1">
                        <TabsTrigger value="mahasiswa" className="gap-2">
                            Mahasiswa
                            {mhsPending > 0 && (
                                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">
                                    {mhsPending}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="dosen" className="gap-2">
                            Dosen
                            {dosenPending > 0 && (
                                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">
                                    {dosenPending}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab Mahasiswa ── */}
                    <TabsContent value="mahasiswa" className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Select value={filters.kelas_id ?? ''}
                                onValueChange={val => {
                                    const p = val && val !== 'all' ? { kelas_id: val } : {};
                                    router.get('/enrollment', p, { preserveState: true });
                                }}>
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Filter kelas..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Kelas</SelectItem>
                                    {kelas.map(k => (
                                        <SelectItem key={k.id} value={String(k.id)}>
                                            {k.nama}{k.prodi ? ` — ${k.prodi.nama}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>NIM</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Kelas</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Verifikasi Jarak</TableHead>
                                        <TableHead className="w-28">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mahasiswa.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                                                Belum ada data mahasiswa.
                                            </TableCell>
                                        </TableRow>
                                    ) : mahasiswa.data.map(mhs => {
                                        const cfg = mhsStatusCfg[mhs.status_akun as keyof typeof mhsStatusCfg] ?? mhsStatusCfg.pending_upload;
                                        return (
                                            <TableRow key={mhs.id}>
                                                <TableCell className="font-mono text-sm">{mhs.nim}</TableCell>
                                                <TableCell className="font-medium">{mhs.nama}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {mhs.kelas?.nama ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {mhs.status_akun === 'pending_upload'
                                                        ? <span className="text-xs text-muted-foreground">—</span>
                                                        : <VerifProgress count={mhs.enrollment_verifikasi_count} />
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        {mhs.status_akun !== 'pending_upload' && (
                                                            <Button size="sm" variant="outline"
                                                                onClick={() => router.get(`/enrollment/${mhs.id}/detail`)}>
                                                                <Eye className="size-3.5 mr-1" /> Detail
                                                            </Button>
                                                        )}
                                                        {(mhs.status_akun === 'pending_verifikasi' || mhs.status_akun === 'aktif') && (
                                                            <ConfirmDialog
                                                                title="Reset Enrollment?"
                                                                description={`Semua foto dan encoding wajah ${mhs.nama} akan dihapus. Mahasiswa harus mengulang enrollment dari awal.`}
                                                                confirmLabel="Ya, Reset"
                                                                onConfirm={() => router.delete(`/enrollment/${mhs.id}/reset`)}
                                                                trigger={
                                                                    <Button size="sm" variant="outline"
                                                                        className="hover:bg-red-50 hover:text-red-600">
                                                                        <RotateCcw className="size-3.5" />
                                                                    </Button>
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex gap-1">
                            {mahasiswa.links.map((link: any, i: number) => (
                                <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                        </div>
                    </TabsContent>

                    {/* ── Tab Dosen ── */}
                    <TabsContent value="dosen" className="space-y-4">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Cari nama atau NIP..."
                                value={searchDosen} onChange={e => setSearchDosen(e.target.value)} />
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>NIP</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Verifikasi Jarak</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDosen.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                                                Belum ada data dosen atau tidak ditemukan.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredDosen.map(d => {
                                        const cfg = dosenStatusCfg[d.status_enrollment as keyof typeof dosenStatusCfg] ?? dosenStatusCfg.pending_upload;
                                        return (
                                            <TableRow key={d.id}>
                                                <TableCell className="font-mono text-sm">{d.nip}</TableCell>
                                                <TableCell className="font-medium">{d.nama}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{d.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {d.status_enrollment === 'pending_upload'
                                                        ? <span className="text-xs text-muted-foreground">—</span>
                                                        : <VerifProgress count={d.enrollment_verifikasi_count} />
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

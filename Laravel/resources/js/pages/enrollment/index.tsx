import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Kelas, type Mahasiswa } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Eye, RotateCcw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

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

const mhsStatusConfig = {
    pending_upload:     { label: 'Belum Upload',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',      className: 'bg-blue-100 text-blue-800 border-blue-200' },
    aktif:              { label: 'Aktif',            className: 'bg-green-100 text-green-800 border-green-200' },
} as const;

const dosenStatusConfig = {
    pending_upload:     { label: 'Belum Upload',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',      className: 'bg-blue-100 text-blue-800 border-blue-200' },
    aktif:              { label: 'Aktif',            className: 'bg-green-100 text-green-800 border-green-200' },
} as const;

const JARAK = ['dekat', 'sedang', 'jauh'] as const;
const JARAK_LABEL = ['D', 'S', 'J'] as const;

export default function EnrollmentIndex({ mahasiswa, dosen_list, kelas, filters, flash }: Props) {
    const [searchDosen, setSearchDosen] = useState('');
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
        if (flash?.error && !shownMessages.has(flash.error)) {
            toast.error(flash.error);
            shownMessages.add(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const filteredDosen = dosen_list.filter(d =>
        d.nama.toLowerCase().includes(searchDosen.toLowerCase()) ||
        d.nip.toLowerCase().includes(searchDosen.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Enrollment" />
            <div className="p-4 space-y-4">
                <div>
                    <h1 className="text-lg font-semibold">Enrollment Wajah</h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola proses pendaftaran wajah mahasiswa dan dosen
                    </p>
                </div>

                <Tabs defaultValue="mahasiswa">
                    <TabsList>
                        <TabsTrigger value="mahasiswa">
                            Mahasiswa
                            <Badge variant="secondary" className="ml-2 text-xs">
                                {mahasiswa.data.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="dosen">
                            Dosen
                            <Badge variant="secondary" className="ml-2 text-xs">
                                {dosen_list.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab Mahasiswa ── */}
                    <TabsContent value="mahasiswa" className="space-y-3 mt-3">
                        <div className="flex items-center gap-3">
                            <Select value={filters.kelas_id ?? ''}
                                onValueChange={val => {
                                    const params = val && val !== 'all' ? { kelas_id: val } : {};
                                    router.get('/enrollment', params, { preserveState: true });
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
                                    <TableRow className="bg-muted/50">
                                        <TableHead>NIM</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Kelas</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Verifikasi</TableHead>
                                        <TableHead className="w-32">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mahasiswa.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                                Belum ada data mahasiswa.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        mahasiswa.data.map(mhs => {
                                            const cfg = mhsStatusConfig[mhs.status_akun as keyof typeof mhsStatusConfig]
                                                ?? mhsStatusConfig.pending_upload;
                                            return (
                                                <TableRow key={mhs.id}>
                                                    <TableCell className="font-mono text-sm">{mhs.nim}</TableCell>
                                                    <TableCell className="font-medium">{mhs.nama}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {mhs.kelas?.nama ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cfg.className}>
                                                            {cfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {mhs.status_akun === 'pending_upload' ? (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                {JARAK.map((j, idx) => (
                                                                    <div key={j}
                                                                        className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-medium ${
                                                                            mhs.enrollment_verifikasi_count > idx
                                                                                ? 'bg-green-500 border-green-500 text-white'
                                                                                : 'bg-muted border-border text-muted-foreground'
                                                                        }`}>
                                                                        {JARAK_LABEL[idx]}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1.5">
                                                            {mhs.status_akun !== 'pending_upload' && (
                                                                <Button size="sm" variant="outline"
                                                                    onClick={() => router.get(`/enrollment/${mhs.id}/detail`)}>
                                                                    <Eye className="size-3.5 mr-1" /> Detail
                                                                </Button>
                                                            )}
                                                            {(mhs.status_akun === 'pending_verifikasi' || mhs.status_akun === 'aktif') && (
                                                                <ConfirmDialog
                                                                    title="Reset Enrollment?"
                                                                    description="Semua foto dan encoding wajah mahasiswa ini akan dihapus. Mahasiswa harus mengulang proses enrollment dari awal."
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
                                        })
                                    )}
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
                    <TabsContent value="dosen" className="space-y-3 mt-3">
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input className="pl-8" placeholder="Cari dosen..."
                                value={searchDosen} onChange={e => setSearchDosen(e.target.value)} />
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>NIP</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Verifikasi</TableHead>
                                        <TableHead className="w-32">Keterangan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDosen.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                                Belum ada data dosen.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredDosen.map(d => {
                                            const cfg = dosenStatusConfig[d.status_enrollment as keyof typeof dosenStatusConfig]
                                                ?? dosenStatusConfig.pending_upload;
                                            return (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-mono text-sm">{d.nip}</TableCell>
                                                    <TableCell className="font-medium">{d.nama}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cfg.className}>
                                                            {cfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {d.status_enrollment === 'pending_upload' ? (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                {JARAK.map((j, idx) => (
                                                                    <div key={j}
                                                                        className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-medium ${
                                                                            d.enrollment_verifikasi_count > idx
                                                                                ? 'bg-green-500 border-green-500 text-white'
                                                                                : 'bg-muted border-border text-muted-foreground'
                                                                        }`}>
                                                                        {JARAK_LABEL[idx]}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground">
                                                            {d.status_enrollment === 'aktif' ? 'Aktif' : 'Proses mandiri'}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

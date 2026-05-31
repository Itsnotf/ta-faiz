import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Kelas, type Mahasiswa } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type MahasiswaWithCount = Mahasiswa & { enrollment_verifikasi_count: number };

interface Props {
    mahasiswa: { data: MahasiswaWithCount[]; links: any[] };
    kelas: Kelas[];
    filters: { kelas_id?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Enrollment', href: '/enrollment' }];

const statusConfig = {
    pending_upload:     { label: 'Belum Upload',    className: 'bg-gray-100 text-gray-700 border-gray-200' },
    pending_verifikasi: { label: 'Siap Verifikasi', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    siap_approve:       { label: 'Siap Diapprove',  className: 'bg-orange-100 text-orange-700 border-orange-200' },
    aktif:              { label: 'Aktif',            className: 'bg-green-100 text-green-800 border-green-200' },
} as const;

export default function EnrollmentIndex({ mahasiswa, kelas, filters }: Props) {
    const [uploadTarget, setUploadTarget] = useState<Mahasiswa | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadForm = useForm<{ foto: File[] }>({ foto: [] });

    function handleKelasFilter(val: string) {
        const params = val && val !== 'all' ? { kelas_id: val } : {};
        router.get('/enrollment', params, { preserveState: true });
    }

    function handleReset(mahasiswaId: number) {
        if (confirm('Reset enrollment mahasiswa ini? Semua foto dan encoding akan dihapus.')) {
            router.delete(`/enrollment/${mahasiswaId}/reset`);
        }
    }

    function handleUploadSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!uploadTarget) return;
        if (uploadForm.data.foto.length !== 5) {
            toast.error('Pilih tepat 5 foto.');
            return;
        }
        uploadForm.post(`/enrollment/${uploadTarget.id}/upload-foto`, {
            forceFormData: true,
            onSuccess: () => {
                setUploadTarget(null);
                uploadForm.reset();
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Enrollment" />
            <div className="p-4 space-y-4">

                {/* Filter Kelas */}
                <div className="flex items-center gap-3">
                    <Select value={filters.kelas_id ?? ''} onValueChange={handleKelasFilter}>
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder="Filter by kelas..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kelas</SelectItem>
                            {kelas.map(k => (
                                <SelectItem key={k.id} value={String(k.id)}>
                                    {k.nama} {k.prodi ? `— ${k.prodi.nama}` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>NIM</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Kelas</TableHead>
                            <TableHead>Status Enrollment</TableHead>
                            <TableHead className="w-52">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mahasiswa.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    Belum ada data mahasiswa.
                                </TableCell>
                            </TableRow>
                        ) : (
                            mahasiswa.data.map(mhs => {
                                const siapApprove = mhs.status_akun === 'pending_verifikasi' && mhs.enrollment_verifikasi_count >= 3;
                                const badgeKey = siapApprove ? 'siap_approve' : mhs.status_akun;
                                const cfg = statusConfig[badgeKey as keyof typeof statusConfig] ?? statusConfig.pending_upload;
                                return (
                                    <TableRow
                                        key={mhs.id}
                                        className={siapApprove ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}
                                    >
                                        <TableCell className="font-mono text-sm">{mhs.nim}</TableCell>
                                        <TableCell className="font-medium">{mhs.nama}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {mhs.kelas?.nama ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cfg.className}>
                                                {cfg.label}
                                            </Badge>
                                            {mhs.status_akun === 'pending_verifikasi' && (
                                                <span className="ml-1.5 text-xs text-muted-foreground">
                                                    {mhs.enrollment_verifikasi_count}/3 jarak
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="flex gap-1.5 items-center">
                                            {mhs.status_akun === 'pending_upload' && (
                                                <Button size="sm" variant="outline"
                                                    className="hover:bg-green-50 hover:text-green-700"
                                                    onClick={() => { setUploadTarget(mhs); uploadForm.reset(); }}>
                                                    <Upload className="size-3.5 mr-1" /> Upload Foto
                                                </Button>
                                            )}
                                            {mhs.status_akun === 'pending_verifikasi' && !siapApprove && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                    Menunggu verifikasi mahasiswa
                                                </Badge>
                                            )}
                                            {siapApprove && (
                                                <Button size="sm"
                                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                                    onClick={() => router.patch(`/enrollment/${mhs.id}/approve`)}>
                                                    <CheckCircle className="size-3.5 mr-1" /> Approve
                                                </Button>
                                            )}
                                            {(mhs.status_akun === 'pending_verifikasi' || mhs.status_akun === 'aktif') && (
                                                <Button size="sm" variant="outline"
                                                    className="hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => handleReset(mhs.id)}>
                                                    <RotateCcw className="size-3.5 mr-1" /> Reset
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex gap-1">
                    {mahasiswa.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm"
                            disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>

            {/* Dialog Upload Foto (Admin) */}
            <Dialog open={!!uploadTarget} onOpenChange={open => { if (!open) setUploadTarget(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Foto — {uploadTarget?.nama}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUploadSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <p className="text-sm text-muted-foreground">
                                Pilih tepat <strong>5 foto</strong> wajah mahasiswa (jpg/png, maks 2MB/foto).
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpg,image/jpeg,image/png"
                                multiple
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                onChange={e => {
                                    const files = Array.from(e.target.files ?? []);
                                    uploadForm.setData('foto', files);
                                }}
                            />
                            {uploadForm.data.foto.length > 0 && uploadForm.data.foto.length !== 5 && (
                                <p className="text-xs text-red-500">
                                    {uploadForm.data.foto.length} foto dipilih — harus tepat 5.
                                </p>
                            )}
                            {uploadForm.data.foto.length === 5 && (
                                <p className="text-xs text-green-600">5 foto siap diupload.</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setUploadTarget(null)}>Batal</Button>
                            <Button type="submit" disabled={uploadForm.processing || uploadForm.data.foto.length !== 5}>
                                {uploadForm.processing ? 'Mengupload...' : 'Upload'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

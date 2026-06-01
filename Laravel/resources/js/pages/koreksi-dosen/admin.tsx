import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle, Eye, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface KoreksiItem {
    id: number;
    catatan?: string;
    status: string;
    dosen?: { nama: string; nip: string; jurusan?: { nama: string } };
    absensi_dosen?: {
        sesi?: { tanggal: string; jadwal?: { mata_kuliah: string } };
    };
    created_at: string;
}

interface PaginatedKoreksi {
    data: KoreksiItem[];
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    koreksi: PaginatedKoreksi;
    flash?: { success?: string; error?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Koreksi Absensi Dosen', href: '/koreksi-dosen/admin' }];

export default function KoreksiDosenAdmin({ koreksi, flash }: Props) {
    const [approveTarget, setApproveTarget] = useState<KoreksiItem | null>(null);
    const [rejectTarget, setRejectTarget] = useState<KoreksiItem | null>(null);
    const approveForm = useForm({ catatan_admin: '' });
    const rejectForm = useForm({ catatan_admin: '' });
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

    function handleApprove(e: React.FormEvent) {
        e.preventDefault();
        if (!approveTarget) return;
        approveForm.patch(`/koreksi-dosen/admin/${approveTarget.id}/approve`, {
            onSuccess: () => { setApproveTarget(null); approveForm.reset(); },
        });
    }

    function handleReject(e: React.FormEvent) {
        e.preventDefault();
        if (!rejectTarget) return;
        rejectForm.patch(`/koreksi-dosen/admin/${rejectTarget.id}/reject`, {
            onSuccess: () => { setRejectTarget(null); rejectForm.reset(); },
            onError: (errors) => {
                const msg = Object.values(errors)[0];
                if (msg) toast.error(msg as string);
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Koreksi Absensi Dosen" />
            <div className="p-4 space-y-4">
                <div>
                    <h1 className="text-xl font-semibold">Pengajuan Koreksi Absensi Dosen</h1>
                    <p className="text-sm text-muted-foreground">Tinjau dan setujui/tolak pengajuan koreksi kehadiran dari dosen.</p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Dosen</TableHead>
                            <TableHead>Jurusan</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Mata Kuliah</TableHead>
                            <TableHead>Catatan Dosen</TableHead>
                            <TableHead className="w-52">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {koreksi.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                    Tidak ada pengajuan koreksi pending.
                                </TableCell>
                            </TableRow>
                        ) : koreksi.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className="font-medium text-sm">{item.dosen?.nama ?? '-'}</div>
                                    <div className="text-xs text-muted-foreground">{item.dosen?.nip ?? '-'}</div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {item.dosen?.jurusan?.nama ?? '-'}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {item.absensi_dosen?.sesi?.tanggal ?? '-'}
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                    {item.absensi_dosen?.sesi?.jadwal?.mata_kuliah ?? '-'}
                                </TableCell>
                                <TableCell className="text-sm max-w-xs truncate text-muted-foreground">
                                    {item.catatan ?? '-'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1.5 items-center">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs"
                                            onClick={() => window.open(`/koreksi-dosen/admin/${item.id}/bukti`, '_blank')}
                                        >
                                            <Eye className="size-3 mr-1" /> Bukti
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                            onClick={() => setApproveTarget(item)}
                                        >
                                            <CheckCircle className="size-3 mr-1" /> Setujui
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="hover:bg-red-50 hover:text-red-600 text-xs"
                                            onClick={() => setRejectTarget(item)}
                                        >
                                            <XCircle className="size-3 mr-1" /> Tolak
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex gap-1">
                    {koreksi.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm"
                            disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>

            {/* Dialog Setujui */}
            <Dialog open={!!approveTarget} onOpenChange={open => { if (!open) setApproveTarget(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Setujui Koreksi</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleApprove} className="space-y-4">
                        <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            <p><strong>Dosen:</strong> {approveTarget?.dosen?.nama}</p>
                            <p><strong>Tanggal:</strong> {approveTarget?.absensi_dosen?.sesi?.tanggal}</p>
                            <p><strong>Matkul:</strong> {approveTarget?.absensi_dosen?.sesi?.jadwal?.mata_kuliah}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Menyetujui akan mengubah status absensi dosen ini dari <strong>Alpa</strong> menjadi <strong>Hadir</strong>.
                        </p>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Catatan Admin (opsional)</label>
                            <Textarea
                                placeholder="Catatan untuk dosen..."
                                value={approveForm.data.catatan_admin}
                                onChange={e => approveForm.setData('catatan_admin', e.target.value)}
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setApproveTarget(null)}>Batal</Button>
                            <Button type="submit" disabled={approveForm.processing}
                                className="bg-green-600 hover:bg-green-700 text-white">
                                {approveForm.processing ? 'Memproses...' : 'Setujui'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Tolak */}
            <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) setRejectTarget(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tolak Koreksi</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleReject} className="space-y-4">
                        <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            <p><strong>Dosen:</strong> {rejectTarget?.dosen?.nama}</p>
                            <p><strong>Tanggal:</strong> {rejectTarget?.absensi_dosen?.sesi?.tanggal}</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                Alasan Penolakan <span className="text-red-500">*</span>
                            </label>
                            <Textarea
                                placeholder="Masukkan alasan penolakan..."
                                value={rejectForm.data.catatan_admin}
                                onChange={e => rejectForm.setData('catatan_admin', e.target.value)}
                                rows={3}
                                required
                            />
                            {rejectForm.errors.catatan_admin && (
                                <p className="text-xs text-red-500">{rejectForm.errors.catatan_admin}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
                            <Button type="submit" disabled={rejectForm.processing}
                                variant="destructive">
                                {rejectForm.processing ? 'Memproses...' : 'Tolak'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

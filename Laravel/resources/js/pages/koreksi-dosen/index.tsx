import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FileUp, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Koreksi {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    catatan_admin?: string;
}

interface AbsensiItem {
    id: number;
    status: 'hadir' | 'alpa';
    is_locked: boolean;
    created_at: string;
    sesi?: {
        tanggal: string;
        jadwal?: { mata_kuliah: string; kelas?: { nama: string } };
    };
    koreksi: Koreksi[];
}

interface PaginatedAbsensi {
    data: AbsensiItem[];
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    absensi: PaginatedAbsensi;
    flash?: { success?: string; error?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Koreksi Absensi', href: '/koreksi-dosen' }];

function statusBadge(status: string, isLocked: boolean) {
    if (status === 'hadir') return <Badge className="bg-green-100 text-green-800 border-green-200">Hadir</Badge>;
    if (isLocked) return (
        <span className="inline-flex items-center gap-1">
            <Badge className="bg-red-100 text-red-800 border-red-200">Alpa</Badge>
            <Lock className="size-3 text-red-500" />
        </span>
    );
    return <Badge className="bg-red-100 text-red-800 border-red-200">Alpa</Badge>;
}

function koreksiStatusBadge(koreksi: Koreksi[]) {
    const latest = koreksi[0];
    if (!latest) return null;
    if (latest.status === 'pending') return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Koreksi Pending</Badge>;
    if (latest.status === 'approved') return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Disetujui</Badge>;
    if (latest.status === 'rejected') return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Ditolak</Badge>;
    return null;
}

export default function KoreksiDosenIndex({ absensi, flash }: Props) {
    const [target, setTarget] = useState<AbsensiItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const form = useForm<{ absensi_dosen_id: number | null; bukti: File | null; catatan: string }>({
        absensi_dosen_id: null,
        bukti: null,
        catatan: '',
    });
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

    function openDialog(item: AbsensiItem) {
        setTarget(item);
        form.reset();
        form.setData('absensi_dosen_id', item.id);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.data.bukti) { toast.error('Pilih file bukti.'); return; }
        form.post('/koreksi-dosen', {
            forceFormData: true,
            onSuccess: () => { setTarget(null); form.reset(); },
            onError: (errors) => {
                const msg = Object.values(errors)[0];
                if (msg) toast.error(msg as string);
            },
        });
    }

    function canKoreksi(item: AbsensiItem): boolean {
        if (item.status !== 'alpa' || item.is_locked) return false;
        const active = item.koreksi.find(k => k.status === 'pending' || k.status === 'approved');
        return !active;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Koreksi Absensi" />
            <div className="p-4 space-y-4">
                <div>
                    <h1 className="text-xl font-semibold">Koreksi Absensi Saya</h1>
                    <p className="text-sm text-muted-foreground">
                        Ajukan koreksi untuk absensi alpa yang belum terkunci (dalam 3 hari).
                    </p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Mata Kuliah</TableHead>
                            <TableHead>Kelas</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Koreksi</TableHead>
                            <TableHead className="w-36">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {absensi.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                    Belum ada data absensi.
                                </TableCell>
                            </TableRow>
                        ) : absensi.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="text-sm">
                                    {item.sesi?.tanggal ?? '-'}
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                    {item.sesi?.jadwal?.mata_kuliah ?? '-'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {item.sesi?.jadwal?.kelas?.nama ?? '-'}
                                </TableCell>
                                <TableCell>{statusBadge(item.status, item.is_locked)}</TableCell>
                                <TableCell>{koreksiStatusBadge(item.koreksi)}</TableCell>
                                <TableCell>
                                    {canKoreksi(item) ? (
                                        <Button size="sm" variant="outline"
                                            onClick={() => openDialog(item)}>
                                            <FileUp className="size-3.5 mr-1" /> Ajukan Koreksi
                                        </Button>
                                    ) : item.is_locked && item.status === 'alpa' ? (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Lock className="size-3" /> Terkunci
                                        </span>
                                    ) : null}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex gap-1">
                    {absensi.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm"
                            disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>

            {/* Dialog Ajukan Koreksi */}
            <Dialog open={!!target} onOpenChange={open => { if (!open) setTarget(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajukan Koreksi Absensi</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            <p><strong>Tanggal:</strong> {target?.sesi?.tanggal ?? '-'}</p>
                            <p><strong>Mata Kuliah:</strong> {target?.sesi?.jadwal?.mata_kuliah ?? '-'}</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                Bukti Mengajar <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-muted-foreground">
                                Upload bukti (foto/dokumen) bahwa Anda hadir mengajar. Format: JPG, PNG, PDF. Maks 5MB.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                onChange={e => {
                                    const file = e.target.files?.[0] ?? null;
                                    form.setData('bukti', file as any);
                                }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Catatan (opsional)</label>
                            <Textarea
                                placeholder="Keterangan tambahan..."
                                value={form.data.catatan}
                                onChange={e => form.setData('catatan', e.target.value)}
                                maxLength={500}
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setTarget(null)}>Batal</Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Mengirim...' : 'Kirim Pengajuan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

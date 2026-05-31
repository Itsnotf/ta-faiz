import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, Clock, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface KeteranganRecord {
    id: number;
    jenis: 'izin' | 'sakit';
    status_keterangan: 'pending' | 'approved' | 'rejected';
}

interface AlpaItem {
    id: number;
    is_locked: boolean;
    created_at: string;
    sesi: {
        tanggal: string;
        jadwal: { mata_kuliah: string; jam_mulai: string; jam_selesai: string };
    };
    keterangan: KeteranganRecord | null;
}

interface Props {
    alpas: AlpaItem[];
    flash?: { success?: string; error?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Keterangan', href: '/keterangan' }];

function useCountdown() {
    const [label, setLabel] = useState('');
    useEffect(() => {
        const update = () => {
            const deadline = new Date();
            deadline.setHours(21, 0, 0, 0);
            const diff = deadline.getTime() - Date.now();
            if (diff <= 0) { setLabel('Waktu habis'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setLabel(`${h}j ${m}m lagi`);
        };
        update();
        const id = setInterval(update, 60_000);
        return () => clearInterval(id);
    }, []);
    return label;
}

export default function KeteranganMahasiswaPage({ alpas, flash }: Props) {
    const countdown = useCountdown();
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedId, setSelectedId] = useState<number>(0);
    const [shownMessages] = useState(new Set<string>());

    const form = useForm({
        absensi_id: 0,
        jenis: 'izin',
        keterangan: '',
        file_bukti: null as File | null,
    });

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

    function openAjukan(id: number) {
        setSelectedId(id);
        form.reset();
        form.setData('absensi_id', id);
        setOpenDialog(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/keterangan', {
            forceFormData: true,
            onSuccess: () => {
                setOpenDialog(false);
                form.reset();
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Keterangan Absensi" />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Keterangan Absensi</h1>
                        <p className="text-sm text-muted-foreground">Ajukan keterangan untuk ketidakhadiran hari ini sebelum pukul 21:00.</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{countdown}</span>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mata Kuliah</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Jam</TableHead>
                            <TableHead>Status Keterangan</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {alpas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                    Tidak ada ketidakhadiran yang perlu keterangan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            alpas.map((row) => {
                                const ket = row.keterangan;
                                return (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">
                                            {row.sesi?.jadwal?.mata_kuliah ?? '—'}
                                        </TableCell>
                                        <TableCell>{row.sesi?.tanggal ?? '—'}</TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {row.sesi?.jadwal?.jam_mulai?.slice(0, 5)} – {row.sesi?.jadwal?.jam_selesai?.slice(0, 5)}
                                        </TableCell>
                                        <TableCell>
                                            {ket?.status_keterangan === 'approved' && (
                                                <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                                                    Disetujui ({ket.jenis})
                                                </Badge>
                                            )}
                                            {ket?.status_keterangan === 'pending' && (
                                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200" variant="outline">
                                                    Menunggu review
                                                </Badge>
                                            )}
                                            {ket?.status_keterangan === 'rejected' && (
                                                <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
                                                    Ditolak
                                                </Badge>
                                            )}
                                            {!ket && !row.is_locked && (
                                                <Badge className="bg-gray-100 text-gray-500 border-gray-200" variant="outline">
                                                    Belum diajukan
                                                </Badge>
                                            )}
                                            {!ket && row.is_locked && (
                                                <div className="flex items-center gap-1.5">
                                                    <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        Alpa dikunci permanen
                                                    </Badge>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!ket && !row.is_locked && (
                                                <Button size="sm" onClick={() => openAjukan(row.id)}>
                                                    Ajukan
                                                </Button>
                                            )}
                                            {ket?.status_keterangan === 'pending' && (
                                                <Button size="sm" variant="outline" disabled>
                                                    Menunggu review
                                                </Button>
                                            )}
                                            {row.is_locked && (
                                                <Button size="sm" variant="destructive" disabled>
                                                    Tidak bisa diajukan
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog Pengajuan */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajukan Keterangan</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="hidden" name="absensi_id" value={selectedId} />

                        <div className="space-y-1.5">
                            <Label>Jenis Keterangan <span className="text-red-500">*</span></Label>
                            <Select value={form.data.jenis} onValueChange={(v) => form.setData('jenis', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="izin">Izin</SelectItem>
                                    <SelectItem value="sakit">Sakit</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.errors.jenis && <p className="text-xs text-red-500">{form.errors.jenis}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Keterangan <span className="text-red-500">*</span></Label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Jelaskan alasan ketidakhadiran..."
                                value={form.data.keterangan}
                                onChange={(e) => form.setData('keterangan', e.target.value)}
                                maxLength={1000}
                            />
                            {form.errors.keterangan && <p className="text-xs text-red-500">{form.errors.keterangan}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                Bukti <span className="text-red-500">*</span>
                                <span className="text-xs text-muted-foreground font-normal">(JPG/PNG/PDF, maks 5MB)</span>
                            </Label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                onChange={(e) => form.setData('file_bukti', e.target.files?.[0] ?? null)}
                            />
                            {form.errors.file_bukti && <p className="text-xs text-red-500">{form.errors.file_bukti}</p>}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Mengirim...' : 'Kirim Keterangan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

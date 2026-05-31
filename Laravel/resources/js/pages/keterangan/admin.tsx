import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle, ExternalLink, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface KeteranganItem {
    id: number;
    jenis: 'izin' | 'sakit';
    keterangan: string;
    diajukan_oleh: 'mahasiswa' | 'admin';
    status_keterangan: 'pending' | 'approved' | 'rejected';
    approved_at: string | null;
    created_at: string;
    mahasiswa: {
        id: number;
        nim: string;
        nama: string;
        kelas?: { nama: string; prodi?: { nama: string } };
    };
    absensi_mahasiswa: {
        id: number;
        sesi: { tanggal: string; jadwal: { mata_kuliah: string } };
    };
    disetujui_oleh?: { name: string } | null;
}

interface Props {
    keteranganList: { data: KeteranganItem[]; links: any[] };
    filters: { status?: string };
    flash?: { success?: string; error?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Keterangan Masuk', href: '/keterangan/admin' }];

const statusConfig = {
    pending:  { label: 'Pending',   className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    approved: { label: 'Disetujui', className: 'bg-green-100 text-green-800 border-green-200' },
    rejected: { label: 'Ditolak',   className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function KeteranganAdminPage({ keteranganList, filters, flash }: Props) {
    const [shownMessages] = useState(new Set<string>());
    const approveForm = useForm({ _method: 'PATCH' });
    const rejectForm  = useForm({ _method: 'PATCH' });

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

    function handleApprove(id: number) {
        approveForm.post(`/keterangan/${id}/approve`, { onSuccess: () => {} });
    }

    function handleReject(id: number) {
        rejectForm.post(`/keterangan/${id}/reject`, { onSuccess: () => {} });
    }

    function setFilter(status: string) {
        router.get('/keterangan/admin', { status }, { preserveState: true });
    }

    const filterOptions = [
        { value: 'semua',    label: 'Semua' },
        { value: 'pending',  label: 'Pending' },
        { value: 'approved', label: 'Disetujui' },
        { value: 'rejected', label: 'Ditolak' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Keterangan Masuk" />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Keterangan Masuk</h1>
                    <Select value={filters.status ?? 'semua'} onValueChange={setFilter}>
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {filterOptions.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mahasiswa</TableHead>
                            <TableHead>Mata Kuliah</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Sumber</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {keteranganList.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                                    Tidak ada keterangan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            keteranganList.data.map((row) => {
                                const cfg = statusConfig[row.status_keterangan];
                                return (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <p className="font-medium">{row.mahasiswa.nama}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{row.mahasiswa.nim}</p>
                                        </TableCell>
                                        <TableCell>{row.absensi_mahasiswa?.sesi?.jadwal?.mata_kuliah ?? '—'}</TableCell>
                                        <TableCell>{row.absensi_mahasiswa?.sesi?.tanggal ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={row.jenis === 'sakit'
                                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                : 'bg-blue-50 text-blue-700 border-blue-200'}>
                                                {row.jenis === 'sakit' ? 'Sakit' : 'Izin'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {row.diajukan_oleh === 'mahasiswa' ? (
                                                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                                                    Diajukan mahasiswa
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    Diinput admin
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cfg.className}>
                                                {cfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <a href={`/keterangan/${row.id}/bukti`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                        Bukti
                                                    </a>
                                                </Button>

                                                {row.status_keterangan === 'pending' && (
                                                    <>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                                    Setujui
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Setujui Keterangan?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Status absensi <strong>{row.mahasiswa.nama}</strong> akan berubah dari <em>Alpa</em> menjadi <em>{row.jenis}</em>. Tindakan ini tidak dapat dibatalkan.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-green-600 hover:bg-green-700"
                                                                        onClick={() => handleApprove(row.id)}
                                                                    >
                                                                        Ya, Setujui
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button size="sm" variant="destructive">
                                                                    <XCircle className="w-3.5 h-3.5 mr-1" />
                                                                    Tolak
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Tolak Keterangan?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Keterangan <strong>{row.mahasiswa.nama}</strong> akan ditolak. Status absensi tetap Alpa.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                        onClick={() => handleReject(row.id)}
                                                                    >
                                                                        Ya, Tolak
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </>
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
        </AppLayout>
    );
}

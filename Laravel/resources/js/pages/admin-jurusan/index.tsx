import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Jurusan } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AdminJurusanRecord {
    id: number;
    nama: string;
    email: string;
    no_hp: string | null;
    jurusan_id: number;
    jurusan?: { id: number; nama: string };
}

interface Props {
    admin_list: { data: AdminJurusanRecord[]; links: any[] };
    jurusan: Jurusan[];
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Admin Jurusan', href: '/admin-jurusan' }];

const emptyForm = { nama: '', email: '', no_hp: '', jurusan_id: '' };

export default function AdminJurusanPage({ admin_list, jurusan, flash }: Props) {
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<AdminJurusanRecord | null>(null);
    const [shown] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shown.has(flash.success)) {
            toast.success(flash.success);
            shown.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ ...emptyForm, _method: 'PUT' });

    function openEditDialog(item: AdminJurusanRecord) {
        setEditTarget(item);
        editForm.setData({
            nama: item.nama,
            email: item.email,
            no_hp: item.no_hp ?? '',
            jurusan_id: String(item.jurusan_id),
            _method: 'PUT',
        });
        setOpenEdit(true);
    }

    function FormFields({ form }: { form: any }) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Nama Lengkap</Label>
                        <Input value={form.data.nama}
                            onChange={e => form.setData('nama', e.target.value)} />
                        {form.errors.nama && <p className="text-xs text-red-500">{form.errors.nama}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Jurusan</Label>
                        <Select value={form.data.jurusan_id}
                            onValueChange={v => form.setData('jurusan_id', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih jurusan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {jurusan.map(j => (
                                    <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.errors.jurusan_id && <p className="text-xs text-red-500">{form.errors.jurusan_id}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Email (login)</Label>
                        <Input type="email" value={form.data.email}
                            onChange={e => form.setData('email', e.target.value)} />
                        {form.errors.email && <p className="text-xs text-red-500">{form.errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>No. HP</Label>
                        <Input value={form.data.no_hp}
                            onChange={e => form.setData('no_hp', e.target.value)} />
                        {form.errors.no_hp && <p className="text-xs text-red-500">{form.errors.no_hp}</p>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Jurusan" />
            <div className="p-6 space-y-5">

                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Admin Jurusan</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Kelola akun admin per jurusan — dibuat, akun login otomatis terbuat
                        </p>
                    </div>
                    <Button onClick={() => { createForm.reset(); setOpenCreate(true); }}>
                        <PlusCircle className="size-4 mr-2" /> Tambah Admin Jurusan
                    </Button>
                </div>

                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>Nama</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>No. HP</TableHead>
                                <TableHead>Jurusan</TableHead>
                                <TableHead className="w-24">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {admin_list.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                                        Belum ada admin jurusan.
                                    </TableCell>
                                </TableRow>
                            ) : admin_list.data.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nama}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.email}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {item.no_hp ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {item.jurusan?.nama ?? '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline"
                                                onClick={() => openEditDialog(item)}>
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <ConfirmDialog
                                                title="Hapus Admin Jurusan?"
                                                description={`Akun ${item.nama} dan akses loginnya akan dihapus permanen.`}
                                                confirmLabel="Ya, Hapus"
                                                onConfirm={() => router.delete(`/admin-jurusan/${item.id}`)}
                                                trigger={
                                                    <Button size="sm" variant="outline"
                                                        className="hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex gap-1">
                    {admin_list.links.map((link: any, i: number) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm"
                            disabled={!link.url}
                            onClick={() => link.url && router.get(link.url)}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>

                {/* Dialog Create */}
                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tambah Admin Jurusan</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={e => {
                            e.preventDefault();
                            createForm.post('/admin-jurusan', {
                                onSuccess: () => { setOpenCreate(false); createForm.reset(); }
                            });
                        }} className="space-y-4">
                            <FormFields form={createForm} />
                            <p className="text-xs text-muted-foreground">
                                Password default: <code className="bg-muted px-1 rounded">Password@123</code>
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={createForm.processing}>
                                    Simpan
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog Edit */}
                <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Admin Jurusan</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={e => {
                            e.preventDefault();
                            if (!editTarget) return;
                            editForm.post(`/admin-jurusan/${editTarget.id}`, {
                                onSuccess: () => setOpenEdit(false)
                            });
                        }} className="space-y-4">
                            <FormFields form={editForm} />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Simpan
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import hasAnyPermission from '@/lib/utils';
import { type BreadcrumbItem, type Jurusan, type Prodi } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    prodi: { data: Prodi[]; links: any[] };
    jurusan: Jurusan[];
    filters: { search?: string };
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Prodi', href: '/prodi' }];

export default function ProdiPage({ prodi, jurusan, filters, flash }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<Prodi | null>(null);
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ jurusan_id: '', nama: '', kode: '' });
    const editForm = useForm({ jurusan_id: '', nama: '', kode: '', _method: 'PUT' });

    function openEditDialog(item: Prodi) {
        setEditTarget(item);
        editForm.setData({ jurusan_id: String(item.jurusan_id), nama: item.nama, kode: item.kode, _method: 'PUT' });
        setOpenEdit(true);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createForm.post('/prodi', { onSuccess: () => { setOpenCreate(false); createForm.reset(); } });
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;
        editForm.post(`/prodi/${editTarget.id}`, { onSuccess: () => setOpenEdit(false) });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Prodi" />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <form onSubmit={e => { e.preventDefault(); router.get('/prodi', { search }, { preserveState: true }); }} className="flex gap-2 w-full max-w-xs">
                        <Input placeholder="Cari prodi..." value={search} onChange={e => setSearch(e.target.value)} />
                        <Button variant="outline" type="submit">Cari</Button>
                    </form>
                    {hasAnyPermission(['prodi create']) && (
                        <Button onClick={() => setOpenCreate(true)}><PlusCircle className="mr-2 size-4" /> Tambah</Button>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Kode</TableHead>
                            <TableHead>Jurusan</TableHead>
                            <TableHead className="w-28">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {prodi.data.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Belum ada data prodi.</TableCell></TableRow>
                        ) : prodi.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.nama}</TableCell>
                                <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.kode}</code></TableCell>
                                <TableCell className="text-muted-foreground text-sm">{item.jurusan?.nama ?? '-'}</TableCell>
                                <TableCell className="flex gap-1">
                                    {hasAnyPermission(['prodi edit']) && (
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}><Pencil className="size-3.5" /></Button>
                                    )}
                                    {hasAnyPermission(['prodi delete']) && (
                                        <Button variant="outline" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => { if (confirm('Hapus prodi ini?')) router.delete(`/prodi/${item.id}`); }}><Trash2 className="size-3.5" /></Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex gap-1">
                    {prodi.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm" disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            </div>

            {/* Dialog Create */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Prodi</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Jurusan <span className="text-red-500">*</span></Label>
                            <Select value={createForm.data.jurusan_id} onValueChange={v => createForm.setData('jurusan_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Pilih jurusan..." /></SelectTrigger>
                                <SelectContent>{jurusan.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>)}</SelectContent>
                            </Select>
                            {createForm.errors.jurusan_id && <p className="text-xs text-red-500">{createForm.errors.jurusan_id}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Nama <span className="text-red-500">*</span></Label>
                            <Input value={createForm.data.nama} onChange={e => createForm.setData('nama', e.target.value)} />
                            {createForm.errors.nama && <p className="text-xs text-red-500">{createForm.errors.nama}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Kode <span className="text-red-500">*</span></Label>
                            <Input value={createForm.data.kode} onChange={e => createForm.setData('kode', e.target.value)} placeholder="Contoh: D4TI" />
                            {createForm.errors.kode && <p className="text-xs text-red-500">{createForm.errors.kode}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
                            <Button type="submit" disabled={createForm.processing}>Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Edit */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Prodi</DialogTitle></DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Jurusan <span className="text-red-500">*</span></Label>
                            <Select value={editForm.data.jurusan_id} onValueChange={v => editForm.setData('jurusan_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Pilih jurusan..." /></SelectTrigger>
                                <SelectContent>{jurusan.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>)}</SelectContent>
                            </Select>
                            {editForm.errors.jurusan_id && <p className="text-xs text-red-500">{editForm.errors.jurusan_id}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Nama <span className="text-red-500">*</span></Label>
                            <Input value={editForm.data.nama} onChange={e => editForm.setData('nama', e.target.value)} />
                            {editForm.errors.nama && <p className="text-xs text-red-500">{editForm.errors.nama}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Kode <span className="text-red-500">*</span></Label>
                            <Input value={editForm.data.kode} onChange={e => editForm.setData('kode', e.target.value)} />
                            {editForm.errors.kode && <p className="text-xs text-red-500">{editForm.errors.kode}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>Batal</Button>
                            <Button type="submit" disabled={editForm.processing}>Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

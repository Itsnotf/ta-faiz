import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import hasAnyPermission from '@/lib/utils';
import { type BreadcrumbItem, type Institusi, type Jurusan } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    jurusan: {
        data: Jurusan[];
        links: any[];
    };
    institusi: Institusi[];
    filters: { search?: string };
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Jurusan', href: '/jurusan' },
];

export default function JurusanPage({ jurusan, institusi, filters, flash }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<Jurusan | null>(null);
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ institusi_id: '', nama: '', kode: '' });
    const editForm = useForm({ institusi_id: '', nama: '', kode: '', _method: 'PUT' });

    function openEditDialog(item: Jurusan) {
        setEditTarget(item);
        editForm.setData({ institusi_id: String(item.institusi_id), nama: item.nama, kode: item.kode, _method: 'PUT' });
        setOpenEdit(true);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createForm.post('/jurusan', {
            onSuccess: () => { setOpenCreate(false); createForm.reset(); },
        });
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;
        editForm.post(`/jurusan/${editTarget.id}`, {
            onSuccess: () => setOpenEdit(false),
        });
    }

    function handleDelete(id: number) {
        if (!confirm('Hapus jurusan ini?')) return;
        router.delete(`/jurusan/${id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Jurusan" />

            <div className="p-4 space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2">
                    <form onSubmit={e => { e.preventDefault(); router.get('/jurusan', { search }, { preserveState: true }); }} className="flex gap-2 w-full max-w-xs">
                        <Input placeholder="Cari jurusan..." value={search} onChange={e => setSearch(e.target.value)} />
                        <Button variant="outline" type="submit">Cari</Button>
                    </form>
                    {hasAnyPermission(['jurusan create']) && (
                        <Button onClick={() => setOpenCreate(true)}>
                            <PlusCircle className="mr-2 size-4" /> Tambah
                        </Button>
                    )}
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Kode</TableHead>
                            <TableHead>Institusi</TableHead>
                            <TableHead className="w-28">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jurusan.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                                    Belum ada data jurusan.
                                </TableCell>
                            </TableRow>
                        ) : jurusan.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.nama}</TableCell>
                                <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.kode}</code></TableCell>
                                <TableCell className="text-muted-foreground text-sm">{item.institusi?.nama ?? '-'}</TableCell>
                                <TableCell className="flex gap-1">
                                    {hasAnyPermission(['jurusan edit']) && (
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                                            <Pencil className="size-3.5" />
                                        </Button>
                                    )}
                                    {hasAnyPermission(['jurusan delete']) && (
                                        <Button variant="outline" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex gap-1">
                    {jurusan.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm"
                            disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>

            {/* Dialog Create */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Jurusan</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Institusi <span className="text-red-500">*</span></Label>
                            <Select value={createForm.data.institusi_id} onValueChange={v => createForm.setData('institusi_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Pilih institusi..." /></SelectTrigger>
                                <SelectContent>
                                    {institusi.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.nama}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {createForm.errors.institusi_id && <p className="text-xs text-red-500">{createForm.errors.institusi_id}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Nama <span className="text-red-500">*</span></Label>
                            <Input value={createForm.data.nama} onChange={e => createForm.setData('nama', e.target.value)} />
                            {createForm.errors.nama && <p className="text-xs text-red-500">{createForm.errors.nama}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Kode <span className="text-red-500">*</span></Label>
                            <Input value={createForm.data.kode} onChange={e => createForm.setData('kode', e.target.value)} placeholder="Contoh: TI" />
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
                    <DialogHeader><DialogTitle>Edit Jurusan</DialogTitle></DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Institusi <span className="text-red-500">*</span></Label>
                            <Select value={editForm.data.institusi_id} onValueChange={v => editForm.setData('institusi_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Pilih institusi..." /></SelectTrigger>
                                <SelectContent>
                                    {institusi.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.nama}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {editForm.errors.institusi_id && <p className="text-xs text-red-500">{editForm.errors.institusi_id}</p>}
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

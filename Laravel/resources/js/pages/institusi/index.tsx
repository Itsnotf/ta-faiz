import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import hasAnyPermission from '@/lib/utils';
import { type BreadcrumbItem, type Institusi } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { PlusCircle, Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    institusi: {
        data: Institusi[];
        links: any[];
    };
    filters: { search?: string };
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Institusi', href: '/institusi' },
];

export default function InstitusiPage({ institusi, filters, flash }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<Institusi | null>(null);
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ nama: '', alamat: '', logo: null as File | null });
    const editForm = useForm({ nama: '', alamat: '', logo: null as File | null, _method: 'PUT' });

    function openEditDialog(item: Institusi) {
        setEditTarget(item);
        editForm.setData({ nama: item.nama, alamat: item.alamat, logo: null, _method: 'PUT' });
        setOpenEdit(true);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createForm.post('/institusi', {
            onSuccess: () => { setOpenCreate(false); createForm.reset(); },
        });
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;
        editForm.post(`/institusi/${editTarget.id}`, {
            onSuccess: () => { setOpenEdit(false); },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Institusi" />

            <div className="p-4 space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2">
                    <form onSubmit={e => { e.preventDefault(); router.get('/institusi', { search }, { preserveState: true }); }} className="flex gap-2 w-full max-w-xs">
                        <Input placeholder="Cari institusi..." value={search} onChange={e => setSearch(e.target.value)} />
                        <Button variant="outline" type="submit">Cari</Button>
                    </form>
                    {hasAnyPermission(['institusi edit']) && (
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
                            <TableHead>Alamat</TableHead>
                            <TableHead className="w-28">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {institusi.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                                    Belum ada data institusi.
                                </TableCell>
                            </TableRow>
                        ) : institusi.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.nama}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{item.alamat}</TableCell>
                                <TableCell className="flex gap-1">
                                    {hasAnyPermission(['institusi edit']) && (
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                                            <Pencil className="size-3.5" />
                                        </Button>
                                    )}
                                    {hasAnyPermission(['institusi delete']) && (
                                        <ConfirmDialog
                                            description="Data institusi ini akan dihapus permanen beserta seluruh data jurusan di bawahnya."
                                            onConfirm={() => router.delete(`/institusi/${item.id}`)}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex gap-1">
                    {institusi.links.map((link, i) => (
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
                    <DialogHeader><DialogTitle>Tambah Institusi</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Nama <span className="text-red-500">*</span></Label>
                            <Input value={createForm.data.nama} onChange={e => createForm.setData('nama', e.target.value)} />
                            {createForm.errors.nama && <p className="text-xs text-red-500">{createForm.errors.nama}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Alamat <span className="text-red-500">*</span></Label>
                            <Input value={createForm.data.alamat} onChange={e => createForm.setData('alamat', e.target.value)} />
                            {createForm.errors.alamat && <p className="text-xs text-red-500">{createForm.errors.alamat}</p>}
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
                    <DialogHeader><DialogTitle>Edit Institusi</DialogTitle></DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Nama <span className="text-red-500">*</span></Label>
                            <Input value={editForm.data.nama} onChange={e => editForm.setData('nama', e.target.value)} />
                            {editForm.errors.nama && <p className="text-xs text-red-500">{editForm.errors.nama}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Alamat <span className="text-red-500">*</span></Label>
                            <Input value={editForm.data.alamat} onChange={e => editForm.setData('alamat', e.target.value)} />
                            {editForm.errors.alamat && <p className="text-xs text-red-500">{editForm.errors.alamat}</p>}
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

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import hasAnyPermission from '@/lib/utils';
import { type BreadcrumbItem, type Dosen, type Jurusan } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    dosen: { data: Dosen[]; links: any[] };
    jurusan: Jurusan[];
    filters: { search?: string };
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dosen', href: '/dosen' }];

export default function DosenPage({ dosen, jurusan, filters, flash }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<Dosen | null>(null);
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ jurusan_id: '', nip: '', nama: '', email: '' });
    const editForm   = useForm({ jurusan_id: '', nip: '', nama: '', email: '', _method: 'PUT' });

    function openEditDialog(item: Dosen) {
        setEditTarget(item);
        editForm.setData({ jurusan_id: String(item.jurusan_id), nip: item.nip, nama: item.nama, email: item.email, _method: 'PUT' });
        setOpenEdit(true);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createForm.post('/dosen', { onSuccess: () => { setOpenCreate(false); createForm.reset(); } });
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;
        editForm.post(`/dosen/${editTarget.id}`, { onSuccess: () => setOpenEdit(false) });
    }

    const FormFields = ({ form }: { form: typeof createForm }) => (
        <>
            <div className="space-y-1">
                <Label>Jurusan <span className="text-red-500">*</span></Label>
                <Select value={form.data.jurusan_id} onValueChange={v => form.setData('jurusan_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih jurusan..." /></SelectTrigger>
                    <SelectContent>{jurusan.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>)}</SelectContent>
                </Select>
                {form.errors.jurusan_id && <p className="text-xs text-red-500">{form.errors.jurusan_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>NIP <span className="text-red-500">*</span></Label>
                    <Input value={form.data.nip} onChange={e => form.setData('nip', e.target.value)} />
                    {form.errors.nip && <p className="text-xs text-red-500">{form.errors.nip}</p>}
                </div>
                <div className="space-y-1">
                    <Label>Nama <span className="text-red-500">*</span></Label>
                    <Input value={form.data.nama} onChange={e => form.setData('nama', e.target.value)} />
                    {form.errors.nama && <p className="text-xs text-red-500">{form.errors.nama}</p>}
                </div>
            </div>
            <div className="space-y-1">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} />
                {form.errors.email && <p className="text-xs text-red-500">{form.errors.email}</p>}
            </div>
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dosen" />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <form onSubmit={e => { e.preventDefault(); router.get('/dosen', { search }, { preserveState: true }); }} className="flex gap-2 w-full max-w-xs">
                        <Input placeholder="Cari dosen..." value={search} onChange={e => setSearch(e.target.value)} />
                        <Button variant="outline" type="submit">Cari</Button>
                    </form>
                    {hasAnyPermission(['dosen create']) && (
                        <Button onClick={() => setOpenCreate(true)}><PlusCircle className="mr-2 size-4" /> Tambah</Button>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>NIP</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Jurusan</TableHead>
                            <TableHead className="w-24">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dosen.data.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Belum ada data dosen.</TableCell></TableRow>
                        ) : dosen.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-sm">{item.nip}</TableCell>
                                <TableCell className="font-medium">{item.nama}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{item.email}</TableCell>
                                <TableCell className="text-sm">{item.jurusan?.nama ?? '-'}</TableCell>
                                <TableCell className="flex gap-1">
                                    {hasAnyPermission(['dosen edit']) && (
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}><Pencil className="size-3.5" /></Button>
                                    )}
                                    {hasAnyPermission(['dosen delete']) && (
                                        <Button variant="outline" size="sm" className="hover:bg-red-50 hover:text-red-600"
                                            onClick={() => { if (confirm('Hapus dosen ini?')) router.delete(`/dosen/${item.id}`); }}>
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex gap-1">
                    {dosen.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm" disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            </div>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Dosen</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <FormFields form={createForm} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
                            <Button type="submit" disabled={createForm.processing}>Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Dosen</DialogTitle></DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <FormFields form={editForm as any} />
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

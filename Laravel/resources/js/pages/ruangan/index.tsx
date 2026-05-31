import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import hasAnyPermission from '@/lib/utils';
import { type BreadcrumbItem, type Jurusan, type Ruangan } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    ruangan: { data: Ruangan[]; links: any[] };
    jurusan: Jurusan[];
    filters: { search?: string };
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Ruangan', href: '/ruangan' }];

const emptyForm = { jurusan_id: '', nama: '', kode: '', kapasitas: '', cctv_url: '' };

export default function RuanganPage({ ruangan, jurusan, filters, flash }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<Ruangan | null>(null);
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ ...emptyForm });
    const editForm = useForm({ ...emptyForm, _method: 'PUT' });

    function openEditDialog(item: Ruangan) {
        setEditTarget(item);
        editForm.setData({
            jurusan_id: String(item.jurusan_id), nama: item.nama, kode: item.kode,
            kapasitas: String(item.kapasitas), cctv_url: item.cctv_url ?? '', _method: 'PUT',
        });
        setOpenEdit(true);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createForm.post('/ruangan', { onSuccess: () => { setOpenCreate(false); createForm.reset(); } });
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;
        editForm.post(`/ruangan/${editTarget.id}`, { onSuccess: () => setOpenEdit(false) });
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
            <div className="space-y-1">
                <Label>Nama <span className="text-red-500">*</span></Label>
                <Input value={form.data.nama} onChange={e => form.setData('nama', e.target.value)} />
                {form.errors.nama && <p className="text-xs text-red-500">{form.errors.nama}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Kode <span className="text-red-500">*</span></Label>
                    <Input value={form.data.kode} onChange={e => form.setData('kode', e.target.value)} placeholder="LAB-A" />
                    {form.errors.kode && <p className="text-xs text-red-500">{form.errors.kode}</p>}
                </div>
                <div className="space-y-1">
                    <Label>Kapasitas <span className="text-red-500">*</span></Label>
                    <Input type="number" min={1} value={form.data.kapasitas} onChange={e => form.setData('kapasitas', e.target.value)} />
                    {form.errors.kapasitas && <p className="text-xs text-red-500">{form.errors.kapasitas}</p>}
                </div>
            </div>
            <div className="space-y-1">
                <Label>CCTV URL <span className="text-xs text-muted-foreground">(opsional — diisi saat produksi)</span></Label>
                <Input value={form.data.cctv_url} onChange={e => form.setData('cctv_url', e.target.value)} placeholder="rtsp://..." />
            </div>
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ruangan" />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <form onSubmit={e => { e.preventDefault(); router.get('/ruangan', { search }, { preserveState: true }); }} className="flex gap-2 w-full max-w-xs">
                        <Input placeholder="Cari ruangan..." value={search} onChange={e => setSearch(e.target.value)} />
                        <Button variant="outline" type="submit">Cari</Button>
                    </form>
                    {hasAnyPermission(['ruangan create']) && (
                        <Button onClick={() => setOpenCreate(true)}><PlusCircle className="mr-2 size-4" /> Tambah</Button>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Kode</TableHead>
                            <TableHead>Kapasitas</TableHead>
                            <TableHead>Jurusan</TableHead>
                            <TableHead className="w-28">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ruangan.data.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Belum ada data ruangan.</TableCell></TableRow>
                        ) : ruangan.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.nama}</TableCell>
                                <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.kode}</code></TableCell>
                                <TableCell>{item.kapasitas}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{item.jurusan?.nama ?? '-'}</TableCell>
                                <TableCell className="flex gap-1">
                                    {hasAnyPermission(['ruangan edit']) && (
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}><Pencil className="size-3.5" /></Button>
                                    )}
                                    {hasAnyPermission(['ruangan delete']) && (
                                        <Button variant="outline" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => { if (confirm('Hapus ruangan ini?')) router.delete(`/ruangan/${item.id}`); }}><Trash2 className="size-3.5" /></Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex gap-1">
                    {ruangan.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm" disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            </div>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Ruangan</DialogTitle></DialogHeader>
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
                    <DialogHeader><DialogTitle>Edit Ruangan</DialogTitle></DialogHeader>
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

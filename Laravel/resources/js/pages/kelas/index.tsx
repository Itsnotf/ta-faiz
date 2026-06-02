import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import hasAnyPermission from '@/lib/utils';
import { type BreadcrumbItem, type Prodi } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusCircle, Users } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface KelasItem {
    id: number; nama: string; angkatan: number;
    prodi_id: number;
    prodi?: { id: number; nama: string; jurusan?: { nama: string } };
    mahasiswa_count: number;
}

interface Props {
    kelas: { data: KelasItem[]; links: any[] };
    prodi: Prodi[];
    filters: { search?: string; angkatan?: string };
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Kelas', href: '/kelas' }];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => currentYear - i);

export default function KelasPage({ kelas, prodi, filters, flash }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<KelasItem | null>(null);
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ prodi_id: '', nama: '', angkatan: String(currentYear) });
    const editForm = useForm({ prodi_id: '', nama: '', angkatan: '', _method: 'PUT' });

    function openEditDialog(item: KelasItem) {
        setEditTarget(item);
        editForm.setData({ prodi_id: String(item.prodi_id), nama: item.nama, angkatan: String(item.angkatan), _method: 'PUT' });
        setOpenEdit(true);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createForm.post('/kelas', { onSuccess: () => { setOpenCreate(false); createForm.reset(); } });
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;
        editForm.post(`/kelas/${editTarget.id}`, { onSuccess: () => setOpenEdit(false) });
    }

    const FormFields = ({ form }: { form: typeof createForm }) => (
        <>
            <div className="space-y-1">
                <Label>Program Studi <span className="text-red-500">*</span></Label>
                <Select value={form.data.prodi_id} onValueChange={v => form.setData('prodi_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih prodi..." /></SelectTrigger>
                    <SelectContent>
                        {prodi.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>
                                {p.nama} {p.jurusan ? `(${p.jurusan.nama})` : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {form.errors.prodi_id && <p className="text-xs text-red-500">{form.errors.prodi_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Nama Kelas <span className="text-red-500">*</span></Label>
                    <Input value={form.data.nama} onChange={e => form.setData('nama', e.target.value)} placeholder="4A" />
                    {form.errors.nama && <p className="text-xs text-red-500">{form.errors.nama}</p>}
                </div>
                <div className="space-y-1">
                    <Label>Angkatan <span className="text-red-500">*</span></Label>
                    <Select value={form.data.angkatan} onValueChange={v => form.setData('angkatan', v)}>
                        <SelectTrigger><SelectValue placeholder="Tahun..." /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                    {form.errors.angkatan && <p className="text-xs text-red-500">{form.errors.angkatan}</p>}
                </div>
            </div>
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kelas" />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-2 flex-wrap">
                        <form onSubmit={e => { e.preventDefault(); router.get('/kelas', { search, angkatan: filters.angkatan }, { preserveState: true }); }} className="flex gap-2">
                            <Input placeholder="Cari kelas..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
                            <Button variant="outline" type="submit">Cari</Button>
                        </form>
                        <Select value={filters.angkatan ?? ''}
                            onValueChange={val => {
                                const p = val && val !== 'all' ? { angkatan: val } : {};
                                router.get('/kelas', { ...filters, ...p }, { preserveState: true });
                            }}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Semua Angkatan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Angkatan</SelectItem>
                                {years.map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {hasAnyPermission(['kelas create']) && (
                        <Button onClick={() => setOpenCreate(true)}><PlusCircle className="mr-2 size-4" /> Tambah</Button>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Angkatan</TableHead>
                            <TableHead>Prodi</TableHead>
                            <TableHead>Jurusan</TableHead>
                            <TableHead className="text-center">Mahasiswa</TableHead>
                            <TableHead className="w-28">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {kelas.data.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Belum ada data kelas.</TableCell></TableRow>
                        ) : kelas.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.nama}</TableCell>
                                <TableCell>{item.angkatan}</TableCell>
                                <TableCell className="text-sm">{item.prodi?.nama ?? '-'}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{item.prodi?.jurusan?.nama ?? '-'}</TableCell>
                                <TableCell className="text-center">
                                    <Button size="sm" variant="outline"
                                        onClick={() => router.get(`/kelas/${item.id}/mahasiswa`)}>
                                        <Users className="size-3.5 mr-1" />
                                        {item.mahasiswa_count}
                                    </Button>
                                </TableCell>
                                <TableCell className="flex gap-1">
                                    {hasAnyPermission(['kelas edit']) && (
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}><Pencil className="size-3.5" /></Button>
                                    )}
                                    {hasAnyPermission(['kelas delete']) && (
                                        <ConfirmDialog
                                            description="Data kelas ini akan dihapus permanen beserta seluruh data mahasiswa di dalamnya."
                                            onConfirm={() => router.delete(`/kelas/${item.id}`)}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex gap-1">
                    {kelas.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm" disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            </div>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Kelas</DialogTitle></DialogHeader>
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
                    <DialogHeader><DialogTitle>Edit Kelas</DialogTitle></DialogHeader>
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

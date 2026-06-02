import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import hasAnyPermission from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface MahasiswaItem {
    id: number; nim: string; nama: string; email: string | null;
    kelas_id: number;
    status_akun: 'pending_upload' | 'pending_verifikasi' | 'aktif';
    kelas?: { id: number; nama: string; prodi?: { nama: string } };
}

interface KelasOption {
    id: number; nama: string; prodi_id: number;
    prodi?: { nama: string };
}

interface Props {
    mahasiswa: { data: MahasiswaItem[]; links: any[] };
    kelas: KelasOption[];
    filters: { search?: string; kelas_id?: string };
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mahasiswa', href: '/mahasiswa' }];

const statusBadge = (status: MahasiswaItem['status_akun']) => {
    const map = {
        pending_upload:     { label: 'Pending Upload',     className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        pending_verifikasi: { label: 'Pending Verifikasi', className: 'bg-orange-100 text-orange-800 border-orange-200' },
        aktif:              { label: 'Aktif',              className: 'bg-green-100 text-green-800 border-green-200' },
    };
    const s = map[status];
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
};

export default function MahasiswaPage({ mahasiswa, kelas, filters, flash }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<MahasiswaItem | null>(null);
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ kelas_id: '', nim: '', nama: '', email: '' });
    const editForm   = useForm({ kelas_id: '', nim: '', nama: '', email: '', _method: 'PUT' });

    function openEditDialog(item: MahasiswaItem) {
        setEditTarget(item);
        editForm.setData({
            kelas_id: String(item.kelas_id),
            nim: item.nim,
            nama: item.nama,
            email: item.email ?? '',
            _method: 'PUT',
        });
        setOpenEdit(true);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createForm.post('/mahasiswa', { onSuccess: () => { setOpenCreate(false); createForm.reset(); } });
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;
        editForm.post(`/mahasiswa/${editTarget.id}`, { onSuccess: () => setOpenEdit(false) });
    }

    const FormFields = ({ form }: { form: any }) => (
        <>
            <div className="space-y-1">
                <Label>Kelas <span className="text-red-500">*</span></Label>
                <Select value={form.data.kelas_id} onValueChange={v => form.setData('kelas_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                    <SelectContent>
                        {kelas.map(k => (
                            <SelectItem key={k.id} value={String(k.id)}>
                                {k.nama} {k.prodi ? `— ${k.prodi.nama}` : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {form.errors.kelas_id && <p className="text-xs text-red-500">{form.errors.kelas_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>NIM <span className="text-red-500">*</span></Label>
                    <Input value={form.data.nim} onChange={e => form.setData('nim', e.target.value)} />
                    {form.errors.nim && <p className="text-xs text-red-500">{form.errors.nim}</p>}
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
            <p className="text-xs text-muted-foreground">
                Password default: <code className="bg-muted px-1 rounded">Password@123</code>
            </p>
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mahasiswa" />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-2 flex-wrap">
                        <form onSubmit={e => {
                            e.preventDefault();
                            router.get('/mahasiswa', { search, kelas_id: filters.kelas_id }, { preserveState: true });
                        }} className="flex gap-2">
                            <Input placeholder="Cari nama / NIM..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
                            <Button variant="outline" type="submit">Cari</Button>
                        </form>
                        <Select value={filters.kelas_id ?? ''}
                            onValueChange={val => {
                                const p = val && val !== 'all' ? { kelas_id: val } : {};
                                router.get('/mahasiswa', p, { preserveState: true });
                            }}>
                            <SelectTrigger className="w-56">
                                <SelectValue placeholder="Semua Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kelas</SelectItem>
                                {kelas.map(k => (
                                    <SelectItem key={k.id} value={String(k.id)}>
                                        {k.nama}{k.prodi ? ` — ${k.prodi.nama}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {hasAnyPermission(['mahasiswa create']) && (
                        <Button onClick={() => setOpenCreate(true)}><PlusCircle className="mr-2 size-4" /> Tambah</Button>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>NIM</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Kelas</TableHead>
                            <TableHead>Status Akun</TableHead>
                            <TableHead className="w-24">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mahasiswa.data.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Belum ada data mahasiswa.</TableCell></TableRow>
                        ) : mahasiswa.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-sm">{item.nim}</TableCell>
                                <TableCell className="font-medium">{item.nama}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{item.email ?? '—'}</TableCell>
                                <TableCell className="text-sm">{item.kelas?.nama ?? '-'} {item.kelas?.prodi ? `— ${item.kelas.prodi.nama}` : ''}</TableCell>
                                <TableCell>{statusBadge(item.status_akun)}</TableCell>
                                <TableCell className="flex gap-1">
                                    {hasAnyPermission(['mahasiswa edit']) && (
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}><Pencil className="size-3.5" /></Button>
                                    )}
                                    {hasAnyPermission(['mahasiswa delete']) && (
                                        <ConfirmDialog
                                            description="Data mahasiswa dan akun login-nya akan dihapus permanen."
                                            onConfirm={() => router.delete(`/mahasiswa/${item.id}`)}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex gap-1">
                    {mahasiswa.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm" disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            </div>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Mahasiswa</DialogTitle></DialogHeader>
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
                    <DialogHeader><DialogTitle>Edit Mahasiswa</DialogTitle></DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <FormFields form={editForm} />
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

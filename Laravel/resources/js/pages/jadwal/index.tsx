import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import hasAnyPermission from '@/lib/utils';
import { type BreadcrumbItem, type Dosen, type Jadwal, type Kelas, type Ruangan } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    jadwal: { data: Jadwal[]; links: any[] };
    kelas: Kelas[];
    dosen: Dosen[];
    ruangan: Ruangan[];
    filters: { search?: string };
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Jadwal', href: '/jadwal' }];

const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'] as const;

const hariBadgeColor: Record<string, string> = {
    senin:  'bg-blue-100 text-blue-800 border-blue-200',
    selasa: 'bg-purple-100 text-purple-800 border-purple-200',
    rabu:   'bg-green-100 text-green-800 border-green-200',
    kamis:  'bg-yellow-100 text-yellow-800 border-yellow-200',
    jumat:  'bg-orange-100 text-orange-800 border-orange-200',
    sabtu:  'bg-red-100 text-red-800 border-red-200',
    minggu: 'bg-pink-100 text-pink-800 border-pink-200',
};

const emptyForm = {
    kelas_id: '', dosen_id: '', ruangan_id: '',
    mata_kuliah: '', hari: '', jam_mulai: '', jam_selesai: '', window_menit: '15', window_dosen_menit: '30',
};

export default function JadwalPage({ jadwal, kelas, dosen, ruangan, filters, flash }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editTarget, setEditTarget] = useState<Jadwal | null>(null);
    const [shownMessages] = useState(new Set<string>());

    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
    }, [flash?.success]);

    const createForm = useForm({ ...emptyForm });
    const editForm   = useForm({ ...emptyForm, _method: 'PUT' });

    function openEditDialog(item: Jadwal) {
        setEditTarget(item);
        editForm.setData({
            kelas_id: String(item.kelas_id), dosen_id: String(item.dosen_id),
            ruangan_id: String(item.ruangan_id), mata_kuliah: item.mata_kuliah,
            hari: item.hari, jam_mulai: item.jam_mulai.slice(0, 5),
            jam_selesai: item.jam_selesai.slice(0, 5), window_menit: String(item.window_menit),
            window_dosen_menit: String(item.window_dosen_menit ?? 30),
            _method: 'PUT',
        });
        setOpenEdit(true);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        createForm.post('/jadwal', { onSuccess: () => { setOpenCreate(false); createForm.reset(); } });
    }

    function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editTarget) return;
        editForm.post(`/jadwal/${editTarget.id}`, { onSuccess: () => setOpenEdit(false) });
    }

    const FormFields = ({ form }: { form: typeof createForm }) => (
        <>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Kelas <span className="text-red-500">*</span></Label>
                    <Select value={form.data.kelas_id} onValueChange={v => form.setData('kelas_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                        <SelectContent>{kelas.map(k => <SelectItem key={k.id} value={String(k.id)}>{k.nama}{k.prodi ? ` — ${k.prodi.nama}` : ''}</SelectItem>)}</SelectContent>
                    </Select>
                    {form.errors.kelas_id && <p className="text-xs text-red-500">{form.errors.kelas_id}</p>}
                </div>
                <div className="space-y-1">
                    <Label>Dosen <span className="text-red-500">*</span></Label>
                    <Select value={form.data.dosen_id} onValueChange={v => form.setData('dosen_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih dosen..." /></SelectTrigger>
                        <SelectContent>{dosen.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nama}</SelectItem>)}</SelectContent>
                    </Select>
                    {form.errors.dosen_id && <p className="text-xs text-red-500">{form.errors.dosen_id}</p>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Ruangan <span className="text-red-500">*</span></Label>
                    <Select value={form.data.ruangan_id} onValueChange={v => form.setData('ruangan_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih ruangan..." /></SelectTrigger>
                        <SelectContent>{ruangan.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nama} ({r.kode})</SelectItem>)}</SelectContent>
                    </Select>
                    {form.errors.ruangan_id && <p className="text-xs text-red-500">{form.errors.ruangan_id}</p>}
                </div>
                <div className="space-y-1">
                    <Label>Hari <span className="text-red-500">*</span></Label>
                    <Select value={form.data.hari} onValueChange={v => form.setData('hari', v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih hari..." /></SelectTrigger>
                        <SelectContent>{HARI.map(h => <SelectItem key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                    {form.errors.hari && <p className="text-xs text-red-500">{form.errors.hari}</p>}
                </div>
            </div>
            <div className="space-y-1">
                <Label>Mata Kuliah <span className="text-red-500">*</span></Label>
                <Input value={form.data.mata_kuliah} onChange={e => form.setData('mata_kuliah', e.target.value)} placeholder="Pemrograman Web" />
                {form.errors.mata_kuliah && <p className="text-xs text-red-500">{form.errors.mata_kuliah}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Jam Mulai <span className="text-red-500">*</span></Label>
                    <Input type="time" value={form.data.jam_mulai} onChange={e => form.setData('jam_mulai', e.target.value)} />
                    {form.errors.jam_mulai && <p className="text-xs text-red-500">{form.errors.jam_mulai}</p>}
                </div>
                <div className="space-y-1">
                    <Label>Jam Selesai <span className="text-red-500">*</span></Label>
                    <Input type="time" value={form.data.jam_selesai} onChange={e => form.setData('jam_selesai', e.target.value)} />
                    {form.errors.jam_selesai && <p className="text-xs text-red-500">{form.errors.jam_selesai}</p>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Window Mahasiswa (menit)</Label>
                    <Input type="number" min={1} max={60} value={form.data.window_menit} onChange={e => form.setData('window_menit', e.target.value)} />
                    <p className="text-xs text-muted-foreground">Waktu toleransi hadir mahasiswa</p>
                </div>
                <div className="space-y-1">
                    <Label>Window Dosen (menit)</Label>
                    <Input type="number" min={1} max={120} value={form.data.window_dosen_menit} onChange={e => form.setData('window_dosen_menit', e.target.value)} />
                    <p className="text-xs text-muted-foreground">Waktu toleransi hadir dosen (default 2×)</p>
                </div>
            </div>
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Jadwal" />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <form onSubmit={e => { e.preventDefault(); router.get('/jadwal', { search }, { preserveState: true }); }} className="flex gap-2 w-full max-w-xs">
                        <Input placeholder="Cari mata kuliah..." value={search} onChange={e => setSearch(e.target.value)} />
                        <Button variant="outline" type="submit">Cari</Button>
                    </form>
                    {hasAnyPermission(['jadwal create']) && (
                        <Button onClick={() => setOpenCreate(true)}><PlusCircle className="mr-2 size-4" /> Tambah</Button>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mata Kuliah</TableHead>
                            <TableHead>Kelas</TableHead>
                            <TableHead>Dosen</TableHead>
                            <TableHead>Ruangan</TableHead>
                            <TableHead>Hari</TableHead>
                            <TableHead>Jam</TableHead>
                            <TableHead className="w-24">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jadwal.data.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Belum ada data jadwal.</TableCell></TableRow>
                        ) : jadwal.data.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.mata_kuliah}</TableCell>
                                <TableCell className="text-sm">{item.kelas?.nama ?? '-'}</TableCell>
                                <TableCell className="text-sm">{item.dosen?.nama ?? '-'}</TableCell>
                                <TableCell className="text-sm">{item.ruangan?.nama ?? '-'}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={hariBadgeColor[item.hari] ?? ''}>
                                        {item.hari.charAt(0).toUpperCase() + item.hari.slice(1)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                    {item.jam_mulai.slice(0, 5)} – {item.jam_selesai.slice(0, 5)}
                                </TableCell>
                                <TableCell className="flex gap-1">
                                    {hasAnyPermission(['jadwal edit']) && (
                                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}><Pencil className="size-3.5" /></Button>
                                    )}
                                    {hasAnyPermission(['jadwal delete']) && (
                                        <ConfirmDialog
                                            description="Jadwal ini akan dihapus permanen. Sesi absensi yang sudah berjalan tidak terpengaruh."
                                            onConfirm={() => router.delete(`/jadwal/${item.id}`)}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex gap-1">
                    {jadwal.links.map((link, i) => (
                        <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm" disabled={!link.url}
                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            </div>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Tambah Jadwal</DialogTitle></DialogHeader>
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
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Edit Jadwal</DialogTitle></DialogHeader>
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

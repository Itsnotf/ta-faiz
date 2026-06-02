import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface MhsRow {
    id: number; nim: string; nama: string; email: string | null;
    status_akun: 'pending_upload' | 'pending_verifikasi' | 'aktif';
}
interface KelasInfo {
    id: number; nama: string; angkatan: number;
    prodi?: { nama: string; jurusan?: { nama: string } };
}
interface Props { kelas: KelasInfo; mahasiswa: MhsRow[] }

const statusCfg = {
    pending_upload:     { label: 'Belum Upload',  cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    pending_verifikasi: { label: 'Verifikasi',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    aktif:              { label: 'Aktif',          cls: 'bg-green-50 text-green-700 border-green-200' },
} as const;

export default function KelasDetailPage({ kelas, mahasiswa }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Kelas', href: '/kelas' },
        { title: `${kelas.nama} — ${kelas.prodi?.nama ?? '-'}`, href: `/kelas/${kelas.id}/mahasiswa` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Mahasiswa Kelas ${kelas.nama}`} />
            <div className="p-6 space-y-5">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.get('/kelas')}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">
                            Kelas {kelas.nama} — {kelas.prodi?.nama ?? '-'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Angkatan {kelas.angkatan} · {kelas.prodi?.jurusan?.nama ?? '-'}
                            · {mahasiswa.length} mahasiswa
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>NIM</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status Enrollment</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mahasiswa.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-16">
                                        Belum ada mahasiswa di kelas ini.
                                    </TableCell>
                                </TableRow>
                            ) : mahasiswa.map(m => {
                                const cfg = statusCfg[m.status_akun];
                                return (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-mono text-sm">{m.nim}</TableCell>
                                        <TableCell className="font-medium">{m.nama}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {m.email ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
                                                {cfg.label}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}

<?php

namespace App\Services;

use App\Models\AbsensiMahasiswa;
use App\Models\Keterangan;
use App\Models\Mahasiswa;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class KeteranganService
{
    public function store(Request $request, User $user): Keterangan
    {
        $absensi = AbsensiMahasiswa::findOrFail($request->absensi_id);

        if ($absensi->status !== 'alpa') {
            abort(422, 'Keterangan hanya untuk status Alpa.');
        }

        $deadline = Carbon::parse($absensi->created_at)->setTimezone('Asia/Jakarta')->setTime(21, 0, 0);
        if (now('Asia/Jakarta')->isAfter($deadline) || $absensi->is_locked) {
            abort(403, 'Batas waktu pengajuan sudah lewat.');
        }

        if ($user->isMahasiswa()) {
            abort_if($absensi->mahasiswa_id !== $user->mahasiswa->id, 403);
        }

        $path = $request->file('file_bukti')->store('keterangan', 'local');

        return Keterangan::create([
            'absensi_mahasiswa_id' => $absensi->id,
            'mahasiswa_id'         => $absensi->mahasiswa_id,
            'jenis'                => $request->jenis,
            'keterangan'           => $request->keterangan,
            'file_bukti'           => $path,
            'diajukan_oleh'        => $user->isMahasiswa() ? 'mahasiswa' : 'admin',
            'status_keterangan'    => 'pending',
        ]);
    }

    public function approve(Keterangan $ket, User $approver): void
    {
        DB::transaction(function () use ($ket, $approver) {
            $ket->update([
                'status_keterangan' => 'approved',
                'disetujui_oleh'    => $approver->id,
                'approved_at'       => now(),
            ]);

            $ket->absensiMahasiswa()->update(['status' => $ket->jenis]);
        });
    }

    public function reject(Keterangan $ket, User $rejector): void
    {
        $ket->update([
            'status_keterangan' => 'rejected',
            'disetujui_oleh'    => $rejector->id,
            'approved_at'       => now(),
        ]);
    }

    public function getForMahasiswa(Mahasiswa $mahasiswa): Collection
    {
        return AbsensiMahasiswa::with(['sesi.jadwal', 'keterangan'])
            ->where('mahasiswa_id', $mahasiswa->id)
            ->where('status', 'alpa')
            ->orderByDesc('created_at')
            ->get();
    }

    public function getForAdmin(?int $jurusanId, bool $isSuperAdmin, ?string $statusFilter): LengthAwarePaginator
    {
        return Keterangan::with(['mahasiswa.kelas.prodi', 'absensiMahasiswa.sesi.jadwal', 'disetujuiOleh'])
            ->when(
                !$isSuperAdmin && $jurusanId,
                fn($q) => $q->whereHas('mahasiswa.kelas.prodi', fn($q2) => $q2->where('jurusan_id', $jurusanId))
            )
            ->when(
                $statusFilter && $statusFilter !== 'semua',
                fn($q) => $q->where('status_keterangan', $statusFilter)
            )
            ->orderByDesc('created_at')
            ->paginate(config('starterkit.pagination'))
            ->withQueryString();
    }
}

# Task List — Bugfix & Konsistensi Frontend
*Dibuat: 1 Juni 2026 | Lanjutan dari TASK_LIST_Sistem_Absensi.md*

---

## Konteks

Task list ini berisi perbaikan bug yang ditemukan setelah seluruh fitur selesai dibangun.
Semua task bersifat **bugfix atau refactor** — tidak ada fitur baru.
Eksekusi task secara berurutan. Jangan skip.

**Root project:** `ta-faiz/Laravel/` (Laravel) dan `ta-faiz/python-service/` (Python FastAPI)

---

## Prioritas Eksekusi

| Task | Nama | Kategori | Urgensi |
|------|------|----------|---------|
| FIX-001 | camera.py — backend & verifikasi frame | Python / Kamera | 🔴 Kritis |
| FIX-002 | recognizer.py — numpy conversion + FRAME_SCALE | Python / Recognition | 🔴 Kritis |
| FIX-003 | python-service/.env — tambah FRAME_SCALE | Python / Config | 🔴 Kritis |
| FIX-004 | InternalController — filter status_akun aktif | Laravel / Backend | 🟡 Mayor |
| FIX-005 | InternalController — verifikasi mahasiswa ∈ kelas | Laravel / Backend | 🟡 Mayor |
| FIX-006 | Hapus migration duplikat institusi | Laravel / DB | 🟡 Mayor |
| FIX-007 | Buat komponen ConfirmDialog shadcn | Frontend / Komponen | 🟢 Konsistensi |
| FIX-008 | institusi/index.tsx — ganti confirm() | Frontend / UI | 🟢 Konsistensi |
| FIX-009 | jurusan/index.tsx — ganti confirm() | Frontend / UI | 🟢 Konsistensi |
| FIX-010 | prodi/index.tsx — ganti confirm() | Frontend / UI | 🟢 Konsistensi |
| FIX-011 | ruangan/index.tsx — ganti confirm() | Frontend / UI | 🟢 Konsistensi |
| FIX-012 | kelas/index.tsx — ganti confirm() | Frontend / UI | 🟢 Konsistensi |
| FIX-013 | dosen/index.tsx — ganti confirm() | Frontend / UI | 🟢 Konsistensi |
| FIX-014 | mahasiswa/index.tsx — ganti confirm() | Frontend / UI | 🟢 Konsistensi |
| FIX-015 | jadwal/index.tsx — ganti confirm() | Frontend / UI | 🟢 Konsistensi |
| FIX-016 | enrollment/index.tsx — ganti confirm() + flash | Frontend / UI | 🟢 Konsistensi |
| FIX-017 | enrollment/verifikasi.tsx — ganti alert() | Frontend / UI | 🟢 Konsistensi |
| FIX-018 | npm run build — verifikasi build | Frontend / Build | ✅ Verifikasi |

---

## Detail Task

---

### FIX-001 — camera.py: backend yang tepat + verifikasi frame pertama

**File:** `ta-faiz/python-service/core/camera.py`

**Masalah:** `cv2.VideoCapture(0)` tanpa backend eksplisit menggunakan Media Foundation (MSMF) di Windows. MSMF mengembalikan `isOpened() = True` **sebelum** hardware kamera benar-benar siap, sehingga:
- Terminal cetak "Started" tapi LED kamera tidak menyala
- `cap.read()` selalu return `(False, None)`
- Tidak ada frame yang diproses → tidak ada recognition

**Solusi:** Ganti seluruh isi file `camera.py` dengan kode berikut:

```python
import platform
import time
import cv2
from core.recognizer import recognize_and_report

MAX_FAIL_CONSECUTIVE = 10
RETRY_DELAY_SECONDS  = 5


def _get_camera_backend() -> int:
    """Pilih backend OpenCV yang tepat untuk OS ini."""
    system = platform.system()
    if system == "Windows":
        # DirectShow lebih andal di Windows: isOpened() tidak return True prematur
        return cv2.CAP_DSHOW
    elif system == "Linux":
        return cv2.CAP_V4L2
    return cv2.CAP_ANY


def run_camera(ruangan_id: int, sesi_info: dict, known_encodings: dict, stop_event):
    cap = None
    consecutive_fail = 0
    backend = _get_camera_backend()

    def open_camera():
        nonlocal cap
        if cap is not None:
            cap.release()
        c = cv2.VideoCapture(0, backend)
        if not c.isOpened():
            c.release()
            return False
        # Set resolusi standar
        c.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        c.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        # Verifikasi hardware benar-benar aktif dengan membaca frame pertama
        # (isOpened() bisa return True sebelum hardware siap di Windows/MSMF)
        ret, _ = c.read()
        if not ret:
            c.release()
            return False
        cap = c
        return True

    print(f"[Camera] Membuka webcam untuk ruangan {ruangan_id} (backend={backend})...")

    while not stop_event.is_set():
        if cap is None or not cap.isOpened():
            if open_camera():
                print(f"[Camera] Started untuk ruangan {ruangan_id} — hardware terverifikasi")
                consecutive_fail = 0
            else:
                print(f"[Camera] Webcam tidak bisa dibuka. Retry dalam {RETRY_DELAY_SECONDS}s...")
                time.sleep(RETRY_DELAY_SECONDS)
                continue

        ret, frame = cap.read()
        if ret:
            consecutive_fail = 0
            recognize_and_report(frame, ruangan_id, sesi_info, known_encodings)
        else:
            consecutive_fail += 1
            if consecutive_fail >= MAX_FAIL_CONSECUTIVE:
                print(f"[Camera] Gagal baca frame {consecutive_fail}x berturut-turut. "
                      f"Retry dalam {RETRY_DELAY_SECONDS}s...")
                cap.release()
                cap = None
                consecutive_fail = 0
                time.sleep(RETRY_DELAY_SECONDS)
                continue

        time.sleep(1)

    if cap is not None:
        cap.release()
    print(f"[Camera] Stopped untuk ruangan {ruangan_id}")
```

**Verifikasi:** Setelah Python service dijalankan dan ada sesi aktif, terminal harus cetak `[Camera] Started untuk ruangan X — hardware terverifikasi` dan LED kamera laptop harus menyala.

---

### FIX-002 — recognizer.py: numpy conversion + FRAME_SCALE default

**File:** `ta-faiz/python-service/core/recognizer.py`

**Masalah (dua sekaligus):**

1. `FRAME_SCALE=0.25` → frame dikecilkan ke 160×120px. Dlib HOG detector butuh minimal ~80×80px untuk wajah. Dari jarak normal di depan laptop, wajah sering tidak terdeteksi sama sekali.

2. `face_recognition.face_distance(mhs["encodings"], frame_enc)` — `mhs["encodings"]` adalah Python `list of list` yang datang dari JSON Laravel. `face_distance()` butuh numpy array. Bisa silent fail atau menghasilkan distance yang salah.

**Solusi:** Ganti seluruh isi file `recognizer.py` dengan kode berikut:

```python
import os
import time
import cv2
import numpy as np
import face_recognition
from client.laravel_client import record_absensi
from dotenv import load_dotenv

load_dotenv()

THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD_ABSENSI", "0.65"))
SCALE = float(os.getenv("FRAME_SCALE", "0.5"))  # resize 50% → ~320x240, cukup untuk deteksi wajah

_last_debug_time = 0
DEBUG_INTERVAL = 5  # print debug setiap N detik


def recognize_and_report(frame, ruangan_id: int, sesi_info: dict, known_encodings: dict):
    global _last_debug_time

    small_frame = cv2.resize(frame, (0, 0), fx=SCALE, fy=SCALE)
    small_rgb = small_frame[:, :, ::-1]  # BGR → RGB

    face_locs_small = face_recognition.face_locations(small_rgb)

    now = time.time()
    should_debug = (now - _last_debug_time) >= DEBUG_INTERVAL

    if not face_locs_small:
        if should_debug:
            mhs_count = len(known_encodings.get("mahasiswa", []))
            h, w = small_rgb.shape[:2]
            print(f"[Recognizer] Tidak ada wajah terdeteksi di frame {w}x{h}px. "
                  f"Encodings dimuat: {mhs_count} mahasiswa.")
            _last_debug_time = now
        return

    inv = 1 / SCALE
    face_locs_full = [
        (int(top * inv), int(right * inv), int(bottom * inv), int(left * inv))
        for top, right, bottom, left in face_locs_small
    ]

    rgb_full = frame[:, :, ::-1]
    frame_encs = face_recognition.face_encodings(rgb_full, face_locs_full)
    print(f"[Recognizer] {len(face_locs_full)} wajah terdeteksi, memproses...")

    for frame_enc in frame_encs:
        # Cek mahasiswa
        for mhs in known_encodings.get("mahasiswa", []):
            if not mhs.get("encodings"):
                print(f"[Recognizer] SKIP {mhs.get('nama','?')}: encodings kosong")
                continue
            # Konversi ke numpy array — data JSON dari Laravel adalah list-of-list
            known_encs = [np.array(e) for e in mhs["encodings"]]
            distances = face_recognition.face_distance(known_encs, frame_enc)
            confidence = 1 - float(min(distances))
            print(f"[Recognizer] {mhs['nama']}: conf={confidence:.2f} (threshold={THRESHOLD})")
            if confidence >= THRESHOLD:
                status_code, resp = record_absensi({
                    "nim_or_nip": mhs["nim"],
                    "type": "mahasiswa",
                    "ruangan_id": ruangan_id,
                    "sesi_id": sesi_info["sesi_id"],
                    "confidence": round(confidence, 4),
                })
                if status_code == 200:
                    print(f"[Recognizer] ✓ HADIR: {mhs['nama']} (conf={confidence:.2f}) → {resp.get('status')}")
                elif status_code == 409:
                    print(f"[Recognizer] ↩ Duplikat: {mhs['nama']} sudah tercatat hadir")
                else:
                    print(f"[Recognizer] ✗ Gagal record {mhs['nama']}: HTTP {status_code} → {resp}")

        # Cek dosen
        for dsn in known_encodings.get("dosen", []):
            if not dsn.get("encodings"):
                continue
            # Konversi ke numpy array
            known_encs = [np.array(e) for e in dsn["encodings"]]
            distances = face_recognition.face_distance(known_encs, frame_enc)
            confidence = 1 - float(min(distances))
            if confidence >= THRESHOLD:
                status_code, resp = record_absensi({
                    "nim_or_nip": dsn["nip"],
                    "type": "dosen",
                    "ruangan_id": ruangan_id,
                    "sesi_id": sesi_info["sesi_id"],
                    "confidence": round(confidence, 4),
                })
                if status_code == 200:
                    print(f"[Recognizer] ✓ HADIR dosen: {dsn['nama']} (conf={confidence:.2f})")
                elif status_code == 409:
                    print(f"[Recognizer] ↩ Duplikat dosen: {dsn['nama']} sudah tercatat")
                else:
                    print(f"[Recognizer] ✗ Gagal record dosen {dsn['nama']}: HTTP {status_code} → {resp}")
```

**Verifikasi:** Setelah ada wajah di depan kamera, log harus menampilkan nama mahasiswa beserta nilai confidence, misalnya: `[Recognizer] Nama Mahasiswa: conf=0.78 (threshold=0.65)`.

---

### FIX-003 — python-service/.env: tambah FRAME_SCALE

**File:** `ta-faiz/python-service/.env`

**Masalah:** Variabel `FRAME_SCALE` tidak ada di `.env`, sehingga nilai default dari kode (`0.25` versi lama, `0.5` versi baru) yang dipakai. Lebih baik eksplisit di `.env` agar mudah di-tune.

**Solusi:** Tambahkan baris ini di akhir file `.env` python-service:

```
FRAME_SCALE=0.5
```

File `.env` lengkapnya jadi:
```
LARAVEL_BASE_URL=http://localhost:8000
INTERNAL_API_KEY=sk-internal-absensi-dev-2026
POLL_INTERVAL_SECONDS=5
CONFIDENCE_THRESHOLD_ABSENSI=0.65
CONFIDENCE_THRESHOLD_ENROLLMENT=0.75
FRAME_SCALE=0.5
```

---

### FIX-004 — InternalController: filter mahasiswa status_akun='aktif' di encodings

**File:** `ta-faiz/Laravel/app/Http/Controllers/InternalController.php`

**Method:** `encodings()`

**Masalah:** Semua mahasiswa dengan `face_encodings` (termasuk yang `status_akun='pending_verifikasi'`) ikut dimasukkan ke recognition pool. Mahasiswa yang belum di-approve admin bisa ikut terdeteksi dan tercatat hadir.

**Solusi:** Di method `encodings()`, pada bagian pengecekan mahasiswa, tambahkan kondisi `status_akun === 'aktif'`.

Temukan baris ini:
```php
if ($mhs->face_encodings && !$mahasiswaList->contains('id', $mhs->id)) {
```

Ganti menjadi:
```php
if ($mhs->face_encodings && $mhs->status_akun === 'aktif' && !$mahasiswaList->contains('id', $mhs->id)) {
```

---

### FIX-005 — InternalController: verifikasi mahasiswa ∈ kelas sesi di recordAbsensi

**File:** `ta-faiz/Laravel/app/Http/Controllers/InternalController.php`

**Method:** `recordAbsensi()`

**Masalah:** Saat Python mengirim NIM untuk dicatat hadir, controller tidak memverifikasi bahwa mahasiswa tersebut memang terdaftar di kelas yang jadwalnya sedang berlangsung di sesi ini. Jika terjadi false positive recognition, mahasiswa dari kelas lain bisa tercatat hadir.

**Solusi:** Setelah baris menemukan `$mhs`, tambahkan pengecekan kelas sebelum pencatatan hadir.

Temukan blok ini di bagian `if ($request->type === 'mahasiswa')`:
```php
$mhs = Mahasiswa::where('nim', $request->nim_or_nip)->first();
if (!$mhs) return response()->json(['status' => 'not_found'], 404);

// Cek duplikat
```

Ganti menjadi:
```php
$mhs = Mahasiswa::where('nim', $request->nim_or_nip)->first();
if (!$mhs) return response()->json(['status' => 'not_found'], 404);

// Verifikasi mahasiswa terdaftar di kelas yang sesuai dengan sesi ini
if ($mhs->kelas_id !== $sesi->jadwal->kelas_id) {
    return response()->json(['status' => 'not_in_class'], 403);
}

// Cek duplikat
```

Pastikan relasi `jadwal` sudah di-load. Cek baris `->with('jadwal')` pada query `$sesi`. Jika belum ada `kelas_id` di eager load, ubah query `$sesi` menjadi:
```php
$sesi = SesiAbsensi::where('id', $request->sesi_id)
    ->where('status', 'berlangsung')
    ->with('jadwal')
    ->first();
```
Relasi `jadwal` sudah ada, `kelas_id` adalah kolom langsung di tabel `jadwal` sehingga tidak perlu eager load tambahan.

---

### FIX-006 — Hapus migration duplikat institusi

**File yang dihapus:** `ta-faiz/Laravel/database/migrations/2026_05_31_070031_create_institusis_table.php`

**Masalah:** Ada dua migration untuk institusi:
- `2026_05_30_193715_create_institusi_table.php` → benar, tabel `institusi` dengan kolom lengkap
- `2026_05_31_070031_create_institusis_table.php` → stub kosong, tabel `institusis` (nama salah, plural tidak konsisten, hanya `id` + `timestamps`)

Tabel `institusis` tidak dipakai siapapun dan hanya membingungkan saat `migrate:fresh`.

**Solusi:** Hapus file `2026_05_31_070031_create_institusis_table.php`.

```bash
rm ta-faiz/Laravel/database/migrations/2026_05_31_070031_create_institusis_table.php
```

**Verifikasi:** Jalankan `php artisan migrate:status` dan pastikan tidak ada migration untuk tabel `institusis`.

---

### FIX-007 — Buat komponen ConfirmDialog

**File baru:** `ta-faiz/Laravel/resources/js/components/confirm-dialog.tsx`

**Masalah:** Seluruh halaman CRUD menggunakan `window.confirm()` (popup browser native) untuk konfirmasi hapus, sementara halaman `keterangan/admin.tsx` sudah menggunakan `AlertDialog` dari shadcn. Ini inkonsistensi visual dan UX — `confirm()` tidak bisa di-style, tidak match dengan design system.

**Solusi:** Buat file baru `confirm-dialog.tsx` sebagai shared component:

```tsx
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { type ReactNode } from 'react';

interface ConfirmDialogProps {
    title?: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    trigger?: ReactNode;
    disabled?: boolean;
}

export function ConfirmDialog({
    title = 'Yakin ingin menghapus?',
    description,
    confirmLabel = 'Ya, Hapus',
    onConfirm,
    trigger,
    disabled = false,
}: ConfirmDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {trigger ?? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-red-50 hover:text-red-600"
                        disabled={disabled}
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
```

**Catatan:** Komponen ini dipakai oleh FIX-008 sampai FIX-016. Selesaikan FIX-007 sebelum task lainnya.

---

### FIX-008 — institusi/index.tsx: ganti confirm() dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/institusi/index.tsx`

**Perubahan:**
1. Tambah import: `import { ConfirmDialog } from '@/components/confirm-dialog';`
2. Hapus import `Trash2` dari lucide-react (tidak dipakai lagi)
3. Hapus fungsi `handleDelete(id)`
4. Ganti tombol hapus:

Dari:
```tsx
<Button variant="outline" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(item.id)}>
    <Trash2 className="size-3.5" />
</Button>
```

Menjadi:
```tsx
<ConfirmDialog
    description="Data institusi ini akan dihapus permanen beserta seluruh data jurusan di bawahnya."
    onConfirm={() => router.delete(`/institusi/${item.id}`)}
/>
```

---

### FIX-009 — jurusan/index.tsx: ganti confirm() dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/jurusan/index.tsx`

**Perubahan:**
1. Tambah import: `import { ConfirmDialog } from '@/components/confirm-dialog';`
2. Hapus import `Trash2` dari lucide-react
3. Hapus fungsi `handleDelete(id)`
4. Ganti tombol hapus:

```tsx
<ConfirmDialog
    description="Data jurusan ini akan dihapus permanen beserta seluruh prodi dan ruangan di bawahnya."
    onConfirm={() => router.delete(`/jurusan/${item.id}`)}
/>
```

---

### FIX-010 — prodi/index.tsx: ganti confirm() dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/prodi/index.tsx`

**Perubahan:**
1. Tambah import: `import { ConfirmDialog } from '@/components/confirm-dialog';`
2. Hapus import `Trash2` dari lucide-react
3. Ganti tombol hapus inline:

Dari:
```tsx
<Button variant="outline" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => { if (confirm('Hapus prodi ini?')) router.delete(`/prodi/${item.id}`); }}>
    <Trash2 className="size-3.5" />
</Button>
```

Menjadi:
```tsx
<ConfirmDialog
    description="Data prodi ini akan dihapus permanen."
    onConfirm={() => router.delete(`/prodi/${item.id}`)}
/>
```

---

### FIX-011 — ruangan/index.tsx: ganti confirm() dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/ruangan/index.tsx`

**Perubahan:**
1. Tambah import: `import { ConfirmDialog } from '@/components/confirm-dialog';`
2. Hapus import `Trash2` dari lucide-react
3. Ganti tombol hapus inline:

```tsx
<ConfirmDialog
    description="Data ruangan ini akan dihapus permanen."
    onConfirm={() => router.delete(`/ruangan/${item.id}`)}
/>
```

---

### FIX-012 — kelas/index.tsx: ganti confirm() dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/kelas/index.tsx`

**Perubahan:**
1. Tambah import: `import { ConfirmDialog } from '@/components/confirm-dialog';`
2. Hapus import `Trash2` dari lucide-react
3. Ganti tombol hapus inline:

```tsx
<ConfirmDialog
    description="Data kelas ini akan dihapus permanen beserta seluruh data mahasiswa di dalamnya."
    onConfirm={() => router.delete(`/kelas/${item.id}`)}
/>
```

---

### FIX-013 — dosen/index.tsx: ganti confirm() dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/dosen/index.tsx`

**Perubahan:**
1. Tambah import: `import { ConfirmDialog } from '@/components/confirm-dialog';`
2. Hapus import `Trash2` dari lucide-react
3. Ganti tombol hapus:

```tsx
<ConfirmDialog
    description="Data dosen ini akan dihapus permanen."
    onConfirm={() => router.delete(`/dosen/${item.id}`)}
/>
```

---

### FIX-014 — mahasiswa/index.tsx: ganti confirm() dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/mahasiswa/index.tsx`

**Perubahan:**
1. Tambah import: `import { ConfirmDialog } from '@/components/confirm-dialog';`
2. Hapus import `Trash2` dari lucide-react
3. Ganti tombol hapus:

```tsx
<ConfirmDialog
    description="Data mahasiswa dan akun login-nya akan dihapus permanen."
    onConfirm={() => router.delete(`/mahasiswa/${item.id}`)}
/>
```

---

### FIX-015 — jadwal/index.tsx: ganti confirm() dengan ConfirmDialog

**File:** `ta-faiz/Laravel/resources/js/pages/jadwal/index.tsx`

**Perubahan:**
1. Tambah import: `import { ConfirmDialog } from '@/components/confirm-dialog';`
2. Hapus import `Trash2` dari lucide-react
3. Ganti tombol hapus:

```tsx
<ConfirmDialog
    description="Jadwal ini akan dihapus permanen. Sesi absensi yang sudah berjalan tidak terpengaruh."
    onConfirm={() => router.delete(`/jadwal/${item.id}`)}
/>
```

---

### FIX-016 — enrollment/index.tsx: tiga perbaikan sekaligus

**File:** `ta-faiz/Laravel/resources/js/pages/enrollment/index.tsx`

**Masalah (tiga sekaligus):**
1. Fungsi `handleReset()` menggunakan `confirm()` browser native
2. Halaman tidak menerima `flash` prop → tidak ada toast setelah reset/approve berhasil
3. Tidak ada `useEffect` untuk menampilkan flash message

**Perubahan:**

**a) Import — tambahkan/ubah:**
```tsx
import { ConfirmDialog } from '@/components/confirm-dialog';
// tambah useEffect di import dari 'react'
import { useEffect, useRef, useState } from 'react';
```

**b) Props interface — tambahkan `flash`:**
```tsx
interface Props {
    mahasiswa: { data: MahasiswaWithCount[]; links: any[] };
    kelas: Kelas[];
    filters: { kelas_id?: string };
    flash?: { success?: string; error?: string };  // ← tambahkan baris ini
}
```

**c) Di dalam component — tambahkan state dan useEffect:**
```tsx
export default function EnrollmentIndex({ mahasiswa, kelas, filters, flash }: Props) {
    const [uploadTarget, setUploadTarget] = useState<Mahasiswa | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadForm = useForm<{ foto: File[] }>({ foto: [] });
    const [shownMessages] = useState(new Set<string>());  // ← tambah

    // ← tambah useEffect ini
    useEffect(() => {
        if (flash?.success && !shownMessages.has(flash.success)) {
            toast.success(flash.success);
            shownMessages.add(flash.success);
        }
        if (flash?.error && !shownMessages.has(flash.error)) {
            toast.error(flash.error);
            shownMessages.add(flash.error);
        }
    }, [flash?.success, flash?.error]);
```

**d) Hapus fungsi `handleReset()`** (seluruh fungsi dari baris `function handleReset` sampai penutup `}`)

**e) Ganti tombol Reset di tabel:**

Dari:
```tsx
<Button size="sm" variant="outline"
    className="hover:bg-red-50 hover:text-red-600"
    onClick={() => handleReset(mhs.id)}>
    <RotateCcw className="size-3.5 mr-1" /> Reset
</Button>
```

Menjadi:
```tsx
<ConfirmDialog
    title="Reset Enrollment?"
    description="Semua foto dan encoding wajah mahasiswa ini akan dihapus. Mahasiswa harus mengulang proses enrollment dari awal."
    confirmLabel="Ya, Reset"
    onConfirm={() => router.delete(`/enrollment/${mhs.id}/reset`)}
    trigger={
        <Button size="sm" variant="outline"
            className="hover:bg-red-50 hover:text-red-600">
            <RotateCcw className="size-3.5 mr-1" /> Reset
        </Button>
    }
/>
```

---

### FIX-017 — enrollment/verifikasi.tsx: ganti alert() dengan toast.error()

**File:** `ta-faiz/Laravel/resources/js/pages/enrollment/verifikasi.tsx`

**Masalah:** Di `captureAndVerify()`, error handler menggunakan `alert()` browser native, sementara `self-verify.tsx` sudah menggunakan `toast.error()` dari sonner. Inkonsistensi visual dan UX.

**Perubahan:**

**a) Tambah import sonner** (di bagian import, setelah import lainnya):
```tsx
import { toast } from 'sonner';
```

**b) Di catch block di `captureAndVerify()`, ganti:**

Dari:
```tsx
} catch (err: any) {
    const msg = err.response?.data?.message ?? 'Gagal menghubungi server.';
    alert('Error: ' + msg);
    setHasil(prev => ({ ...prev, [jarak]: { ...prev[jarak], loading: false } }));
}
```

Menjadi:
```tsx
} catch (err: any) {
    const msg = err.response?.data?.message ?? 'Gagal menghubungi server.';
    toast.error(msg);
    setHasil(prev => ({ ...prev, [jarak]: { ...prev[jarak], loading: false } }));
}
```

---

### FIX-018 — npm run build: verifikasi semua perubahan frontend

**Setelah FIX-007 sampai FIX-017 selesai, jalankan:**

```bash
cd ta-faiz/Laravel
npm run build
```

Build harus selesai tanpa error TypeScript. Jika ada error:
- `Cannot find module '@/components/confirm-dialog'` → cek FIX-007 sudah dibuat
- `Property 'flash' does not exist on type 'Props'` → cek FIX-016 perubahan interface
- Import `Trash2` yang tidak dipakai → hapus dari lucide-react import di file yang bersangkutan

---

## Urutan Eksekusi yang Direkomendasikan

```
FIX-001 → FIX-002 → FIX-003   (Python — paling kritis, kerjakan dulu)
FIX-004 → FIX-005 → FIX-006   (Laravel backend)
FIX-007                         (buat komponen dulu sebelum FIX-008 dst)
FIX-008 → FIX-009 → FIX-010 → FIX-011 → FIX-012 → FIX-013 → FIX-014 → FIX-015 → FIX-016 → FIX-017
FIX-018                         (build verifikasi, terakhir)
```

## Cara Test Setelah Semua Fix

1. **Python kritis (FIX-001, 002, 003):**
   - Jalankan `python main.py` di folder `python-service`
   - Buka Laravel, buat jadwal untuk hari ini dengan jam yang sedang berlangsung
   - Python terminal harus print: `[Camera] Started ... hardware terverifikasi` **dan** LED kamera laptop harus menyala
   - Hadapkan wajah mahasiswa yang sudah enrollment aktif → harus muncul: `[Recognizer] Nama: conf=X.XX`

2. **Frontend (FIX-007 sampai FIX-018):**
   - Buka halaman Dosen, klik tombol hapus → harus muncul dialog shadcn (bukan popup browser)
   - Buka halaman Enrollment, klik Reset → harus muncul dialog dengan judul "Reset Enrollment?"
   - Setelah approve/reset, harus muncul toast notification

<?php

use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\KeteranganController;
use App\Http\Controllers\LaporanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\EnrollmentDosenController;
use App\Http\Controllers\KoreksiAbsensiDosenController;
use App\Http\Controllers\InstitusiController;
use App\Http\Controllers\JurusanController;
use App\Http\Controllers\DosenController;
use App\Http\Controllers\JadwalController;
use App\Http\Controllers\KelasController;
use App\Http\Controllers\MahasiswaController;
use App\Http\Controllers\ProdiController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\RuanganController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('users', UserController::class);
    Route::resource('roles', RoleController::class);

    Route::resource('institusi', InstitusiController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('jurusan', JurusanController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('prodi', ProdiController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('ruangan', RuanganController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('kelas', KelasController::class)->only(['index', 'store', 'update', 'destroy'])->parameters(['kelas' => 'kelas']);
    Route::resource('dosen', DosenController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('mahasiswa', MahasiswaController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('jadwal', JadwalController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::get('absensi', [AbsensiController::class, 'index'])->name('absensi.index');

    Route::prefix('laporan')->name('laporan.')->group(function () {
        Route::get('/', [LaporanController::class, 'index'])->name('index');
        Route::get('/mahasiswa/{mahasiswa}', [LaporanController::class, 'mahasiswa'])->name('mahasiswa');
        Route::get('/export/pdf', [LaporanController::class, 'exportPdf'])->name('export.pdf');
        Route::get('/export/excel', [LaporanController::class, 'exportExcel'])->name('export.excel');
    });

    Route::prefix('keterangan')->name('keterangan.')->group(function () {
        Route::get('/', [KeteranganController::class, 'index'])->name('index');
        Route::post('/', [KeteranganController::class, 'store'])->name('store');
        Route::get('/admin', [KeteranganController::class, 'admin'])->name('admin');
        Route::get('/{keterangan}/bukti', [KeteranganController::class, 'bukti'])->name('bukti');
        Route::patch('/{keterangan}/approve', [KeteranganController::class, 'approve'])->name('approve');
        Route::patch('/{keterangan}/reject', [KeteranganController::class, 'reject'])->name('reject');
    });

    // Mahasiswa self-enrollment (tidak butuh permission enrollment index)
    Route::get('/enrollment/self-upload', [EnrollmentController::class, 'selfUploadPage'])->name('enrollment.self-upload');
    Route::post('/enrollment/self-upload', [EnrollmentController::class, 'selfUpload'])->name('enrollment.self-upload.store');
    Route::get('/enrollment/self-verify', [EnrollmentController::class, 'selfVerifyPage'])->name('enrollment.self-verify');
    Route::post('/enrollment/self-verify/frame', [EnrollmentController::class, 'selfVerifyFrame'])->name('enrollment.self-verify.frame');

    Route::prefix('enrollment')->name('enrollment.')->middleware('can:enrollment index')->group(function () {
        Route::get('/', [EnrollmentController::class, 'index'])->name('index');
        Route::get('{mahasiswa}/verifikasi', [EnrollmentController::class, 'verifikasi'])->name('verifikasi');
        Route::get('{mahasiswa}/status', [EnrollmentController::class, 'status'])->name('status');
        Route::post('{mahasiswa}/upload-foto', [EnrollmentController::class, 'uploadFoto'])->name('upload-foto');
        Route::post('{mahasiswa}/verify-frame', [EnrollmentController::class, 'verifyFrame'])->name('verify-frame');
        Route::patch('{mahasiswa}/approve', [EnrollmentController::class, 'approve'])->name('approve');
        Route::delete('{mahasiswa}/reset', [EnrollmentController::class, 'reset'])->name('reset');
    });
    // Enrollment Dosen (dosen melakukan sendiri)
    Route::middleware('can:enrollment_dosen index')->prefix('enrollment-dosen')->name('enrollment-dosen.')->group(function () {
        Route::get('/', [EnrollmentDosenController::class, 'index'])->name('index');
        Route::post('/upload-foto', [EnrollmentDosenController::class, 'uploadFoto'])->name('upload');
        Route::get('/verifikasi', [EnrollmentDosenController::class, 'verifikasi'])->name('verifikasi');
        Route::post('/verify-frame', [EnrollmentDosenController::class, 'verifyFrame'])->name('verify-frame');
        Route::delete('/reset', [EnrollmentDosenController::class, 'reset'])->name('reset');
        Route::get('/status', [EnrollmentDosenController::class, 'status'])->name('status');
    });

    // Koreksi Absensi Dosen (dosen submit)
    Route::middleware('can:koreksi_dosen create')->prefix('koreksi-dosen')->name('koreksi-dosen.')->group(function () {
        Route::get('/', [KoreksiAbsensiDosenController::class, 'index'])->name('index');
        Route::post('/', [KoreksiAbsensiDosenController::class, 'store'])->name('store');
    });

    // Koreksi Absensi Dosen (admin review)
    Route::middleware('can:koreksi_dosen approve')->prefix('koreksi-dosen/admin')->name('koreksi-dosen.')->group(function () {
        Route::get('/', [KoreksiAbsensiDosenController::class, 'adminIndex'])->name('admin');
        Route::patch('/{koreksi}/approve', [KoreksiAbsensiDosenController::class, 'approve'])->name('approve');
        Route::patch('/{koreksi}/reject', [KoreksiAbsensiDosenController::class, 'reject'])->name('reject');
        Route::get('/{koreksi}/bukti', [KoreksiAbsensiDosenController::class, 'bukti'])->name('bukti');
    });
});

require __DIR__ . '/settings.php';

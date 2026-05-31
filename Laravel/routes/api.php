<?php

use App\Http\Controllers\InternalController;
use Illuminate\Support\Facades\Route;

Route::middleware('internal.key')->prefix('internal')->group(function () {
    Route::get('/health', fn() => response()->json(['status' => 'ok']));

    Route::get('/sesi-aktif', [InternalController::class, 'sesiAktif']);
    Route::get('/encodings/{ruangan}', [InternalController::class, 'encodings']);
    Route::post('/absensi/record', [InternalController::class, 'recordAbsensi']);
});

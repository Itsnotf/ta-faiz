<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('keterangan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('absensi_mahasiswa_id')->constrained('absensi_mahasiswa')->cascadeOnDelete();
            $table->foreignId('mahasiswa_id')->constrained('mahasiswa')->cascadeOnDelete();
            $table->enum('jenis', ['izin', 'sakit']);
            $table->text('keterangan');
            $table->string('file_bukti');
            $table->enum('diajukan_oleh', ['mahasiswa', 'admin']);
            $table->enum('status_keterangan', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('disetujui_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('keterangan');
    }
};

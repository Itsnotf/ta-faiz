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
        Schema::create('mahasiswa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('kelas_id')->constrained('kelas')->cascadeOnDelete();
            $table->string('nim')->unique();
            $table->string('nama');
            $table->json('foto_paths')->nullable();
            $table->json('face_encodings')->nullable();
            $table->float('enrollment_score')->nullable();
            $table->enum('status_akun', ['pending_upload', 'pending_verifikasi', 'aktif'])->default('pending_upload');
            $table->timestamp('foto_verified_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mahasiswa');
    }
};

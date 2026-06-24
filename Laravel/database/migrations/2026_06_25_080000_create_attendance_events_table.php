<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_id')->nullable()->constrained('sesi_absensi')->nullOnDelete();
            $table->enum('person_type', ['mahasiswa', 'dosen']);
            $table->unsignedBigInteger('person_id')->nullable();
            $table->string('nim_or_nip_raw');
            $table->unsignedBigInteger('ruangan_id_reported')->nullable();
            $table->float('confidence');
            $table->enum('decision', ['accepted', 'rejected']);
            $table->string('reject_reason')->nullable();
            $table->timestamp('detected_at');
            $table->timestamps();

            $table->index(['sesi_id', 'person_type', 'person_id', 'detected_at'], 'ae_sesi_person_detected_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_events');
    }
};

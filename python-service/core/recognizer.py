import os
import time
import cv2
import face_recognition
from client.laravel_client import record_absensi
from dotenv import load_dotenv

load_dotenv()

THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD_ABSENSI", "0.65"))
SCALE = float(os.getenv("FRAME_SCALE", "0.25"))  # resize 25% untuk deteksi cepat

_last_debug_time = 0
DEBUG_INTERVAL = 5  # print debug setiap N detik agar tidak spam


def recognize_and_report(frame, ruangan_id: int, sesi_info: dict, known_encodings: dict):
    global _last_debug_time

    # Resize frame kecil untuk face_locations (jauh lebih cepat di CPU)
    small_frame = cv2.resize(frame, (0, 0), fx=SCALE, fy=SCALE)
    small_rgb = small_frame[:, :, ::-1]  # BGR → RGB

    face_locs_small = face_recognition.face_locations(small_rgb)

    now = time.time()
    should_debug = (now - _last_debug_time) >= DEBUG_INTERVAL

    if not face_locs_small:
        if should_debug:
            mhs_count = len(known_encodings.get("mahasiswa", []))
            print(f"[Recognizer] Tidak ada wajah terdeteksi di frame. "
                  f"Encodings dimuat: {mhs_count} mahasiswa.")
            _last_debug_time = now
        return

    # Scale lokasi wajah kembali ke resolusi asli untuk face_encodings
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
            distances = face_recognition.face_distance(mhs["encodings"], frame_enc)
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
            distances = face_recognition.face_distance(dsn["encodings"], frame_enc)
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

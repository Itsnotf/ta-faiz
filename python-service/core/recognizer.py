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


def recognize_and_report(frame, ruangan_id: int, sesi_info: dict, known_encodings: dict, recorded: set):
    global _last_debug_time

    small_frame = cv2.resize(frame, (0, 0), fx=SCALE, fy=SCALE)
    small_rgb = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

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

    rgb_full = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    frame_encs = face_recognition.face_encodings(rgb_full, face_locs_full)
    print(f"[Recognizer] {len(face_locs_full)} wajah terdeteksi, memproses...")

    for frame_enc in frame_encs:
        # Cek mahasiswa
        for mhs in known_encodings.get("mahasiswa", []):
            if mhs["nim"] in recorded:
                continue
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
                    recorded.add(mhs["nim"])
                    print(f"[Recognizer] ✓ HADIR: {mhs['nama']} (conf={confidence:.2f}) → {resp.get('status')}")
                else:
                    print(f"[Recognizer] ✗ Gagal record {mhs['nama']}: HTTP {status_code} → {resp}")

        # Cek dosen
        for dsn in known_encodings.get("dosen", []):
            if dsn["nip"] in recorded:
                continue
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
                    recorded.add(dsn["nip"])
                    print(f"[Recognizer] ✓ HADIR dosen: {dsn['nama']} (conf={confidence:.2f})")
                else:
                    print(f"[Recognizer] ✗ Gagal record dosen {dsn['nama']}: HTTP {status_code} → {resp}")

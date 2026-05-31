import threading
import time
import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from client.laravel_client import get_sesi_aktif, get_encodings

load_dotenv()

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "5"))
WIB = timezone(timedelta(hours=7))

active_sessions: dict = {}


def parse_datetime(dt_str: str) -> datetime:
    if not dt_str:
        return None
    if dt_str.endswith("Z"):
        dt_str = dt_str[:-1] + "+00:00"
    return datetime.fromisoformat(dt_str)


def selesai_at_from_sesi(sesi: dict) -> datetime | None:
    """Hitung waktu selesai: pakai selesai_at jika ada, fallback ke tanggal+jam_selesai (WIB)."""
    if sesi.get("selesai_at"):
        return parse_datetime(sesi["selesai_at"])

    tanggal = sesi.get("tanggal")
    jam_selesai = sesi.get("jam_selesai")
    if tanggal and jam_selesai:
        dt_wib = datetime.fromisoformat(f"{tanggal}T{jam_selesai}:00").replace(tzinfo=WIB)
        return dt_wib.astimezone(timezone.utc)

    return None


def run():
    from core.camera import run_camera

    print("[SessionRunner] Polling dimulai...")

    while True:
        try:
            data = get_sesi_aktif()
            sesi_list = data.get("sesi_aktif", [])

            # Ruangan yang masih aktif dari server
            active_ruangan_ids = {s["ruangan_id"] for s in sesi_list}

            # ── Mulai sesi baru ──────────────────────────────────
            now_utc = datetime.now(timezone.utc)
            for sesi in sesi_list:
                rid = sesi["ruangan_id"]
                if rid not in active_sessions:
                    # Jangan mulai jika jam_selesai sudah lewat
                    waktu_selesai = selesai_at_from_sesi(sesi)
                    if waktu_selesai and now_utc >= waktu_selesai:
                        print(f"[SessionRunner] Sesi diabaikan (ruangan_id={rid}): jam_selesai sudah lewat, tunggu BatchAlpaJob")
                        continue

                    encs = get_encodings(rid)
                    stop_event = threading.Event()
                    t = threading.Thread(
                        target=run_camera,
                        args=(rid, sesi, encs, stop_event),
                        daemon=True,
                    )
                    t.start()
                    active_sessions[rid] = {"thread": t, "stop": stop_event, "sesi": sesi}
                    print(f"[SessionRunner] Sesi dimulai: ruangan_id={rid}")

            # ── Hentikan sesi yang sudah selesai ─────────────────
            for rid in list(active_sessions.keys()):
                stop = False
                reason = ""

                # 1. Sesi sudah hilang dari daftar aktif (BatchAlpaJob sudah jalan)
                if rid not in active_ruangan_ids:
                    stop = True
                    reason = "tidak ada di sesi_aktif"

                # 2. Waktu selesai sudah lewat (fallback jika server belum update)
                if not stop:
                    waktu_selesai = selesai_at_from_sesi(active_sessions[rid]["sesi"])
                    if waktu_selesai and now_utc >= waktu_selesai:
                        stop = True
                        reason = "jam_selesai terlewat"

                if stop:
                    active_sessions[rid]["stop"].set()
                    del active_sessions[rid]
                    print(f"[SessionRunner] Sesi dihentikan (ruangan_id={rid}): {reason}")

        except Exception as e:
            print(f"[SessionRunner] Error: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()

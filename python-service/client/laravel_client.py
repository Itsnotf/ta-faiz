import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("LARAVEL_BASE_URL", "http://localhost:8000")
API_KEY  = os.getenv("INTERNAL_API_KEY", "")

HEADERS = {
    "X-Internal-Key": API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json",
}


def get_sesi_aktif() -> dict:
    resp = requests.get(f"{BASE_URL}/api/internal/sesi-aktif", headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()


def get_encodings(ruangan_id: int) -> dict:
    resp = requests.get(f"{BASE_URL}/api/internal/encodings/{ruangan_id}", headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()


def record_absensi(payload: dict) -> tuple[int, dict]:
    resp = requests.post(f"{BASE_URL}/api/internal/absensi/record", json=payload, headers=HEADERS, timeout=10)
    # 409 = duplicate, bukan error fatal
    return resp.status_code, resp.json()

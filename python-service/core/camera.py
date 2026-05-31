import time
import cv2
from core.recognizer import recognize_and_report

MAX_FAIL_CONSECUTIVE = 10   # berapa kali gagal grab berturut-turut sebelum retry open
RETRY_DELAY_SECONDS  = 5    # jeda sebelum coba buka ulang kamera


def run_camera(ruangan_id: int, sesi_info: dict, known_encodings: dict, stop_event):
    cap = None
    consecutive_fail = 0

    def open_camera():
        nonlocal cap
        if cap is not None:
            cap.release()
        c = cv2.VideoCapture(0)
        if c.isOpened():
            cap = c
            return True
        c.release()
        return False

    print(f"[Camera] Membuka webcam untuk ruangan {ruangan_id}...")

    while not stop_event.is_set():
        # Buka kamera jika belum terbuka
        if cap is None or not cap.isOpened():
            if open_camera():
                print(f"[Camera] Started untuk ruangan {ruangan_id}")
                consecutive_fail = 0
            else:
                print(f"[Camera] Webcam tidak bisa dibuka (mungkin dipakai aplikasi lain). Retry dalam {RETRY_DELAY_SECONDS}s...")
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
                      f"Pastikan tidak ada aplikasi lain yang memakai kamera. Retry dalam {RETRY_DELAY_SECONDS}s...")
                cap.release()
                cap = None
                consecutive_fail = 0
                time.sleep(RETRY_DELAY_SECONDS)
                continue

        time.sleep(1)

    if cap is not None:
        cap.release()
    print(f"[Camera] Stopped untuk ruangan {ruangan_id}")

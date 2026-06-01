import platform
import time
import cv2
from core.recognizer import recognize_and_report

MAX_FAIL_CONSECUTIVE = 10
RETRY_DELAY_SECONDS  = 5


def _get_camera_backend() -> int:
    """Pilih backend OpenCV yang tepat untuk OS ini."""
    system = platform.system()
    if system == "Windows":
        # DirectShow lebih andal di Windows: isOpened() tidak return True prematur
        return cv2.CAP_DSHOW
    elif system == "Linux":
        return cv2.CAP_V4L2
    return cv2.CAP_ANY


def run_camera(ruangan_id: int, sesi_info: dict, known_encodings: dict, stop_event):
    cap = None
    consecutive_fail = 0
    backend = _get_camera_backend()

    def open_camera():
        nonlocal cap
        if cap is not None:
            cap.release()
        c = cv2.VideoCapture(0, backend)
        if not c.isOpened():
            c.release()
            return False
        # Set resolusi standar
        c.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        c.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        # Verifikasi hardware benar-benar aktif dengan membaca frame pertama
        # (isOpened() bisa return True sebelum hardware siap di Windows/MSMF)
        ret, _ = c.read()
        if not ret:
            c.release()
            return False
        cap = c
        return True

    print(f"[Camera] Membuka webcam untuk ruangan {ruangan_id} (backend={backend})...")

    # Set NIM/NIP yang sudah tercatat hadir di sesi ini — di-skip di frame berikutnya
    recorded: set[str] = set()

    while not stop_event.is_set():
        if cap is None or not cap.isOpened():
            if open_camera():
                print(f"[Camera] Started untuk ruangan {ruangan_id} — hardware terverifikasi")
                consecutive_fail = 0
            else:
                print(f"[Camera] Webcam tidak bisa dibuka. Retry dalam {RETRY_DELAY_SECONDS}s...")
                time.sleep(RETRY_DELAY_SECONDS)
                continue

        ret, frame = cap.read()
        if ret:
            consecutive_fail = 0
            recognize_and_report(frame, ruangan_id, sesi_info, known_encodings, recorded)
        else:
            consecutive_fail += 1
            if consecutive_fail >= MAX_FAIL_CONSECUTIVE:
                print(f"[Camera] Gagal baca frame {consecutive_fail}x berturut-turut. "
                      f"Retry dalam {RETRY_DELAY_SECONDS}s...")
                cap.release()
                cap = None
                consecutive_fail = 0
                time.sleep(RETRY_DELAY_SECONDS)
                continue

        time.sleep(1)

    if cap is not None:
        cap.release()
    print(f"[Camera] Stopped untuk ruangan {ruangan_id}")

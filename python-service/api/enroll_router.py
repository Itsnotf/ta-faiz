import base64
import io
import os
from typing import List

import face_recognition
import numpy as np
from dotenv import load_dotenv
from fastapi import APIRouter
from PIL import Image
from pydantic import BaseModel

load_dotenv()

THRESHOLD_ENROLLMENT = float(os.getenv("CONFIDENCE_THRESHOLD_ENROLLMENT", "0.90"))

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────────────────

def base64_to_numpy(b64_str: str) -> np.ndarray:
    """Decode base64 image string → RGB numpy array."""
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    raw = base64.b64decode(b64_str)
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return np.array(img)


# ── schemas ───────────────────────────────────────────────────────────────────

class GenerateEncodingRequest(BaseModel):
    foto_list: List[str]  # list base64 string (5 foto)


class VerifyFrameRequest(BaseModel):
    frame_base64: str
    known_encodings: List[List[float]]
    jarak: str
    threshold: float = THRESHOLD_ENROLLMENT


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/generate-encoding")
def generate_encoding(req: GenerateEncodingRequest):
    """
    Input : {"foto_list": ["base64", ...]}  — 5 foto wajah
    Output: {"encodings": [[128 floats], ...], "count": 5}
    """
    encodings = []

    for idx, b64 in enumerate(req.foto_list):
        try:
            img = base64_to_numpy(b64)
        except Exception as e:
            return {"error": "decode_failed", "foto_index": idx, "detail": str(e)}

        encs = face_recognition.face_encodings(img)
        if not encs:
            return {"error": "no_face", "foto_index": idx}

        encodings.append(encs[0].tolist())

    return {"encodings": encodings, "count": len(encodings)}


@router.post("/verify-frame")
def verify_frame(req: VerifyFrameRequest):
    """
    Input : {"frame_base64": "...", "known_encodings": [[...], ...], "jarak": "dekat", "threshold": 0.90}
    Output: {"confidence": 0.94, "lulus": true, "threshold": 0.90, "jarak": "dekat"}
    """
    try:
        frame = base64_to_numpy(req.frame_base64)
    except Exception as e:
        return {"confidence": 0.0, "lulus": False, "error": "decode_failed", "detail": str(e)}

    frame_encs = face_recognition.face_encodings(frame)
    if not frame_encs:
        return {"confidence": 0.0, "lulus": False, "error": "no_face",
                "threshold": req.threshold, "jarak": req.jarak}

    frame_enc = frame_encs[0]
    known = [np.array(e) for e in req.known_encodings]
    distances = face_recognition.face_distance(known, frame_enc)
    confidence = float(1 - min(distances))
    lulus = confidence >= req.threshold

    return {
        "confidence": round(confidence, 4),
        "lulus": lulus,
        "threshold": req.threshold,
        "jarak": req.jarak,
    }

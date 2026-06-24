import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Mahasiswa } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    mahasiswa: Mahasiswa;
    jarak_lulus: string[];
}

type Jarak = 'dekat' | 'sedang' | 'jauh';
const JARAK_LIST: Jarak[] = ['dekat', 'sedang', 'jauh'];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Verifikasi Wajah', href: '#' },
];

interface HasilJarak {
    confidence: number | null;
    lulus: boolean | null;
    loading: boolean;
}

const PANDUAN: Record<Jarak, string> = {
    dekat:  'Duduk sedekat mungkin dengan kamera (±30 cm)',
    sedang: 'Duduk dengan jarak normal dari kamera (±60 cm)',
    jauh:   'Mundur agak jauh dari kamera (±100 cm)',
};

export default function SelfVerifyPage({ mahasiswa, jarak_lulus }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [streamReady, setStreamReady] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [hasil, setHasil] = useState<Record<Jarak, HasilJarak>>({
        dekat:  { confidence: null, lulus: jarak_lulus.includes('dekat'),  loading: false },
        sedang: { confidence: null, lulus: jarak_lulus.includes('sedang'), loading: false },
        jauh:   { confidence: null, lulus: jarak_lulus.includes('jauh'),   loading: false },
    });
    const [semuaLulus, setSemuaLulus] = useState(jarak_lulus.length >= 3);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setStreamReady(true);
                }
            })
            .catch(err => setStreamError('Tidak bisa membuka kamera: ' + err.message));

        return () => {
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    async function captureAndVerify(jarak: Jarak) {
        if (!videoRef.current || !streamReady) return;

        setHasil(prev => ({ ...prev, [jarak]: { ...prev[jarak], loading: true } }));

        const canvas = document.createElement('canvas');
        canvas.width  = videoRef.current.videoWidth  || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.8);

        try {
            const res = await axios.post('/enrollment/self-verify/frame', {
                frame_base64: frameBase64,
                jarak,
            });
            const data = res.data;

            setHasil(prev => ({
                ...prev,
                [jarak]: { confidence: data.confidence, lulus: data.lulus, loading: false },
            }));

            if (data.lulus) {
                toast.success(`Jarak ${jarak} berhasil diverifikasi!`);
            } else {
                toast.error(`Wajah tidak terdeteksi di jarak ${jarak}. Coba lagi.`);
            }

            if (data.semua_jarak_lulus) {
                setSemuaLulus(true);
                toast.success('Semua jarak lulus! Menunggu persetujuan admin.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message ?? 'Gagal menghubungi server.';
            toast.error(msg);
            setHasil(prev => ({ ...prev, [jarak]: { ...prev[jarak], loading: false } }));
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Verifikasi Wajah" />
            <div className="p-4 max-w-3xl mx-auto space-y-6">

                <div>
                    <h1 className="text-xl font-semibold">Verifikasi Wajah</h1>
                    <p className="text-sm text-muted-foreground">
                        {mahasiswa.nama} · {mahasiswa.nim} — Posisikan wajah Anda di depan kamera sesuai panduan tiap jarak.
                    </p>
                </div>

                {/* Webcam */}
                <div className="rounded-xl border overflow-hidden bg-black aspect-video flex items-center justify-center">
                    {streamError ? (
                        <p className="text-red-400 text-sm px-4">{streamError}</p>
                    ) : (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    )}
                </div>
                {!streamReady && !streamError && (
                    <p className="text-sm text-muted-foreground text-center">Memuat kamera...</p>
                )}

                {/* Verifikasi 3 Jarak */}
                <div className="grid grid-cols-3 gap-3">
                    {JARAK_LIST.map(jarak => {
                        const h = hasil[jarak];
                        return (
                            <div key={jarak} className="rounded-xl border p-4 space-y-3 text-center">
                                <p className="font-medium capitalize">{jarak}</p>
                                <p className="text-xs text-muted-foreground">{PANDUAN[jarak]}</p>

                                {h.lulus === true && (
                                    <div className="flex items-center justify-center gap-1 text-green-600">
                                        <CheckCircle className="size-4" />
                                        <span className="text-sm font-medium">Lulus</span>
                                    </div>
                                )}
                                {h.lulus === false && h.confidence !== null && (
                                    <div className="flex items-center justify-center gap-1 text-red-500">
                                        <XCircle className="size-4" />
                                        <span className="text-sm font-medium">Tidak Lulus</span>
                                    </div>
                                )}
                                                {h.confidence !== null && (
                                    <p className={`text-xs font-mono ${h.lulus ? 'text-green-600' : 'text-muted-foreground'}`}>
                                        {(h.confidence * 100).toFixed(1)}% / min 60%
                                    </p>
                                )}

                                <Button
                                    size="sm"
                                    variant={h.lulus ? 'default' : 'outline'}
                                    disabled={h.loading || !streamReady}
                                    onClick={() => captureAndVerify(jarak)}
                                    className="w-full"
                                >
                                    {h.loading ? 'Memproses...' : h.lulus ? 'Ulangi' : 'Verifikasi'}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* Status setelah semua lulus */}
                {semuaLulus && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                        <p className="font-semibold text-green-800">Semua jarak berhasil diverifikasi!</p>
                        <p className="text-sm text-green-700 mt-1">
                            Verifikasi wajah Anda selesai.
                        </p>
                    </div>
                )}

                <Button variant="outline" onClick={() => router.visit('/dashboard')}>
                    Kembali ke Dashboard
                </Button>
            </div>
        </AppLayout>
    );
}

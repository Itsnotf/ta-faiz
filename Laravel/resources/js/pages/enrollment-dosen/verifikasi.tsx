import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    dosen: { id: number; nama: string };
    status: {
        status_enrollment: string;
        jarak_lulus: Record<string, number>;
        semua_jarak_lulus: boolean;
    };
}

type Jarak = 'dekat' | 'sedang' | 'jauh';
const JARAK_LIST: Jarak[] = ['dekat', 'sedang', 'jauh'];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Enrollment Wajah', href: '/enrollment-dosen' },
    { title: 'Verifikasi', href: '#' },
];

interface HasilJarak {
    confidence: number | null;
    lulus: boolean | null;
    loading: boolean;
}

export default function EnrollmentDosenVerifikasi({ dosen, status }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [streamReady, setStreamReady] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const jarakLulusList = Object.keys(status.jarak_lulus);

    const [hasil, setHasil] = useState<Record<Jarak, HasilJarak>>({
        dekat:  { confidence: null, lulus: jarakLulusList.includes('dekat'),  loading: false },
        sedang: { confidence: null, lulus: jarakLulusList.includes('sedang'), loading: false },
        jauh:   { confidence: null, lulus: jarakLulusList.includes('jauh'),   loading: false },
    });
    const [semuaLulus, setSemuaLulus] = useState(status.semua_jarak_lulus);
    const [autoApproved, setAutoApproved] = useState(false);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setStreamReady(true);
                }
            })
            .catch(err => {
                setStreamError('Tidak bisa membuka kamera: ' + err.message);
            });

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
            const res = await axios.post('/enrollment-dosen/verify-frame', {
                frame_base64: frameBase64,
                jarak,
            });
            const data = res.data;

            setHasil(prev => ({
                ...prev,
                [jarak]: { confidence: data.confidence, lulus: data.lulus, loading: false },
            }));

            if (data.semua_jarak_lulus) {
                setSemuaLulus(true);
            }
            if (data.auto_approved) {
                setAutoApproved(true);
                toast.success('Semua jarak lulus! Enrollment Anda telah diaktifkan.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message ?? 'Gagal menghubungi server.';
            toast.error(msg);
            setHasil(prev => ({ ...prev, [jarak]: { ...prev[jarak], loading: false } }));
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Verifikasi Wajah — ${dosen.nama}`} />

            <div className="p-4 max-w-3xl space-y-6">

                {/* Info */}
                <div className="rounded-xl border border-sidebar-border/70 p-4">
                    <h2 className="font-semibold text-lg">{dosen.nama}</h2>
                    <p className="text-sm text-muted-foreground">
                        Posisikan wajah Anda di kamera, lalu verifikasi dari jarak dekat, sedang, dan jauh secara bergantian.
                    </p>
                </div>

                {/* Webcam */}
                <div className="rounded-xl border border-sidebar-border/70 overflow-hidden bg-black aspect-video flex items-center justify-center">
                    {streamError ? (
                        <p className="text-red-400 text-sm px-4">{streamError}</p>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
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
                            <div key={jarak} className="rounded-xl border border-sidebar-border/70 p-4 space-y-3 text-center">
                                <p className="font-medium capitalize">{jarak}</p>

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
                                    <p className="text-xs text-muted-foreground">
                                        Confidence: <span className="font-mono">{(h.confidence * 100).toFixed(1)}%</span>
                                    </p>
                                )}

                                <Button
                                    size="sm"
                                    variant={h.lulus ? 'default' : 'outline'}
                                    disabled={h.loading || !streamReady || autoApproved}
                                    onClick={() => captureAndVerify(jarak)}
                                    className="w-full"
                                >
                                    {h.loading ? 'Memproses...' : h.lulus ? 'Ulangi' : 'Verifikasi'}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* Auto-approved banner */}
                {(semuaLulus || autoApproved) && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                        <CheckCircle className="size-6 text-green-600 shrink-0" />
                        <div>
                            <p className="font-semibold text-green-800">Semua jarak berhasil diverifikasi!</p>
                            <p className="text-sm text-green-700">Enrollment Anda telah aktif secara otomatis.</p>
                        </div>
                    </div>
                )}

                <Button variant="outline" onClick={() => router.visit('/enrollment-dosen')}>
                    Kembali ke Enrollment
                </Button>
            </div>
        </AppLayout>
    );
}

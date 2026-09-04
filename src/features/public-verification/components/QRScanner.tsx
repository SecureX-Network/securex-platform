import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { AlertTriangle, Camera, CameraOff, ScanLine } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { parseSecureXQr } from '@/utils/publicCredentialId';

type ScannerState =
  | 'starting'
  | 'scanning'
  | 'permission-denied'
  | 'no-camera'
  | 'rejected';

export interface QRScannerProps {
  /**
   * Called with the raw OPAQUE SecureX payload (`SXQR1.token.issuedAt.v1.sig`)
   * once a SecureX QR is decoded. The payload contains no readable credential ID
   * or URL; the caller resolves it through the backend (the trust boundary).
   */
  onDecoded: (payload: string) => void;
  onSwitchToManual?: () => void;
}

/**
 * SecureX QR scanner used on the public verification page.
 *
 * Decodes a QR from the camera with jsQR and only accepts a SecureX protocol
 * payload (`SXQR1.<token>.<issuedAt>.v1.<signature>`). Ordinary URLs, foreign
 * protocols and malformed/unrelated QR codes are rejected — the scanner NEVER
 * navigates to an arbitrary URL contained in a QR, and the payload it passes on
 * is opaque (it does not contain the public credential ID). The caller resolves
 * it through the verification backend (the trust boundary).
 */
export function QRScanner({ onDecoded, onSwitchToManual }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const [state, setState] = useState<ScannerState>('starting');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    let disposed = false;

    function showRejected(reason: string) {
      pausedRef.current = true;
      setRejectReason(reason);
      setState('rejected');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    function loop(video: HTMLVideoElement) {
      if (disposed || pausedRef.current) return;
      if (!video.videoWidth || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(() => loop(video));
        return;
      }
      if (ctx) {
        const h = video.videoHeight;
        const w = video.videoWidth;
        canvas.height = h;
        canvas.width = w;
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          const parsed = parseSecureXQr(code.data);
          if (parsed.ok && parsed.payload) {
            pausedRef.current = true;
            onDecoded(parsed.payload);
            return;
          }
          if (parsed.reason === 'unsupported-version') {
            showRejected('This SecureX QR uses an unsupported protocol version.');
          } else if (parsed.reason === 'malformed') {
            showRejected('The QR code does not contain a valid SecureX reference.');
          } else {
            showRejected('That is not a SecureX QR code. Only SecureX QR codes are accepted.');
          }
          return;
        }
      }
      rafRef.current = requestAnimationFrame(() => loop(video));
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('no-camera');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        setState('scanning');
        attemptPlay(video);
      } catch (err) {
        if (disposed) return;
        const name = (err as { name?: string }).name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setState('permission-denied');
        } else {
          setState('no-camera');
        }
      }
    }

    function attemptPlay(video: HTMLVideoElement) {
      const play = video.play();
      if (play !== undefined) {
        play
          .then(() => {
            if (!disposed && !pausedRef.current) {
              rafRef.current = requestAnimationFrame(() => loop(video));
            }
          })
          .catch(() => {
            if (!disposed) setState('permission-denied');
          });
      }
    }

    void start();

    return () => {
      disposed = true;
      pausedRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onDecoded]);

  function resume() {
    pausedRef.current = false;
    setRejectReason('');
    setState('scanning');
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
        {state === 'permission-denied' || state === 'no-camera' ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-center text-slate-200">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-300">
              {state === 'permission-denied' ? (
                <CameraOff className="h-7 w-7" />
              ) : (
                <AlertTriangle className="h-7 w-7" />
              )}
            </span>
            <p className="max-w-sm text-sm text-slate-300">
              {state === 'permission-denied'
                ? 'Camera access was denied. Allow camera access to scan a QR, or verify manually.'
                : 'No camera is available. You can still verify manually with a credential ID.'}
            </p>
          </div>
        ) : state === 'starting' ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-slate-200">
            <Spinner size="lg" color="#ffffff" label="Starting camera…" />
            <p className="text-xs text-slate-400">Requesting access to your camera.</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="SecureX QR scanner camera feed"
              className="h-64 w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-40 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            </div>
            {state === 'rejected' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/80 p-6 text-center">
                <p className="max-w-sm text-sm font-medium text-white">
                  {rejectReason}
                </p>
                <Button type="button" onClick={resume}>
                  Scan again
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {(state === 'scanning' || state === 'rejected') && (
        <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          <ScanLine className="h-3.5 w-3.5" />
          {state === 'scanning'
            ? 'Point your camera at a SecureX QR code.'
            : rejectReason}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Camera className="h-3.5 w-3.5" />
          Only SecureX QR codes are accepted (never arbitrary links).
        </p>
        {onSwitchToManual && (
          <Button variant="outline" size="sm" onClick={onSwitchToManual}>
            Enter ID manually
          </Button>
        )}
      </div>
    </div>
  );
}

export default QRScanner;

import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QRScanner } from '../components/QRScanner';

/**
 * The scanner had two ordering defects that no test covered:
 *
 *  1. The <video> was rendered only once the state flipped to 'scanning', but the
 *     stream is attached from the mount effect. `videoRef.current` was therefore
 *     null at attach time, the tracks were stopped, and the scanner never started.
 *  2. The effect cleanup set `pausedRef.current = true` and the effect never
 *     cleared it. React StrictMode remounts effects, so the fresh run saw a stale
 *     "paused" flag and never started the decode loop.
 *
 * Both are invisible to a snapshot test, so they are asserted structurally.
 */
describe('QRScanner', () => {
  let stopTrack: ReturnType<typeof vi.fn>;
  let rafSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stopTrack = vi.fn();
    const track = { stop: stopTrack, getSettings: () => ({}) };
    const stream = {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    // jsdom implements neither media playback nor animation frames; the loop
    // only needs `play()` to settle for the first frame to be scheduled. A null
    // 2D context is a state the component already handles (it just skips drawing).
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);

    rafSpy = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mounts the camera feed element before any state change', async () => {
    render(<QRScanner onDecoded={vi.fn()} />);

    // Present on the very first render, which is what lets the mount effect
    // attach the stream instead of finding a null ref.
    expect(screen.getByLabelText('SecureX QR scanner camera feed')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Starting camera…')).toBeInTheDocument());
  });

  it('starts the decode loop when mounted under StrictMode', async () => {
    render(
      <StrictMode>
        <QRScanner onDecoded={vi.fn()} />
      </StrictMode>,
    );

    // A scheduled frame proves the loop survived the StrictMode remount, i.e.
    // the effect did not leave a stale paused flag behind.
    await waitFor(() => expect(rafSpy).toHaveBeenCalled());
  });

  it('does not leave the camera running after unmount', async () => {
    const { unmount } = render(<QRScanner onDecoded={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Starting camera…')).toBeInTheDocument());

    await act(async () => {
      unmount();
    });

    expect(stopTrack).toHaveBeenCalled();
  });

  it('reports when no camera is available', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error('none'), { name: 'NotFoundError' }),
        ),
      },
    });

    render(<QRScanner onDecoded={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/No camera is available/i)).toBeInTheDocument(),
    );
  });

  it('reports when camera permission is denied', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
        ),
      },
    });

    render(<QRScanner onDecoded={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/Camera access was denied/i)).toBeInTheDocument(),
    );
  });
});

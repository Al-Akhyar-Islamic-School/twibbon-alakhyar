'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/ds';
import type { TwibbonDTO } from '@/lib/twibbon';

// ---- Core compositing model -------------------------------------------------
// Everything is computed in the twibbon's NATIVE pixel space (the canvas backing
// store is W×H = the twibbon's real dimensions, so the exported PNG matches the
// source resolution exactly, FR-07). The photo is the bottom layer: we store its
// on-canvas center (cx,cy) and absolute scale. The twibbon PNG is the fixed top
// layer — never moved or scaled by the user (FR-05).

type Transform = { scale: number; cx: number; cy: number };

const MAX_ZOOM_FACTOR = 6; // photo can be enlarged up to 6× its cover size
// Photo can be shrunk until its width is this fraction of the twibbon width
// (below the cover size — transparent gaps around the photo are allowed).
const MIN_WIDTH_RATIO = 0.5;
const EDIT_ALPHA = 0.65; // twibbon opacity while positioning (FR-06)

function loadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function TwibbonEditor({ twibbon }: { twibbon: TwibbonDTO }) {
  const W = twibbon.width;
  const H = twibbon.height;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const twibbonImgRef = useRef<HTMLImageElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<Transform>({ scale: 1, cx: W / 2, cy: H / 2 });
  const coverScaleRef = useRef<number>(1);
  // Smallest allowed zoom factor (relative to cover), set per photo so the
  // photo can shrink to MIN_WIDTH_RATIO of the twibbon width.
  const minFactorRef = useRef<number>(1);
  const editModeRef = useRef<boolean>(true);

  const [twibbonReady, setTwibbonReady] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [zoom, setZoom] = useState(1); // factor over cover scale (slider)
  const [minZoom, setMinZoom] = useState(1); // slider lower bound (< 1 allowed)
  const [downloading, setDownloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  // ---- drawing -------------------------------------------------------------
  const clampTransform = useCallback(
    (t: Transform): Transform => {
      const photo = photoImgRef.current;
      const pw = photo?.naturalWidth ?? 1;
      const ph = photo?.naturalHeight ?? 1;
      // Clamp scale between the min (can shrink below cover) and the max zoom.
      const minScale = coverScaleRef.current * minFactorRef.current;
      const maxScale = coverScaleRef.current * MAX_ZOOM_FACTOR;
      const scale = Math.min(Math.max(t.scale, minScale), maxScale);

      const drawnW = pw * scale;
      const drawnH = ph * scale;
      // Two regimes, handled by one min/max clamp:
      //  • photo larger than canvas → keep it covering (no empty edge)
      //  • photo smaller than canvas → keep it fully inside the canvas
      const loX = Math.min(drawnW / 2, W - drawnW / 2);
      const hiX = Math.max(drawnW / 2, W - drawnW / 2);
      const loY = Math.min(drawnH / 2, H - drawnH / 2);
      const hiY = Math.max(drawnH / 2, H - drawnH / 2);
      const cx = Math.min(Math.max(t.cx, loX), hiX);
      const cy = Math.min(Math.max(t.cy, loY), hiY);
      return { scale, cx, cy };
    },
    [W, H]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    const photo = photoImgRef.current;
    if (photo) {
      const t = transformRef.current;
      const dw = photo.naturalWidth * t.scale;
      const dh = photo.naturalHeight * t.scale;
      ctx.drawImage(photo, t.cx - dw / 2, t.cy - dh / 2, dw, dh);
    }

    const twib = twibbonImgRef.current;
    if (twib) {
      ctx.globalAlpha = editModeRef.current && photo ? EDIT_ALPHA : 1;
      ctx.drawImage(twib, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }, [W, H]);

  // ---- load the twibbon PNG ------------------------------------------------
  useEffect(() => {
    let alive = true;
    loadImage(twibbon.imageUrl, 'anonymous')
      .then((img) => {
        if (!alive) return;
        twibbonImgRef.current = img;
        setTwibbonReady(true);
        draw();
      })
      .catch(() => alive && setLoadError('Gagal memuat gambar twibbon. Cek koneksi Anda.'));
    return () => {
      alive = false;
    };
  }, [twibbon.imageUrl, draw]);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator);
  }, []);

  // ---- photo selection -----------------------------------------------------
  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // allow re-picking the same file
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setLoadError('File harus berupa gambar.');
        return;
      }
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        photoImgRef.current = img;
        // Initial fit: cover the canvas, centered.
        const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        coverScaleRef.current = cover;
        // Allow shrinking until the photo's width is MIN_WIDTH_RATIO of the
        // twibbon width, expressed as a factor relative to the cover scale.
        const minScale = (MIN_WIDTH_RATIO * W) / img.naturalWidth;
        minFactorRef.current = Math.min(1, minScale / cover);
        setMinZoom(minFactorRef.current);
        transformRef.current = clampTransform({ scale: cover, cx: W / 2, cy: H / 2 });
        setZoom(1);
        editModeRef.current = true;
        setEditMode(true);
        setHasPhoto(true);
        setLoadError(null);
        draw();
      } catch {
        setLoadError('Foto tidak dapat dibaca.');
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [W, H, clampTransform, draw]
  );

  // ---- zoom helpers --------------------------------------------------------
  const applyZoomFactor = useCallback(
    (factor: number, aboutX = W / 2, aboutY = H / 2) => {
      const photo = photoImgRef.current;
      if (!photo) return;
      const clampedFactor = Math.min(Math.max(factor, minFactorRef.current), MAX_ZOOM_FACTOR);
      const newScale = coverScaleRef.current * clampedFactor;
      const t = transformRef.current;
      // Keep the photo point under (aboutX,aboutY) stationary while zooming.
      const leftOld = t.cx - (photo.naturalWidth * t.scale) / 2;
      const topOld = t.cy - (photo.naturalHeight * t.scale) / 2;
      const u = (aboutX - leftOld) / t.scale;
      const v = (aboutY - topOld) / t.scale;
      const leftNew = aboutX - u * newScale;
      const topNew = aboutY - v * newScale;
      const cx = leftNew + (photo.naturalWidth * newScale) / 2;
      const cy = topNew + (photo.naturalHeight * newScale) / 2;
      transformRef.current = clampTransform({ scale: newScale, cx, cy });
      setZoom(clampedFactor);
      draw();
    },
    [W, H, clampTransform, draw]
  );

  const onSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyZoomFactor(parseFloat(e.target.value));
  };

  // ---- pointer / gesture handling (pan + pinch) ----------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist = 0;
    let pinchStartFactor = 1;

    const toCanvas = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
    };

    const onDown = (ev: PointerEvent) => {
      if (!photoImgRef.current) return;
      canvas.setPointerCapture(ev.pointerId);
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        pinchStartFactor = transformRef.current.scale / coverScaleRef.current;
      }
    };

    const onMove = (ev: PointerEvent) => {
      if (!pointers.has(ev.pointerId) || !photoImgRef.current) return;
      const prev = pointers.get(ev.pointerId)!;
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;

      if (pointers.size === 1) {
        // Pan
        const dx = (ev.clientX - prev.x) * sx;
        const dy = (ev.clientY - prev.y) * sy;
        const t = transformRef.current;
        transformRef.current = clampTransform({ scale: t.scale, cx: t.cx + dx, cy: t.cy + dy });
        draw();
      }
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const midClient = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const mid = toCanvas(midClient.x, midClient.y);
        const factor = pinchStartFactor * (dist / pinchStartDist);
        applyZoomFactor(factor, mid.x, mid.y);
      }
    };

    const onUp = (ev: PointerEvent) => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinchStartDist = 0;
    };

    const onWheel = (ev: WheelEvent) => {
      if (!photoImgRef.current) return;
      ev.preventDefault();
      const { x, y } = toCanvas(ev.clientX, ev.clientY);
      const current = transformRef.current.scale / coverScaleRef.current;
      const next = current * (ev.deltaY < 0 ? 1.08 : 0.92);
      applyZoomFactor(next, x, y);
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [W, H, clampTransform, applyZoomFactor, draw]);

  // ---- preview toggle ------------------------------------------------------
  const toggleEditMode = () => {
    const next = !editModeRef.current;
    editModeRef.current = next;
    setEditMode(next);
    draw();
  };

  // ---- export --------------------------------------------------------------
  const renderFinalBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      // Force full-opacity twibbon for the final composite regardless of mode.
      const wasEdit = editModeRef.current;
      editModeRef.current = false;
      draw();
      canvas.toBlob(
        (blob) => {
          editModeRef.current = wasEdit;
          draw();
          resolve(blob);
        },
        'image/png'
      );
    });
  }, [draw]);

  const fileName = `twibbon-${twibbon.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;

  const logDownload = () => {
    // Anonymous usage ping (FR-15) — fire and forget, never blocks the download.
    fetch(`/api/twibbons/${twibbon.id}/download`, { method: 'POST', keepalive: true }).catch(
      () => {}
    );
  };

  const onDownload = async () => {
    if (!hasPhoto) return;
    setDownloading(true);
    try {
      const blob = await renderFinalBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      logDownload();
    } finally {
      setDownloading(false);
    }
  };

  // Invite others to use this twibbon — shares the twibbon's link + a default
  // ajakan text. Distinct from onShare, which shares the finished image.
  const onShareInvite = async () => {
    const link = `${window.location.origin}/editor/${twibbon.id}`;
    const text = `Ayo ikut keseruan – ${twibbon.title}. Gunakan Twibbon ini sekarang:`;
    try {
      if (navigator.share) {
        await navigator.share({ title: twibbon.title, text, url: link });
      } else {
        await navigator.clipboard.writeText(`${text} ${link}`);
        alert('Link twibbon disalin ke clipboard.');
      }
    } catch {
      /* user cancelled */
    }
  };

  const onShare = async () => {
    if (!hasPhoto) return;
    const blob = await renderFinalBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: twibbon.title,
          // Single line — WhatsApp often keeps only the first line of the caption
          // when an image is attached, so avoid line breaks here.
          text: `Twibbon ${twibbon.title} — Yayasan Al Akhyar · created on twibbon.alakhyar.sch.id`,
        });
        logDownload();
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="stack" style={{ flex: 1 }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--feature-header-blue)',
          color: '#fff',
          padding: '14px 16px 20px',
          borderBottomLeftRadius: 'var(--radius-xl)',
          borderBottomRightRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          href="/"
          aria-label="Kembali"
          style={{
            background: 'rgba(255,255,255,0.16)',
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ‹
        </Link>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {twibbon.title}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {twibbon.width}×{twibbon.height}px
          </div>
        </div>
        <button
          onClick={onShareInvite}
          aria-label="Bagikan twibbon ini"
          style={{
            background: 'rgba(255,255,255,0.16)',
            color: '#fff',
            border: 'none',
            height: 32,
            padding: '0 12px',
            borderRadius: 'var(--radius-pill)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          Bagikan
        </button>
      </div>

      {/* Canvas stage */}
      <div className="page-pad stack gap-4" style={{ flex: 1 }}>
        <div
          className="checker"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 420,
            margin: '0 auto',
            aspectRatio: `${W} / ${H}`,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            touchAction: 'none',
          }}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: hasPhoto ? 'grab' : 'default',
              touchAction: 'none',
            }}
          />
          {!twibbonReady && !loadError && (
            <div style={centerOverlay}>Memuat twibbon…</div>
          )}
          {loadError && (
            <div style={{ ...centerOverlay, color: 'var(--state-danger)' }}>{loadError}</div>
          )}
          {twibbonReady && !hasPhoto && (
            <button
              onClick={onPickFile}
              style={{
                position: 'absolute',
                inset: 0,
                border: 'none',
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(1px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                color: 'var(--brand)',
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 34, lineHeight: 1 }}>＋</span>
              <span>Pilih Foto</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                Ketuk untuk pilih dari galeri / kamera
              </span>
            </button>
          )}
        </div>

        {/* Zoom control + hint (only once a photo is present) */}
        {hasPhoto && (
          <div className="stack gap-2">
            {editMode && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '8px 14px',
                }}
              >
                <button onClick={() => applyZoomFactor(zoom - 0.25)} aria-label="Perkecil" style={zoomBtn}>
                  −
                </button>
                <input
                  type="range"
                  min={minZoom}
                  max={MAX_ZOOM_FACTOR}
                  step={0.01}
                  value={zoom}
                  onChange={onSliderChange}
                  aria-label="Perbesar / perkecil foto"
                  style={{ flex: 1, accentColor: 'var(--brand)' }}
                />
                <button onClick={() => applyZoomFactor(zoom + 0.25)} aria-label="Perbesar" style={zoomBtn}>
                  +
                </button>
              </div>
            )}
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              {editMode
                ? 'Geser foto untuk mengatur posisi · cubit / scroll untuk zoom'
                : 'Pratinjau hasil akhir — twibbon tampil penuh.'}
            </p>
          </div>
        )}
      </div>

      {/* Action bar (thumb zone) */}
      <div className="action-bar">
        {hasPhoto ? (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" size="lg" onClick={onPickFile} style={{ flex: 1 }}>
                Ganti Foto
              </Button>
              <Button variant="secondary" size="lg" onClick={toggleEditMode} style={{ flex: 1 }}>
                {editMode ? 'Pratinjau' : 'Atur Posisi'}
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button
                variant="primary"
                size="lg"
                block
                onClick={onDownload}
                disabled={downloading}
                style={{ flex: 1 }}
              >
                {downloading ? 'Menyiapkan…' : 'Unduh PNG'}
              </Button>
              {canShare && (
                <Button variant="magenta" size="lg" onClick={onShare} style={{ flexShrink: 0 }}>
                  Bagikan
                </Button>
              )}
            </div>
          </>
        ) : (
          <Button variant="primary" size="lg" block onClick={onPickFile} disabled={!twibbonReady}>
            Pilih Foto
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}

const centerOverlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  color: 'var(--text-muted)',
  textAlign: 'center',
  padding: 16,
};

const zoomBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-card)',
  color: 'var(--brand)',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
  lineHeight: 1,
};

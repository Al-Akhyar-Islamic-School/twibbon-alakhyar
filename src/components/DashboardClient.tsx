'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Badge, Card } from '@/ds';
import { formatRange, scheduleStatus } from '@/lib/format';
import type { TwibbonDTO } from '@/lib/twibbon';

type FormState = {
  id?: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  file: File | null;
  previewUrl: string | null;
};

const emptyForm: FormState = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  isActive: true,
  file: null,
  previewUrl: null,
};

const STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'neutral' }> = {
  active: { label: 'Aktif', tone: 'green' },
  upcoming: { label: 'Segera', tone: 'amber' },
  ended: { label: 'Berakhir', tone: 'neutral' },
};

export function DashboardClient({ initialTwibbons }: { initialTwibbons: TwibbonDTO[] }) {
  const router = useRouter();
  const [items, setItems] = useState<TwibbonDTO[]>(initialTwibbons);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isEdit = !!form.id;

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (t: TwibbonDTO) => {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description || '',
      startDate: t.startDate ? t.startDate.slice(0, 10) : '',
      endDate: t.endDate ? t.endDate.slice(0, 10) : '',
      isActive: t.isActive,
      file: null,
      previewUrl: t.imageUrl,
    });
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    if (file.type !== 'image/png') {
      setError('File harus PNG transparan.');
      return;
    }
    setError(null);
    setForm((f) => ({ ...f, file, previewUrl: URL.createObjectURL(file) }));
  };

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) return setError('Judul wajib diisi.');
    if (!isEdit && !form.file) return setError('Silakan unggah file PNG twibbon.');

    const fd = new FormData();
    fd.set('title', form.title.trim());
    fd.set('description', form.description.trim());
    fd.set('startDate', form.startDate);
    fd.set('endDate', form.endDate);
    fd.set('isActive', String(form.isActive));
    if (form.file) fd.set('file', form.file);

    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/twibbons/${form.id}` : '/api/twibbons', {
        method: isEdit ? 'PATCH' : 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan.');
        return;
      }
      const saved: TwibbonDTO = data.twibbon;
      setItems((prev) =>
        isEdit ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
      );
      closeForm();
      router.refresh();
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (t: TwibbonDTO) => {
    setBusyId(t.id);
    const next = !t.isActive;
    setItems((prev) => prev.map((p) => (p.id === t.id ? { ...p, isActive: next } : p)));
    try {
      const fd = new FormData();
      fd.set('isActive', String(next));
      const res = await fetch(`/api/twibbons/${t.id}`, { method: 'PATCH', body: fd });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // revert on failure
      setItems((prev) => prev.map((p) => (p.id === t.id ? { ...p, isActive: t.isActive } : p)));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t: TwibbonDTO) => {
    if (!confirm(`Hapus twibbon "${t.title}"? Tindakan ini tidak menghapus permanen tetapi menyembunyikannya dari publik.`)) return;
    setBusyId(t.id);
    try {
      const res = await fetch(`/api/twibbons/${t.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((p) => p.id !== t.id));
      router.refresh();
    } catch {
      alert('Gagal menghapus. Coba lagi.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack gap-4">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>
          Twibbon Saya
        </h2>
        {!showForm && (
          <Button size="sm" onClick={openCreate}>
            + Upload Twibbon
          </Button>
        )}
      </div>

      {showForm && (
        <Card padding="lg" style={{ position: 'relative' }}>
          <div className="stack gap-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 15, color: 'var(--text-heading)' }}>
                {isEdit ? 'Edit Twibbon' : 'Upload Twibbon Baru'}
              </strong>
              <button
                onClick={closeForm}
                aria-label="Tutup"
                style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            {/* File dropzone */}
            <label
              className="checker"
              style={{
                display: 'block',
                position: 'relative',
                border: '2px dashed var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: form.previewUrl ? 0 : '28px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {form.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.previewUrl}
                  alt="Pratinjau twibbon"
                  style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <span style={{ color: 'var(--brand)', fontWeight: 600, fontSize: 14 }}>
                  Ketuk untuk pilih file PNG transparan
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>
                    Rekomendasi 1080×1080px · maks 10MB
                  </span>
                </span>
              )}
              <input type="file" accept="image/png" onChange={onFile} style={{ display: 'none' }} />
            </label>
            {isEdit && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Biarkan kosong untuk mempertahankan gambar saat ini.
              </p>
            )}

            <Input
              label="Judul / Nama Event"
              placeholder="mis. Milad ke-10 Al Akhyar"
              value={form.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
            <Input
              label="Deskripsi (opsional)"
              placeholder="Keterangan singkat"
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1 }}>
                <label style={dateLabel}>Mulai Tayang</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  style={dateInput}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={dateLabel}>Berakhir</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  style={dateInput}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: 'var(--brand)' }}
              />
              <span style={{ fontSize: 14, color: 'var(--text-heading)', fontWeight: 600 }}>
                Aktif (tampilkan ke publik)
              </span>
            </label>

            {error && (
              <div style={{ color: 'var(--state-danger)', fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" onClick={closeForm} style={{ flex: 1 }} disabled={submitting}>
                Batal
              </Button>
              <Button onClick={submit} style={{ flex: 1 }} disabled={submitting}>
                {submitting ? 'Menyimpan…' : isEdit ? 'Simpan' : 'Upload'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {items.length === 0 && !showForm ? (
        <Card padding="lg" tone="sunken" style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
            Belum ada twibbon. Ketuk <strong>Upload Twibbon</strong> untuk memulai.
          </p>
        </Card>
      ) : (
        <div className="stack gap-3">
          {items.map((t) => {
            const status = scheduleStatus(t.startDate, t.endDate);
            const s = STATUS[t.isActive ? status : 'ended'];
            const range = formatRange(t.startDate, t.endDate);
            const accent = t.isActive ? 'var(--state-success)' : 'var(--color-slate-300)';
            return (
              <Card key={t.id} padding="none" style={{ overflow: 'hidden', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }} />
                <div style={{ display: 'flex', gap: 12, padding: '12px 14px 12px 18px' }}>
                  <div
                    className="checker"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.imageUrl} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }}>
                        {t.title}
                      </span>
                      <Badge tone={t.isActive ? s.tone : 'neutral'} variant="soft">
                        {t.isActive ? s.label : 'Nonaktif'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {t.width}×{t.height}px
                      {range ? ` · ${range}` : ''}
                      {t.downloadCount != null ? ` · ${t.downloadCount} unduhan` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                      <button style={linkBtn} onClick={() => toggleActive(t)} disabled={busyId === t.id}>
                        {t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button style={linkBtn} onClick={() => openEdit(t)}>
                        Edit
                      </button>
                      <Link href={`/editor/${t.id}`} style={{ ...linkBtn, textDecoration: 'none' }}>
                        Buka Editor
                      </Link>
                      <button
                        style={{ ...linkBtn, color: 'var(--state-danger)' }}
                        onClick={() => remove(t)}
                        disabled={busyId === t.id}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const dateLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-heading)',
  marginBottom: 6,
};
const dateInput: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--text-heading)',
  background: 'var(--surface-card)',
};
const linkBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--brand)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
};

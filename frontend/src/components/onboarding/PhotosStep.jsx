import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyMedia, uploadMedia, deleteMedia, reorderMedia } from '@/services/api';
import { notifyError, notifyProblem } from '@/lib/notify';
import usePressDragReorder from '@/hooks/usePressDragReorder';
import { Card } from '@/components/site/Form';

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
const MAX = 10 * 1024 * 1024;
const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const abs = (u) => (u && u.startsWith('/api/') ? BACKEND + u : u);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmtDur = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
const fileLabel = (m, i) => m.file_name || (m.media_type === 'video' ? `Video ${i + 1}` : `Photo ${i + 1}`);

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B04585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
);
const Grip = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
);
const Close = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
);
const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
);

/**
 * Step 2 — Photos & videos. Files upload straight away and are queued for review.
 * Props: providerId (agency companion; omit for an independent's own profile), level, who ('your' | 'her').
 */
export default function PhotosStep({ providerId = null, level = 1, who = 'your', onChange }) {
  const [items, setItems] = useState([]); // server items + uploading placeholders
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [durations, setDurations] = useState({});
  const inputRef = useRef(null);
  const orderTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getMyMedia(providerId);
      setItems(data?.media || []);
    } catch (e) {
      // profile may not exist yet; keep empty
    } finally {
      setLoading(false);
    }
  }, [providerId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (onChange) onChange(items.filter((m) => !m.uploading)); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const photos = items.filter((m) => m.media_type !== 'video');
  const videos = items.filter((m) => m.media_type === 'video');

  const addFiles = (files) => {
    const list = Array.from(files || []);
    const ok = list.filter((f) => OK_TYPES.includes(f.type) && f.size <= MAX);
    if (ok.length !== list.length) notifyProblem('Some files were skipped.', 'Use JPG, PNG or WebP photos and MP4 or MOV videos, up to 10 MB each.');
    ok.forEach((file) => {
      const tmp = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const preview = URL.createObjectURL(file);
      setItems((s) => [...s, { media_id: tmp, url: preview, media_type: file.type.startsWith('video') ? 'video' : 'photo', status: 'pending', file_name: file.name, uploading: true, progress: 0 }]);
      uploadMedia(file, providerId, (p) => setItems((s) => s.map((m) => (m.media_id === tmp ? { ...m, progress: p } : m))))
        .then(({ data }) => setItems((s) => s.map((m) => (m.media_id === tmp ? { ...data, preview } : m))))
        .catch((err) => {
          setItems((s) => s.filter((m) => m.media_id !== tmp));
          notifyError(err, `We couldn't upload ${file.name}.`);
        });
    });
  };

  const remove = async (m) => {
    setConfirm(null);
    const prev = items;
    setItems((s) => s.filter((x) => x.media_id !== m.media_id));
    try { await deleteMedia(m.media_id, providerId); if (String(m.media_id).startsWith('photo_')) load(); } catch (err) { setItems(prev); notifyError(err, "We couldn't delete this item."); }
  };

  const saveOrder = (list) => {
    clearTimeout(orderTimer.current);
    orderTimer.current = setTimeout(() => {
      reorderMedia(list.filter((m) => !m.uploading).map((m) => m.url), providerId).catch((err) => notifyError(err, "We couldn't save the new order."));
    }, 500);
  };
  const movePhoto = (from, to) => {
    setItems((s) => {
      const ph = s.filter((m) => m.media_type !== 'video');
      const vi = s.filter((m) => m.media_type === 'video');
      const next = [...ph];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      saveOrder(next);
      return [...next, ...vi];
    });
  };
  const moveVideo = (from, to) => {
    setItems((s) => {
      const ph = s.filter((m) => m.media_type !== 'video');
      const vi = [...s.filter((m) => m.media_type === 'video')];
      const [it] = vi.splice(from, 1);
      vi.splice(to, 0, it);
      saveOrder(vi);
      return [...ph, ...vi];
    });
  };
  const { dragIdx: dragPhoto, bind: bindPhoto } = usePressDragReorder(movePhoto);
  const { dragIdx: dragVideo, bind: bindVideo } = usePressDragReorder(moveVideo);

  const tile = (m, i, kind) => {
    const isCover = kind === 'photo' && i === 0;
    const bind = kind === 'photo' ? bindPhoto(i) : bindVideo(i);
    const dragging = (kind === 'photo' ? dragPhoto : dragVideo) === i;
    const src = abs(m.preview || m.url);
    return (
      <li key={m.media_id} className={`ph-it${dragging ? ' drag' : ''}`} data-testid={`media-${kind}-${i}`}>
        <div className={`ph-th ${kind}${isCover ? ' cover' : ''}`} data-reorder-idx={i} {...(m.uploading ? {} : bind)}>
          {kind === 'photo' ? (
            <img src={src} alt="" draggable={false} />
          ) : (
            <>
              <video src={src} muted preload="metadata" playsInline onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setDurations((x) => ({ ...x, [m.media_id]: d })); }} />
              <span className="play"><PlayIcon /></span>
              {durations[m.media_id] ? <span className="dur">{fmtDur(durations[m.media_id])}</span> : null}
            </>
          )}
          {isCover && !m.uploading && <span className="badge cov">Cover</span>}
          {!m.uploading && m.status === 'pending' && <span className={`badge rev${isCover ? ' low' : ''}`}>In review</span>}
          {!m.uploading && m.status === 'rejected' && <span className={`badge rej${isCover ? ' low' : ''}`}>Rejected</span>}
          {!m.uploading && <span className="grip" title="Drag to reorder"><Grip /></span>}
          {!m.uploading && <button type="button" className="del" aria-label={`Delete ${fileLabel(m, i)}`} onClick={() => setConfirm(m.media_id)} data-testid={`media-delete-${kind}-${i}`}><Close /></button>}
          {m.uploading && <span className="prog" aria-label={`Uploading ${m.progress || 0}%`}><span style={{ width: `${Math.max(8, m.progress || 0)}%` }} /></span>}
          {confirm === m.media_id && (
            <div role="alertdialog" aria-label={`Delete this ${kind}?`} className="confirm">
              <span>Delete this {kind}?</span>
              <button type="button" className="yes" onClick={() => remove(m)} data-testid="media-delete-confirm">Delete</button>
              <button type="button" className="no" onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          )}
        </div>
        <span className="fn">{fileLabel(m, i)}</span>
      </li>
    );
  };

  return (
    <Card level={level} title="Photos & videos" sub={`${who === 'your' ? 'Your' : 'Her'} first photo is ${who} cover in search results. Every item is reviewed before it’s published.`} testId="photos-card">
      <div
        className={`ph-drop${dragOver ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      >
        <span className="ic"><UploadIcon /></span>
        <span className="tx">
          <span className="t"><span className="lg">Drag photos and videos here</span><span className="sm">Add photos and videos</span></span>
          <span className="d">Photos: JPG, PNG or WebP · Videos: MP4 or MOV · max 10 MB per file. We sort them for you.</span>
        </span>
        <button type="button" className="x-btn outl" onClick={() => inputRef.current?.click()} data-testid="choose-files">Choose files</button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} data-testid="file-input" />
      </div>

      <div className="ob-grp">
        <div className="ph-hd">
          <div className="r"><h2>Photos</h2><span>{loading ? '' : plural(photos.length, 'photo')}</span></div>
          <p>Portrait format (3:4). Drag to reorder (on a phone: press and hold) — {who} first photo is {who} cover.</p>
        </div>
        {photos.length > 0 ? <ul className="ph-grid photos">{photos.map((m, i) => tile(m, i, 'photo'))}</ul> : !loading && <p className="ph-empty">No photos yet. Add at least one photo — it becomes {who} cover.</p>}
      </div>

      <div className="ob-grp">
        <div className="ph-hd">
          <div className="r"><h2>Videos</h2><span>{loading ? '' : plural(videos.length, 'video')}</span></div>
          <p>MP4 or MOV, landscape or portrait. Drag to reorder (on a phone: press and hold).</p>
        </div>
        {videos.length > 0 ? <ul className="ph-grid videos">{videos.map((m, i) => tile(m, i, 'video'))}</ul> : !loading && <p className="ph-empty">No videos yet. Videos are optional.</p>}
      </div>
    </Card>
  );
}

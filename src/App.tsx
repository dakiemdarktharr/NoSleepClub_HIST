import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { downloadFootage, loadCatalog, rememberRoom, restoreRoom, rpc, saveFootage, shareLink, Vision } from './client';
import { quality, TemporalGate } from './recognition';
import { currentModel, selectTrainingFrames, sourceIdsFor } from './fewshot';
import { readModelCache, writeModelCache } from './model-cache';
import { CAPTURE_SECONDS, MAX_VIDEO_BYTES, type CapturedFrame, type Feature, type Footage, type Mode, type Prediction, type Room, type TrainedClassifier } from './shared';

type Draft = { blob: Blob; frames: Feature[]; captured: CapturedFrame[]; duration: number; cover: string; savedId?: string };
const emptyPrediction: Prediction = { label: null, reason: 'Chờ camera và mẫu tham chiếu', similarity: 0, inliers: 0 };
const seconds = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
const sizeText = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MB`;
function Icon({ name }: { name: 'camera' | 'record' | 'qr' | 'back' }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{name === 'camera' ? <><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="4" /></> : name === 'record' ? <><rect x="3" y="5" width="18" height="14" rx="4" /><circle cx="12" cy="12" r="4" /></> : name === 'qr' ? <><path d="M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 0h3v3h3v3h-6zM12 3v9H3m9 9v-6h9M18 12h3" /></> : <path d="m14 5-7 7 7 7" />}</svg>;
}
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [room, setRoom] = useState<Room | null>(() => restoreRoom());
  const [footages, setFootages] = useState<Footage[]>([]);
  const [status, setStatus] = useState('Chọn vai trò để bắt đầu phiên test.');
  const [error, setError] = useState('');
  const [camera, setCamera] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [qualityLabel, setQualityLabel] = useState('Camera chưa bật');
  const [prediction, setPrediction] = useState<Prediction>(emptyPrediction);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [label, setLabel] = useState('');
  const [background, setBackground] = useState(false);
  const [kind, setKind] = useState<'reference' | 'validation'>('reference');
  const [showQR, setShowQR] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [joinLink, setJoinLink] = useState('');
  const [report, setReport] = useState('');
  const [learnedCount, setLearnedCount] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef(document.createElement('canvas'));
  const stream = useRef<MediaStream | null>(null);
  const facing = useRef<'environment' | 'user'>('environment');
  const vision = useRef<Vision | null>(null);
  const initialization = useRef<Promise<void> | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordingNow = useRef(false);
  const recognizing = useRef(false);
  const generation = useRef(0);
  const cameraGeneration = useRef(0);
  const captures = useRef<CapturedFrame[]>([]);
  const captureTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparation = useRef<Promise<TrainedClassifier> | null>(null);
  const activeModelRoom = useRef(room?.id || null);
  const startedAt = useRef(0);
  const temporal = useRef(new TemporalGate());
  const lastPredictionAt = useRef(0);
  const link = shareLink(room);
  const readyClips = footages.filter(item => item.status === 'ready');
  const referenceClips = readyClips.filter(item => item.kind === 'reference');
  const labels = new Set(referenceClips.filter(item => !item.background).map(item => item.label.toLocaleLowerCase('vi')));

  const fail = (value: unknown) => { setError(value instanceof Error ? value.message : String(value)); };
  async function refresh(target = room) {
    if (!target) return [];
    const data = await rpc<{ footages: Footage[] }>('workspace.get', {}, target);
    setFootages(data.footages); return data.footages;
  }
  async function ensureVision() {
    if (!initialization.current) {
      vision.current = new Vision(setStatus);
      initialization.current = vision.current.request<void>('init').then(() => { setModelReady(true); setStatus('Bộ nhận diện đã sẵn sàng.'); }).catch(error => { initialization.current = null; vision.current?.close(); vision.current = null; throw error; });
    }
    return initialization.current;
  }
  async function prepareClassifier(target: Room, clips: Footage[], forceTrain = false) {
    const ids = sourceIdsFor(clips);
    let model = forceTrain ? null : await readModelCache(target.id);
    if (!forceTrain && !currentModel(model, ids)) {
      const remote = await rpc<{ model: TrainedClassifier | null }>('model.get', {}, target);
      model = remote.model;
    }
    if (!currentModel(model, ids) || forceTrain) {
      setStatus('Đang huấn luyện bộ phân loại từ footage đã lưu…');
      const frames = await loadCatalog(target, clips);
      model = await vision.current!.request<TrainedClassifier>('train', { frames, sourceIds: ids });
      if (target.writeKey && model.sourceIds.length) await rpc('model.save', { model }, target, true);
    }
    await writeModelCache(target.id, model!);
    if (activeModelRoom.current === target.id) {
      await vision.current!.request('restore', { model });
      setLearnedCount(model!.classes.filter(item => !item.background).length);
    }
    return model!;
  }
  function prewarm(target: Room, clips: Footage[]) {
    activeModelRoom.current = target.id;
    const loading = ensureVision();
    const pending = Promise.all([loading, prepareClassifier(target, clips)]).then(([, model]) => {
      if (activeModelRoom.current === target.id) setStatus(model.classes.length ? 'Bộ mẫu đã học và sẵn sàng nhận diện.' : 'Quay một video 5 giây để dạy khu vực đầu tiên.');
      return model;
    }).catch(error => { if (preparation.current === pending) preparation.current = null; throw error; });
    preparation.current = pending;
    return pending;
  }
  function snapshot() {
    const element = video.current;
    if (!element?.videoWidth) throw new Error('Chờ camera hiện hình rồi thử lại.');
    const scale = Math.min(1, 512 / Math.max(element.videoWidth, element.videoHeight));
    canvas.current.width = Math.round(element.videoWidth * scale); canvas.current.height = Math.round(element.videoHeight * scale);
    const context = canvas.current.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(element, 0, 0, canvas.current.width, canvas.current.height);
    return context.getImageData(0, 0, canvas.current.width, canvas.current.height);
  }
  function coverImage() {
    snapshot();
    const small = document.createElement('canvas'); small.width = 240; small.height = Math.round(canvas.current.height / canvas.current.width * 240);
    small.getContext('2d')!.drawImage(canvas.current, 0, 0, small.width, small.height);
    return small.toDataURL('image/jpeg', .7);
  }
  function stopCamera() {
    cameraGeneration.current++; generation.current++; recognizing.current = false;
    if (captureTimer.current) clearInterval(captureTimer.current);
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    recordingNow.current = false; setRecording(false);
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCamera(false); setPrediction(emptyPrediction); setQualityLabel('Camera đã tắt');
  }
  useEffect(() => {
    const hidden = () => { if (document.hidden) stopCamera(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); stopCamera(); vision.current?.close(); };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 250);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (mode !== 'user') return;
    const timer = setInterval(() => {
      if (performance.now() - lastPredictionAt.current > 2500) setPrediction(previous => previous.label ? { ...emptyPrediction, reason: 'Đang chờ khung hình xác nhận mới' } : previous);
    }, 250);
    return () => clearInterval(timer);
  }, [mode]);
  useEffect(() => {
    if (!showQR) return;
    QRCode.toDataURL(link, { width: 640, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#172c42', light: '#ffffff' } }).then(setQrImage).catch(fail);
  }, [showQR, link]);
  useEffect(() => {
    if (!draft && !showQR) return;
    const previous = document.activeElement as HTMLElement | null;
    const regions = [...document.querySelectorAll<HTMLElement>('main, .header, .footer')];
    regions.forEach(element => { element.inert = true; });
    const modal = document.querySelector<HTMLElement>('.modal');
    modal?.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled)')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showQR) { setShowQR(false); return; }
      if (event.key !== 'Tab') return;
      const elements = [...(modal?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]') || [])].filter(element => element.offsetParent !== null);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { regions.forEach(element => { element.inert = false; }); document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [!!draft, showQR]);

  async function enter(next: Mode) {
    setBusy(true); setError('');
    try {
      let target = room;
      let clips: Footage[] = [];
      if (next === 'dev' && !room?.writeKey) {
        target = await rpc<Room>('workspace.create');
        rememberRoom(target); setRoom(target); history.replaceState(null, '', '?room=' + target.id);
        setFootages([]); setStatus('Phòng test mới đã sẵn sàng. Quay từng khu vực rồi đặt tên.');
      } else if (room) { clips = await refresh(room); setStatus(next === 'dev' ? 'Quay một video 5 giây để dạy khu vực.' : 'Đang chuẩn bị bộ mẫu đã học…'); }
      setMode(next);
      if (target) void prewarm(target, clips).catch(fail);
    } catch (error) { fail(error); } finally { setBusy(false); }
  }
  async function openCamera() {
    setBusy(true); setError(''); stopCamera(); const current = cameraGeneration.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera cần HTTPS và trình duyệt hỗ trợ. Hãy mở link Vercel bằng Safari hoặc Chrome.');
      const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing.current }, width: { ideal: 960 }, height: { ideal: 540 } } });
      if (current !== cameraGeneration.current) { next.getTracks().forEach(track => track.stop()); return; }
      stream.current = next; video.current!.srcObject = next; await video.current!.play();
      setCamera(true); setQualityLabel('Camera trực tiếp');
      setStatus('Camera đã bật. Có thể quay mẫu 5 giây. Lần đầu model cần tải qua mạng.');
      if (mode === 'dev') { void ensureVision().catch(fail); return; }
      await ensureVision();
      if (mode === 'user' && room && current === cameraGeneration.current) await startRecognition();
    } catch (error) {
      stopCamera();
      const named = error as Error;
      fail(named.name === 'NotAllowedError' ? new Error('Chưa được cấp quyền camera. Mở quyền Camera của trang rồi thử lại.') : named.name === 'NotReadableError' ? new Error('Camera đang được app khác sử dụng. Đóng app đó rồi thử lại.') : error);
    } finally { setBusy(false); }
  }
  async function loop() {
    const current = ++generation.current;
    while (current === generation.current && stream.current && recognizing.current) {
      try {
          const next = await vision.current!.request<Prediction>('predict', { image: snapshot() });
          if (current !== generation.current || !recognizing.current) break;
          setQualityLabel(`${next.inliers ? `${next.inliers} chi tiết khớp` : next.reason}${next.latencyMs !== undefined ? ` · ${next.latencyMs} ms` : ''}`);
          lastPredictionAt.current = performance.now();
          setPrediction(temporal.current.push(next));
      } catch (error) { fail(error); setPrediction(emptyPrediction); break; }
      await new Promise(resolve => setTimeout(resolve, 60));
    }
  }
  async function startRecognition(update = false) {
    if (!room) return;
    const currentCamera = cameraGeneration.current;
    setPrediction(emptyPrediction); recognizing.current = false; generation.current++;
    const pending = !update && preparation.current ? preparation.current : prewarm(room, await refresh());
    const model = await pending;
    if (!stream.current || cameraGeneration.current !== currentCamera) return;
    temporal.current = new TemporalGate(); recognizing.current = true;
    setStatus(model.classes.length ? 'Đã nạp bộ phân loại đã học. Hướng camera vào khu vực đã quay.' : 'Phòng chưa có mẫu. Vào Dev để quay footage trước.');
    void loop();
  }
  function startRecording() {
    if (!stream.current || !room?.writeKey) return;
    setError('');
    if (!window.MediaRecorder) { setError('Trình duyệt chưa hỗ trợ quay video. Hãy cập nhật Chrome hoặc Safari.'); return; }
    const mime = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(value => MediaRecorder.isTypeSupported(value));
    if (!mime) { setError('Không tìm thấy định dạng quay được trên thiết bị này.'); return; }
    try {
      const recorderInstance = new MediaRecorder(stream.current, { mimeType: mime, videoBitsPerSecond: 450000 });
      const chunks: Blob[] = []; const initialCover = coverImage();
      recorder.current = recorderInstance; captures.current = []; setSampleCount(0); setSkipped(0); setElapsed(0); startedAt.current = performance.now();
      recorderInstance.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorderInstance.onerror = () => { fail(new Error('Quay video bị gián đoạn. Hãy kiểm tra video trước khi lưu.')); };
      recorderInstance.onstop = () => {
        if (captureTimer.current) clearInterval(captureTimer.current);
        if (stopTimer.current) clearTimeout(stopTimer.current);
        recordingNow.current = false; setRecording(false); generation.current++;
        const blob = new Blob(chunks, { type: recorderInstance.mimeType });
        setDraft({ blob, frames: [], captured: [...captures.current], duration: (performance.now() - startedAt.current) / 1000, cover: initialCover });
        captures.current = [];
        setLabel(''); setBackground(false); setKind('reference'); setStatus('Đã dừng quay. Đặt tên khu vực để lưu footage.');
      };
      recorderInstance.start(1000); recordingNow.current = true; setRecording(true);
      const capture = () => {
        if (!recordingNow.current || captures.current.length >= 30) return;
        try {
          const image = snapshot(), check = quality(image.data, image.width, image.height);
          setQualityLabel(check.reason);
          if (check.accepted) { captures.current.push({ image, t: (performance.now() - startedAt.current) / 1000, sharpness: check.sharpness }); setSampleCount(captures.current.length); }
          else setSkipped(value => value + 1);
        } catch { /* The next scheduled camera frame can recover. */ }
      };
      capture(); captureTimer.current = setInterval(capture, 200);
      stopTimer.current = setTimeout(stopRecording, CAPTURE_SECONDS * 1000);
    } catch (error) { fail(error); }
  }
  function stopRecording() {
    if (captureTimer.current) clearInterval(captureTimer.current);
    if (stopTimer.current) clearTimeout(stopTimer.current);
    recordingNow.current = false; generation.current++;
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setRecording(false);
  }
  async function submitFootage(event: React.FormEvent) {
    event.preventDefault(); if (!draft || !room || !label.trim()) return;
    setBusy(true); setError('');
    try {
      if (draft.blob.size > MAX_VIDEO_BYTES) throw new Error('Video vượt 24 MB của bản test. Tải video về để giữ lại, rồi quay đoạn ngắn hơn.');
      if (!draft.captured.length) throw new Error('Video chưa có frame rõ. Hãy giữ máy ổn định và quay lại 5 giây.');
      await ensureVision();
      let frames = draft.frames;
      if (!frames.length) {
        const selected = selectTrainingFrames(draft.captured);
        frames = [];
        for (let index = 0; index < selected.length; index++) {
          setStatus(`Đang học hình ảnh ${index + 1}/${selected.length}…`);
          const extracted = await vision.current!.request<{ feature: Feature | null }>('extract', { image: selected[index].image, t: selected[index].t });
          if (extracted.feature) frames.push(extracted.feature);
        }
        if (!frames.length) throw new Error('Không đọc được frame rõ từ video. Hãy quay lại nơi có ánh sáng tốt hơn.');
        setDraft(previous => previous ? { ...previous, frames } : previous);
      }
      if (!draft.savedId) {
        const savedId = await saveFootage(room, draft.blob, frames, { label: label.trim(), kind, background, duration: draft.duration, cover: draft.cover }, setStatus);
        setDraft(previous => previous ? { ...previous, frames, savedId } : previous);
      }
      const clips = await refresh();
      const trained = await prepareClassifier(room, clips, true);
      preparation.current = Promise.resolve(trained);
      setError('');
      setDraft(null); setStatus(`Đã huấn luyện ${trained.classes.filter(item => !item.background).length} khu vực. Chuyển sang User để thử ngay.`);
    } catch (error) { fail(error); } finally { setBusy(false); }
  }
  async function removeFootage(item: Footage) {
    if (!room) return;
    setBusy(true); setError('');
    try { await rpc('footage.delete', { footageId: item.id }, room, true); await refresh(); setStatus('Đã xóa footage và các mẫu liên quan.'); }
    catch (error) { fail(error); } finally { setBusy(false); }
  }
  async function download(item: Footage) {
    if (!room) return; setBusy(true); setError('');
    try { saveBlob(await downloadFootage(room, item, setStatus), `${item.label}.${item.mime.includes('mp4') ? 'mp4' : 'webm'}`); setStatus('Đã chuẩn bị video gốc để tải xuống.'); }
    catch (error) { fail(error); } finally { setBusy(false); }
  }
  async function evaluate() {
    if (!room) return; setBusy(true); setError(''); stopCamera();
    try {
      await ensureVision(); await prepareClassifier(room, footages);
      let correct = 0, wrong = 0, uncertain = 0, falseAccept = 0, total = 0;
      for (const clip of readyClips.filter(item => item.kind === 'validation')) {
        let offset: number | null = 0;
        while (offset !== null) {
          const page: { frames: Feature[]; next: number | null } = await rpc('frames.get', { footageId: clip.id, offset }, room);
          for (const feature of page.frames) {
            const output = await vision.current!.request<Prediction>('evaluate', { feature }); total++;
            if (clip.background) { if (output.label) { wrong++; falseAccept++; } else correct++; }
            else if (!output.label) uncertain++;
            else if (output.label.toLocaleLowerCase('vi') === clip.label.toLocaleLowerCase('vi')) correct++;
            else wrong++;
            setStatus(`Đang kiểm thử frame ${total}…`);
          }
          offset = page.next;
        }
      }
      setReport(`${total} frame kiểm thử riêng: ${correct} đúng, ${wrong} nhầm, ${uncertain} chưa chắc. Cảnh lạ bị nhận nhầm: ${falseAccept}. Kết quả chỉ áp dụng cho bộ kiểm thử này; frame cùng một clip có tương quan.`);
      setStatus('Đã kiểm thử. Footage kiểm thử không được đưa vào mẫu tham chiếu.');
    } catch (error) { fail(error); } finally { setBusy(false); }
  }
  async function trainSaved() {
    if (!room) return;
    setBusy(true); setError('');
    try {
      await ensureVision(); const clips = await refresh();
      const model = await prepareClassifier(room, clips, true);
      preparation.current = Promise.resolve(model);
      setStatus(`Đã huấn luyện lại ${model.classes.filter(item => !item.background).length} khu vực từ footage đã lưu.`);
    } catch (error) { fail(error); } finally { setBusy(false); }
  }
  function join(event: React.FormEvent) {
    event.preventDefault();
    try { const value = new URL(joinLink); if (value.origin !== location.origin || !value.searchParams.has('room')) throw new Error('Hãy dán link phòng được tạo bởi app này.'); location.assign(value.href); }
    catch (error) { fail(error); }
  }

  return <>
    <header className="header"><a className="brand" href="/" onClick={event => { event.preventDefault(); if (!recording && !busy && !draft) { stopCamera(); setMode(null); setError(''); } }}><img src="/icon.svg" alt="" /> <span>NoSleepClub <b>HIST</b></span></a><div className="header-actions"><span className="test-badge">Test</span><button className="icon-button" onClick={() => setShowQR(true)} aria-label="Mở mã QR"><Icon name="qr" /><span>Mã QR</span></button></div></header>
    <main>
      {!mode ? <section className="landing">
        <div className="landing-copy"><p className="project-note">Nhận diện nơi chốn qua camera</p><h1>Một nơi đã quay.<br />Một nơi được nhận ra.</h1><p>Dev ghi lại khung cảnh và đặt tên. User hướng camera vào đó để thử nhận diện.</p><p className="test-note">Hai vai trò đang ở chế độ test, chưa dùng tài khoản đăng nhập.</p></div>
        <div className="role-options">
          <button className="role-option user-option" onClick={() => void enter('user')} disabled={busy}><span className="role-symbol"><Icon name="camera" /></span><span className="role-title">User <small>Test</small></span><span>Hướng camera vào một nơi.<br />Xem app có nhận ra không.</span><strong>Vào User <span aria-hidden="true">↗</span></strong></button>
          <button className="role-option dev-option" onClick={() => void enter('dev')} disabled={busy}><span className="role-symbol"><Icon name="record" /></span><span className="role-title">Dev <small>Test</small></span><span>Quay footage, đặt tên khu vực.<br />Tạo bộ mẫu để thử.</span><strong>Vào Dev <span aria-hidden="true">↗</span></strong></button>
        </div>
        <div className="landing-bottom"><span><i /> Khi chưa nhận ra, app trả <b>...</b></span><button className="text-button" onClick={() => setShowQR(true)}>Mở app trên điện thoại <Icon name="qr" /></button></div>
      </section> : <>
        <div className="workspace-heading"><div><button className="text-button back" disabled={busy || recording || !!draft} onClick={() => { stopCamera(); setMode(null); }}><Icon name="back" /> Đổi vai trò</button><h1>{mode === 'dev' ? 'Ghi lại một nơi.' : 'Bạn đang nhìn nơi nào?'}</h1><p>{mode === 'dev' ? 'Một khu vực, một video 5 giây. Giữ máy tương đối ổn định; đặt tên rồi huấn luyện.' : 'Bộ mẫu đã học được nạp sẵn. Khớp mạnh thì hiện tên ngay; không khớp sẽ là ...'}</p></div><span className="mode-badge">{mode === 'dev' ? 'Dev' : 'User'} / Test</span></div>
        {mode === 'user' && !room ? <section className="join-panel"><Icon name="qr" /><h2>Mở một phòng test</h2><p>Ở Dev, quay và lưu footage rồi mở QR của phòng. Dùng điện thoại quét QR đó để vào User với cùng bộ mẫu.</p><form onSubmit={join}><label htmlFor="join-link">Hoặc dán link phòng</label><input id="join-link" type="url" value={joinLink} onChange={event => setJoinLink(event.target.value)} placeholder="https://…/?room=…#view=…" required /><button className="primary">Mở phòng</button></form><button className="text-button" disabled={busy} onClick={() => void enter('dev')}>Vào Dev để tạo phòng</button></section> : <div className="workspace">
          <section className="camera-panel" aria-label="Camera trực tiếp">
            <div className={`viewfinder ${recording ? 'recording' : ''}`}>
              <video ref={video} autoPlay muted playsInline hidden={!camera} />
              {!camera && <div className="camera-placeholder"><span className="frame-mark"><Icon name="camera" /></span><h2>Đưa khung cảnh vào camera</h2><p>Camera sau được ưu tiên trên điện thoại.</p><button className="light-button" disabled={busy} onClick={() => void openCamera()}>Bật camera</button></div>}
              {camera && <span className="camera-tag"><i /> {recording ? `Đang quay ${seconds(elapsed)}` : 'Live camera'}</span>}
              {camera && <button className="switch-camera" aria-label="Đổi camera trước hoặc sau" disabled={recording || busy || !!draft} onClick={() => { facing.current = facing.current === 'environment' ? 'user' : 'environment'; void openCamera(); }}>↻</button>}
              {mode === 'user' && <div className={`recognition-result ${prediction.label ? 'matched' : ''}`} role="status" aria-live="polite" aria-atomic="true"><span>{prediction.label ? 'Khu vực nhận diện' : 'Chưa xác nhận được khu vực'}</span><strong>{prediction.label || '...'}</strong><p>{prediction.reason}</p></div>}
            </div>
            <div className="camera-footer"><span className="quality-label"><i className={modelReady ? 'ready' : ''} />{qualityLabel}</span>{camera && <button className="text-button" disabled={recording || busy} onClick={stopCamera}>Tắt camera</button>}</div>
            {mode === 'dev' ? <div className="record-toolbar"><div><strong>{seconds(elapsed)} / 00:05</strong><span>{sampleCount} frame rõ · {skipped} frame bỏ qua</span></div><button className={`record-button ${recording ? 'is-recording' : ''}`} disabled={!camera || busy || !!draft} onClick={recording ? stopRecording : startRecording}><span />{recording ? 'Dừng quay' : 'Quay mẫu 5 giây'}</button></div> : <div className="user-tools"><span>{learnedCount || labels.size} khu vực đã học · {referenceClips.length} footage</span><button disabled={!camera || busy || !modelReady} onClick={() => { setBusy(true); startRecognition(true).catch(fail).finally(() => setBusy(false)); }}>Cập nhật mẫu</button></div>}
            <p className="camera-note">{mode === 'dev' ? 'Video tự dừng sau 5 giây. Các frame rõ được xử lý đầy đủ sau khi dừng, rồi lưu bộ phân loại để User dùng lại. Không cần quay dài hoặc quay nhiều lần.' : 'Khớp mạnh được nhận từ frame đầu; trường hợp yếu cần thêm một frame. Lần đầu trên thiết bị mới vẫn cần tải model. Camera User không tải ảnh lên server.'}</p>
          </section>
          <aside className="library"><div className="library-heading"><h2>{mode === 'dev' ? 'Footage của phòng' : 'Những nơi đã lưu'}</h2><span>{readyClips.length}</span></div><p>{mode === 'dev' ? 'Tên footage là nhãn của khu vực. Nhiều footage cùng tên bổ sung thêm góc nhìn.' : 'App chỉ có thể trả về các tên từ footage tham chiếu này.'}</p>
            {!footages.length && <div className="empty-library"><Icon name="record" /><strong>Chưa có footage</strong><p>{mode === 'dev' ? 'Bật camera, quay 5 giây rồi đặt tên và huấn luyện.' : 'Cần quay mẫu ở Dev trước khi nhận diện.'}</p></div>}
            <div className="footage-list">{footages.map(item => <article className="footage" key={item.id}><img src={item.cover} alt={`Khung hình ${item.label}`} /><div><h3>{item.label}</h3><span>{seconds(item.duration)} · {item.frameCount} frame · {sizeText(item.size)}</span><small>{item.status === 'pending' ? 'Lưu chưa hoàn tất' : item.kind === 'validation' ? 'Kiểm thử riêng' : item.background ? 'Mẫu cảnh khác' : 'Mẫu tham chiếu'}</small>{mode === 'dev' && <div className="footage-actions">{item.status === 'ready' && <button disabled={busy || recording} onClick={() => void download(item)}>Tải video</button>}<button disabled={busy || recording} onClick={() => void removeFootage(item)}>Xóa</button></div>}</div></article>)}</div>
            <div className="share-panel"><Icon name="qr" /><h3>Thử trên thiết bị khác</h3><p>QR của phòng mở cùng bộ mẫu, chỉ chia sẻ quyền xem và nhận diện.</p><button onClick={() => setShowQR(true)}>Mở QR của phòng</button></div>
            {mode === 'dev' && <div className="test-tools"><h3>Bộ nhận diện đã học</h3><p>Footage cũ vẫn dùng được. Có thể huấn luyện lại mà không quay lại video.</p><button disabled={busy || recording || !!draft || !referenceClips.some(item => item.frameCount > 0)} onClick={() => void trainSaved()}>Huấn luyện từ footage đã lưu</button></div>}
            {mode === 'dev' && <details className="test-tools"><summary>Kiểm thử độ tin cậy</summary><p>Quay footage mới, chọn “Kiểm thử riêng” khi lưu. Thử lại cùng tên khu vực và cả cảnh lạ; các footage này không làm mẫu tham chiếu.</p><button disabled={busy || recording || !readyClips.some(item => item.kind === 'validation')} onClick={() => void evaluate()}>Chạy kiểm thử riêng</button>{report && <p className="evaluation-report">{report}</p>}</details>}
          </aside>
        </div>}
      </>}
      <div className="status-bar" role="status">{busy && <span className="spinner" aria-hidden="true" />}{status}</div>
      {error && <div className="error" role="alert">{error}<button aria-label="Đóng thông báo lỗi" onClick={() => setError('')}>×</button></div>}
    </main>
    <footer className="footer"><span>NoSleepClub / HIST</span><span>Bản thử nghiệm nhận diện nơi chốn</span><a href="https://github.com/dakiemdarktharr/NoSleepClub_HIST" target="_blank" rel="noreferrer">Mã nguồn & tài liệu</a></footer>
    {draft && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="draft-title"><span className="test-badge">Video {CAPTURE_SECONDS} giây</span><h2 id="draft-title">Đặt tên rồi huấn luyện</h2><p>{seconds(draft.duration)} · {sizeText(draft.blob.size)} · {draft.captured.length} frame rõ đã giữ</p><form onSubmit={event => void submitFootage(event)}><label htmlFor="place-name">Tên khu vực</label><input autoFocus id="place-name" placeholder="Ví dụ: Bàn làm việc" maxLength={80} value={label} onChange={event => setLabel(event.target.value)} required disabled={busy || !!draft.savedId} /><label htmlFor="footage-kind">Dùng footage này để</label><select id="footage-kind" value={kind} onChange={event => setKind(event.target.value as typeof kind)} disabled={busy || !!draft.savedId}><option value="reference">Dạy model nhận diện khu vực này</option><option value="validation">Kiểm thử riêng, không làm mẫu</option></select><label className="checkbox-label"><input type="checkbox" checked={background} onChange={event => setBackground(event.target.checked)} disabled={busy || !!draft.savedId} /> Đây là cảnh khác, dùng để từ chối nhận diện</label>{!draft.captured.length && <p className="warning">Chưa có frame rõ. Tải video để giữ lại hoặc quay lại ở nơi đủ sáng, giữ máy ổn định.</p>}<button className="primary wide" disabled={busy || !label.trim() || !draft.captured.length || draft.blob.size > MAX_VIDEO_BYTES}>{draft.savedId ? 'Thử huấn luyện lại' : 'Lưu & huấn luyện'}</button></form><div className="modal-actions"><button disabled={busy} onClick={() => saveBlob(draft.blob, `footage.${draft.blob.type.includes('mp4') ? 'mp4' : 'webm'}`)}>Tải video gốc</button><button disabled={busy} onClick={() => { setDraft(null); setError(''); setStatus('Đã đóng footage.'); }}>Đóng</button></div>{busy && <p role="status">{status}</p>}{error && <p className="warning" role="alert">{error}</p>}</section></div>}
    {showQR && <div className="modal-backdrop" onClick={() => setShowQR(false)}><section className="modal qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={event => event.stopPropagation()}><button className="modal-close" aria-label="Đóng mã QR" onClick={() => setShowQR(false)}>×</button><h2 id="qr-title">{room ? 'Mở phòng trên điện thoại' : 'Mở HIST trên điện thoại'}</h2><p>{room ? 'Dùng camera điện thoại quét mã. Link có quyền xem mẫu và nhận diện; không có quyền sửa footage.' : 'Quét mã để chọn User hoặc Dev. Sau khi lưu footage, dùng QR của phòng để chia sẻ cùng bộ mẫu.'}</p>{qrImage && <img className="qr-image" src={qrImage} alt="Mã QR mở app HIST" />}<div className="qr-actions"><button onClick={() => { navigator.clipboard?.writeText(link).then(() => setStatus('Đã sao chép link.')).catch(fail); }}>Sao chép link</button><button disabled={!qrImage} onClick={() => { const a = document.createElement('a'); a.href = qrImage; a.download = 'HIST-QR.png'; a.click(); }}>Tải QR</button></div><p className="test-note">Nếu app nhắn tin chặn camera, mở link bằng Safari hoặc Chrome.</p></section></div>}
  </>;
}

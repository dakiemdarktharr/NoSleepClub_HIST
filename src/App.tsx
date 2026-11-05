import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { downloadFootage, loadCatalog, rememberRoom, restoreRoom, rpc, saveFootage, shareLink, Vision } from './client';
import { predictionFreshness, quality, TemporalGate } from './recognition';
import { currentModel, selectTrainingFrames, sourceIdsFor } from './fewshot';
import { readModelCache, writeModelCache } from './model-cache';
import { CAPTURE_SECONDS, MAX_VIDEO_BYTES, type CapturedFrame, type Feature, type Footage, type Mode, type Prediction, type Room, type TrainedClassifier } from './shared';
import Icon from './ui/Icon';
import { LanguageChoices, LanguageGate, useLocale } from './i18n';
import Modal from './ui/Modal';
import { CloudDragon, InkLandscape, Lantern } from './ui/Ornament';
import { ChangingTitle, useButtonMotion, useCurtain } from './ui/Motion';
import { BRAND, BRAND_FILE } from './brand';
import { useViewSwipe, type ViewTab } from './ui/useViewSwipe';
import TourPanel from './tour/TourPanel';
import { useTour } from './tour/useTour';
import { roomSite, siteById, TOUR_SITES, TOUR_ID, tourPlace, type TourSite } from './tour/content';
import { tourText } from './tour/copy';
import { publicReferenceModel } from './tour/publicModel';
import type { TourRouteRequest } from './maps/MapsPanel';
const MapsPanel = lazy(() => import('./maps/MapsPanel'));

type Draft = { blob: Blob; frames: Feature[]; captured: CapturedFrame[]; duration: number; cover: string; savedId?: string };
const emptyPrediction: Prediction = { label: null, reason: 'Chờ camera và mẫu tham chiếu', similarity: 0, inliers: 0 };
const seconds = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
const sizeText = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MB`;
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export default function App() {
  const { t, m, locale } = useLocale();
  const tour = useTour(locale === 'vi' ? 'vi' : 'en');
  const [languageChosen, setLanguageChosen] = useState(false);
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
  const [siteId, setSiteId] = useState('');
  const [useRoom, setUseRoom] = useState(!!room);
  const [tourRoute, setTourRoute] = useState<TourRouteRequest | null>(null);
  const [background, setBackground] = useState(false);
  const [kind, setKind] = useState<'reference' | 'validation'>('reference');
  const [showQR, setShowQR] = useState(false);
  const [qrTarget, setQrTarget] = useState<'room' | 'tour'>('room');
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [joinLink, setJoinLink] = useState('');
  const [report, setReport] = useState('');
  const [learnedCount, setLearnedCount] = useState(0);
  const [tab, setTab] = useState<ViewTab | 'tour'>('camera');
  const [mapsVisited, setMapsVisited] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const appRoot = useRef<HTMLDivElement>(null);
  const { transition, transitioning, curtains } = useCurtain();
  useButtonMotion(`${mode}:${tab}:${libraryOpen}:${!!draft}:${showQR}:${camera}:${busy}`);
  const video = useRef<HTMLVideoElement>(null);
  const viewfinder = useRef<HTMLDivElement>(null);
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
  const sourceIsRoom = useRef(useRoom); sourceIsRoom.current = useRoom;
  const activeRole = useRef(mode); activeRole.current = mode;
  const startedAt = useRef(0);
  const temporal = useRef(new TemporalGate());
  const lastPredictionAt = useRef(0);
  const freshnessMs = useRef(2500);
  const link = qrTarget === 'tour' ? location.origin + '/?tour=' + TOUR_ID : shareLink(room);
  const readyClips = footages.filter(item => item.status === 'ready');
  const referenceClips = readyClips.filter(item => item.kind === 'reference');
  const labels = new Set(referenceClips.filter(item => !item.background).map(item => item.label.toLocaleLowerCase('vi')));
  const matchedSite = useRoom ? roomSite(prediction.label, footages) : prediction.label?.startsWith('tour:') ? siteById(prediction.label.slice(5)) : undefined;

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
    // Match object-fit: cover exactly: the classifier must see the scene visible to the user.
    const bounds = viewfinder.current?.getBoundingClientRect();
    const targetAspect = bounds?.height ? bounds.width / bounds.height : element.videoWidth / element.videoHeight;
    const cropWidth = Math.min(element.videoWidth, element.videoHeight * targetAspect);
    const cropHeight = Math.min(element.videoHeight, element.videoWidth / targetAspect);
    const scale = Math.min(1, 512 / Math.max(cropWidth, cropHeight));
    canvas.current.width = Math.round(cropWidth * scale); canvas.current.height = Math.round(cropHeight * scale);
    const context = canvas.current.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(element, (element.videoWidth - cropWidth) / 2, (element.videoHeight - cropHeight) / 2, cropWidth, cropHeight, 0, 0, canvas.current.width, canvas.current.height);
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
  const changeView = useCallback((next: ViewTab | 'tour') => {
    if (mode !== 'user' || next === tab || busy || libraryOpen || showQR || !!draft || transitioning) return;
    if (next === 'maps' && !mapsVisited && !navigator.onLine) { setError(tourText(locale, 'offline')); return; }
    if (next !== 'camera') stopCamera();
    if (next === 'maps') setMapsVisited(true);
    setTab(next);
  }, [mode, tab, busy, libraryOpen, showQR, !!draft, transitioning, mapsVisited, locale]);
  useViewSwipe(appRoot, mode === 'user' && tab !== 'tour' && !busy && !libraryOpen && !showQR && !draft && !transitioning, changeView);
  const deepLinkEntered = useRef(false);
  useEffect(() => {
    if (languageChosen && tour.fresh) tour.dispatch({ type: 'language', language: locale === 'vi' ? 'vi' : 'en' });
  }, [languageChosen]);
  useEffect(() => {
    if (languageChosen && !deepLinkEntered.current && new URLSearchParams(location.search).get('tour') === TOUR_ID) {
      deepLinkEntered.current = true; enter('user');
    }
  }, [languageChosen]);
  function mapStop(site: TourSite) {
    const index = TOUR_SITES.indexOf(site);
    setTourRoute({ id: Date.now(), destination: tourPlace(site, tour.state.language), origin: index > 0 ? tourPlace(TOUR_SITES[index - 1], tour.state.language) : null });
    changeView('maps');
  }
  function openMatchedSite() {
    if (!matchedSite) return;
    tour.dispatch({ type: 'open', siteId: matchedSite.id }); changeView('tour');
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
      if (performance.now() - lastPredictionAt.current > freshnessMs.current) setPrediction(previous => previous.label ? { ...emptyPrediction, reason: 'Đang chờ khung hình xác nhận mới' } : previous);
    }, 250);
    return () => clearInterval(timer);
  }, [mode]);
  useEffect(() => {
    if (!showQR) return;
    let active = true;
    QRCode.toDataURL(link, { width: 640, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#172c42', light: '#ffffff' } }).then(value => { if (active) setQrImage(value); }).catch(error => { if (active) fail(error); });
    return () => { active = false; };
  }, [showQR, link]);

  function enter(next: Mode) {
    const publicWalk = next === 'user' && new URLSearchParams(location.search).get('tour') === TOUR_ID;
    activeRole.current = next;
    if (publicWalk) { sourceIsRoom.current = false; setUseRoom(false); }
    if (next === 'dev') { sourceIsRoom.current = true; setUseRoom(true); }
    setError(''); setTourRoute(null); setMapsVisited(false); setTab(next === 'user' ? 'tour' : 'camera'); setMode(next);
    setStatus(next === 'dev' ? 'Quay một video 5 giây để dạy khu vực.' : publicWalk || !useRoom || !room ? tourText(locale, 'publicSet') : 'Mở QR phòng để nạp bộ mẫu.');
    if (room && !publicWalk) void refresh(room).then(clips => {
      if (next === 'user' && activeRole.current === 'user' && sourceIsRoom.current) return prewarm(room, clips);
    }).catch(fail);
  }
  async function ensureDeveloperRoom() {
    if (room?.writeKey) return room;
    const target = await rpc<Room>('workspace.create');
    setRoom(target); setUseRoom(true); activeModelRoom.current = target.id; rememberRoom(target);
    history.replaceState(null, '', '?room=' + target.id); setFootages([]);
    return target;
  }
  async function openQR() {
    setLibraryOpen(false); setBusy(true); setError(''); setLinkCopied(false); setQrImage(''); setQrTarget('room');
    try { if (mode === 'dev') await ensureDeveloperRoom(); setShowQR(true); }
    catch (error) { fail(error); } finally { setBusy(false); }
  }
  function shareWalk() { setLibraryOpen(false); setQrTarget('tour'); setQrImage(''); setLinkCopied(false); setError(''); setShowQR(true); }
  async function openCamera() {
    setBusy(true); setError(''); stopCamera(); const current = cameraGeneration.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera cần HTTPS và trình duyệt hỗ trợ. Hãy mở link Vercel bằng Safari hoặc Chrome.');
      const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing.current }, width: { ideal: 960 }, height: { ideal: 540 } } });
      if (current !== cameraGeneration.current) { next.getTracks().forEach(track => track.stop()); return; }
      stream.current = next; video.current!.srcObject = next; await video.current!.play();
      setCamera(true); setQualityLabel('Camera trực tiếp');
      setStatus(mode === 'dev' ? 'Quay 5 giây, rồi đặt tên khu vực.' : 'Đang chuẩn bị nhận diện…');
      if (mode === 'dev') { void ensureVision().catch(fail); return; }
      // Camera permission/playback finishes independently of a cold model download.
      // A stale preparation must never restart recognition after switching to Maps.
      void ensureVision().then(async () => {
        if (current === cameraGeneration.current) await startRecognition();
      }).catch(error => { if (current === cameraGeneration.current) { stopCamera(); fail(error); } });
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
          freshnessMs.current = predictionFreshness(next.latencyMs || 0);
          setPrediction(temporal.current.push(next));
      } catch (error) { fail(error); setPrediction(emptyPrediction); break; }
      await new Promise(resolve => setTimeout(resolve, 60));
    }
  }
  async function startRecognition(update = false) {
    const currentCamera = cameraGeneration.current;
    setPrediction(emptyPrediction); recognizing.current = false; generation.current++;
    let model: TrainedClassifier;
    if (useRoom && room) {
      const pending = !update && preparation.current ? preparation.current : prewarm(room, await refresh());
      model = await pending;
    } else {
      activeModelRoom.current = null;
      await ensureVision(); model = await publicReferenceModel();
      if (!stream.current || cameraGeneration.current !== currentCamera) return;
      setLearnedCount(model.classes.length);
    }
    if (!stream.current || cameraGeneration.current !== currentCamera) return;
    await vision.current!.request('restore', { model });
    if (!stream.current || cameraGeneration.current !== currentCamera) return;
    temporal.current = new TemporalGate(); recognizing.current = true;
    setStatus(!useRoom ? tourText(locale, 'publicSet') : model.classes.length ? 'Đã nạp bộ phân loại đã học. Hướng camera vào khu vực đã quay.' : 'Phòng chưa có mẫu. Vào Dev để quay footage trước.');
    void loop();
  }
  function startRecording() {
    if (!stream.current) return;
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
        setLabel(''); setSiteId(''); setBackground(false); setKind('reference'); setStatus('Đã dừng quay. Đặt tên khu vực để lưu footage.');
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
    event.preventDefault(); if (!draft || !label.trim()) return;
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
      const target = await ensureDeveloperRoom();
      if (!draft.savedId) {
        const savedId = await saveFootage(target, draft.blob, frames, { label: label.trim(), ...(siteId && !background ? { siteId } : {}), kind, background, duration: draft.duration, cover: draft.cover }, setStatus);
        setDraft(previous => previous ? { ...previous, frames, savedId } : previous);
      }
      const clips = await refresh(target);
      const trained = await prepareClassifier(target, clips, true);
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
      await ensureVision(); const model = await prepareClassifier(room, footages);
      await vision.current!.request('restore', { model });
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

  async function leave() {
    stopCamera(); setLibraryOpen(false); setError('');
    await transition('wipe', () => { setMode(null); setTab('camera'); });
    document.querySelector<HTMLButtonElement>('.role-button')?.focus();
  }
  const visibleStatus = busy || !modelReady ? status : mode === 'dev' ? status : '';
  if (!languageChosen) return <LanguageGate onChoose={() => setLanguageChosen(true)}/>;
  return <>
    <div ref={appRoot} className={`app-shell ${mode ? 'in-workspace' : 'at-title'}`}>
      {!mode ? <main className="title-screen">
        <div className="tile-border" aria-hidden="true"/>
        <div className="title-masthead"><span className="brand-name" lang="vi">{BRAND}</span><span>{t('city')}</span></div>
        <Lantern/>
        <div className="title-center"><CloudDragon className="title-ornament"/><h1><ChangingTitle/></h1>
          <div className="role-choices" aria-label={t('chooseRole')}>
            <button className="role-button user-role" disabled={busy || transitioning} onClick={event => void transition('iris', () => enter('user'), event).catch(fail)}><span>{tourText(locale, 'explore')}</span><Icon name="chevron"/></button>
            <button className="role-button dev-role" disabled={busy || transitioning} onClick={event => void transition('iris', () => enter('dev'), event).catch(fail)}><span>{t('dev')}</span><Icon name="chevron"/></button>
          </div>
          {busy && <p className="title-feedback" role="status">{t('opening')}</p>}
          {error && <p className="title-feedback error-text" role="alert">{m(error)}</p>}
        </div>
        <InkLandscape/><div className="title-bottom-rule" aria-hidden="true"/>
      </main> : <>
        <header className="app-header"><div className="header-start"><button className="icon-button" aria-label={t('backRoles')} disabled={busy || recording || !!draft || transitioning} onClick={() => void leave()}><Icon name="back"/></button><span className="wordmark brand-name" lang="vi">{BRAND}</span><span className="role-indicator">{t(mode === 'dev' ? 'dev' : 'user')} <small>{t('test')}</small></span></div>
          {mode === 'user' && <nav className="view-tabs" role="tablist" aria-label={t('tools')} onKeyDown={event => {
            if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
            event.preventDefault(); const views = ['tour','camera','maps'] as const, index = views.indexOf(tab);
            const next = event.key === 'Home' ? 'tour' : event.key === 'End' ? 'maps' : views[(index + (event.key === 'ArrowLeft' ? 2 : 1)) % 3];
            changeView(next); document.getElementById('view-tab-' + next)?.focus();
          }}>
            <button id="view-tab-tour" role="tab" aria-label={tourText(locale, 'tour')} aria-selected={tab === 'tour'} aria-controls="view-tour" tabIndex={tab === 'tour' ? 0 : -1} disabled={busy || transitioning} onClick={() => changeView('tour')}><Icon name="book"/><span>{tourText(locale, 'tour')}</span></button>
            <button id="view-tab-camera" role="tab" aria-label={t('camera')} aria-selected={tab === 'camera'} aria-controls="view-camera" tabIndex={tab === 'camera' ? 0 : -1} disabled={busy || transitioning} onClick={() => changeView('camera')}><Icon name="camera"/><span>{t('camera')}</span></button>
            <button id="view-tab-maps" role="tab" aria-label={t('maps')} aria-selected={tab === 'maps'} aria-controls="view-maps" tabIndex={tab === 'maps' ? 0 : -1} disabled={busy || transitioning} onClick={() => changeView('maps')}><Icon name="map"/><span>{t('maps')}</span></button>
          </nav>}
          <button className="icon-button library-toggle" aria-label={t('tools')} disabled={recording || busy || !!draft} onClick={() => setLibraryOpen(true)}><Icon name="menu"/></button>
        </header>
        {mode === 'user' && tab !== 'tour' && <div className="view-swipe-rail" data-swipe-zone="views"><span aria-hidden="true">↔</span><span>{t('swipeViews')}</span></div>}
        <main className="workspace-main">
          <div className="view-stack" data-active-view={tab}>
          {mode === 'user' && <section id="view-tour" className={`tour-view workspace-view ${tab === 'tour' ? 'is-active' : 'before-active'}`} inert={tab !== 'tour'} aria-hidden={tab !== 'tour'} role="tabpanel" aria-labelledby="view-tab-tour"><TourPanel state={tour.state} dispatch={tour.dispatch} persisted={tour.persisted} active={tab === 'tour'} onMap={mapStop} onShare={shareWalk} onCamera={() => { setUseRoom(false); changeView('camera'); }}/></section>}
          <section id="view-camera" className={`camera-panel workspace-view ${tab === 'camera' ? 'is-active' : 'before-active'}`} inert={tab !== 'camera'} aria-hidden={tab !== 'camera'} role={mode === 'user' ? 'tabpanel' : undefined} aria-labelledby={mode === 'user' ? 'view-tab-camera' : undefined} aria-label={t('cameraRegion')}>
            <div ref={viewfinder} className={`viewfinder ${recording ? 'recording' : ''}`}>
              <video ref={video} autoPlay muted playsInline hidden={!camera}/>
              {!camera && <div className="camera-placeholder"><CloudDragon className="placeholder-ornament"/><h1>{mode === 'dev' ? t('captureTitle') : useRoom ? t('recognizeTitle') : tourText(locale, 'publicSet')}</h1><p>{mode === 'dev' ? t('fiveSecondHint') : useRoom ? room ? t('learnedPlaces', {n: learnedCount || labels.size}) : t('joinHint') : tourText(locale, 'cameraHint')}</p><button className="primary camera-start" disabled={busy} onClick={() => void openCamera()}><Icon name="camera"/>{t('startCamera')}</button>{mode === 'user' && <button className="camera-guide-link" onClick={() => changeView('tour')}>{tourText(locale, 'tour')} →</button>}</div>}
              {camera && <div className="camera-topline"><span className={`live-label ${recording ? 'is-recording' : ''}`}><i/>{recording ? `${seconds(elapsed)} / 00:05` : t('live')}</span><div className="camera-actions"><button className="glass-button" aria-label={t('switchCamera')} disabled={recording || busy || !!draft} onClick={() => { facing.current = facing.current === 'environment' ? 'user' : 'environment'; void openCamera(); }}>↻</button><button className="glass-button" aria-label={t('stopCamera')} disabled={recording || busy} onClick={stopCamera}><Icon name="close"/></button></div></div>}
              {mode === 'user' && camera && <div className={`recognition-result ${prediction.label ? 'matched' : ''}`} role="status" aria-live="polite" aria-atomic="true"><span>{prediction.label ? t('locatedAt') : t('unconfirmed')}</span><strong>{matchedSite ? matchedSite[tour.state.language].name : prediction.label || '...'}</strong>{!prediction.label && <p>{m(prediction.reason)}</p>}{matchedSite && <button className="primary recognized-story" onClick={openMatchedSite}><Icon name="book"/>{tourText(locale, 'openStory')}</button>}</div>}
              {mode === 'dev' && camera && <div className="capture-controls"><div className="capture-side">{recording ? <><span>{t('clearFrames', {n: sampleCount})}</span></> : <span>{t('secondsFive')}</span>}</div><button className={`capture-button ${recording ? 'is-recording' : ''}`} aria-label={recording ? t('stopRecording') : t('recordFive')} disabled={busy || !!draft} onClick={recording ? stopRecording : startRecording}><span/></button><div className="capture-side"><span>{recording ? t('stop') : t('record')}</span></div></div>}
            </div>
            <div className="camera-status"><span className="quality-label"><i className={modelReady ? 'ready' : ''}/>{!modelReady ? m(status) : camera ? m(qualityLabel) : t('modelReady')}</span>{visibleStatus && <span className="process-status" role="status">{busy && <i className="spinner"/>}{m(visibleStatus)}</span>}</div>
          </section>
          {mode === 'user' && <section id="view-maps" className={`map-view workspace-view ${tab === 'maps' ? 'is-active' : 'after-active'}`} inert={tab !== 'maps'} aria-hidden={tab !== 'maps'} role="tabpanel" aria-labelledby="view-tab-maps">{mapsVisited && <Suspense fallback={<div className="map-loading" role="status">{t('openingMaps')}</div>}><MapsPanel tourRequest={tourRoute}/></Suspense>}</section>}
          </div>
          {error && <div className="error-toast" role="alert"><span>{m(error)}</span><button className="icon-button" aria-label={t('closeError')} onClick={() => setError('')}><Icon name="close"/></button></div>}
        </main>
      </>}
    </div>
    {libraryOpen && <Modal title={t('library')} drawer onClose={() => setLibraryOpen(false)} locked={busy}>
      <details className="language-settings"><summary>{t('language')}</summary><LanguageChoices/></details><div className="library-toolbar"><p>{mode === 'user' && !useRoom ? `${tourText(locale, 'publicSet')} · ${TOUR_SITES.length}` : t('referenceCount', {n: referenceClips.length})}</p><button onClick={() => mode === 'user' && !useRoom ? shareWalk() : void openQR()}><Icon name="qr"/>{mode === 'user' && !useRoom ? tourText(locale, 'share') : t('roomQR')}</button></div>
      {mode === 'user' && <label className="tour-source-choice">{tourText(locale, 'cameraSet')}<select value={useRoom && room ? 'room' : 'public'} onChange={event => { stopCamera(); activeModelRoom.current = null; preparation.current = null; setUseRoom(event.target.value === 'room'); setLearnedCount(0); setStatus(''); }}><option value="public">{tourText(locale, 'publicSet')}</option>{room && <option value="room">{tourText(locale, 'roomSet')}</option>}</select></label>}
      {!room && <form className="join-form" onSubmit={join}><label htmlFor="join-link">{t('roomLink')}</label><div className="input-action"><input id="join-link" type="url" onInvalid={event=>event.currentTarget.setCustomValidity(t('validRoomLink'))} value={joinLink} onChange={event => {event.currentTarget.setCustomValidity('');setJoinLink(event.target.value);}} placeholder={t('pasteLink')} required/><button type="submit" aria-label={t('openRoom')}><Icon name="chevron"/></button></div></form>}
      {mode === 'user' && !useRoom && <p className="tour-library-hint">{tourText(locale, 'cameraHint')}</p>}
      {!footages.length && (mode === 'dev' || useRoom) && <div className="empty-library"><Icon name="record" size={32}/><h3>{t('noPlaces')}</h3><p>{mode === 'dev' ? t('noPlacesDev') : t('noPlacesUser')}</p></div>}
      <div className="footage-list">{footages.map(item => <article className="footage" key={item.id}><img src={item.cover} alt={t('coverAlt', {name: item.label})}/><div className="footage-copy"><h3>{item.label}</h3><p>{seconds(item.duration)} / {t('frames', {n: item.frameCount})}</p><small>{item.status === 'pending' ? t('pendingUpload') : item.kind === 'validation' ? t('validation') : item.background ? t('background') : t('reference')}</small>{mode === 'dev' && <div className="footage-actions">{item.status === 'ready' && <button disabled={busy} onClick={() => void download(item)}>{t('downloadVideo')}</button>}<button disabled={busy} onClick={() => void removeFootage(item)}>{t('delete')}</button></div>}</div></article>)}</div>
      {mode === 'user' && room && useRoom && <button className="secondary wide" disabled={busy} onClick={() => { setBusy(true); startRecognition(true).catch(fail).finally(() => setBusy(false)); }}>{t('refreshReferences')}</button>}
      {mode === 'dev' && <details className="advanced-tools"><summary>{t('trainTest')}</summary><p>{t('trainTestHint')}</p><button className="secondary wide" disabled={busy || !referenceClips.some(item => item.frameCount > 0)} onClick={() => void trainSaved()}>{t('retrain')}</button><button className="secondary wide" disabled={busy || !readyClips.some(item => item.kind === 'validation')} onClick={() => void evaluate()}>{t('evaluate')}</button>{report && <p className="evaluation-report">{m(report)}</p>}<p>{t('lastCapture', {clear: sampleCount, skipped})}</p></details>}
      <p className="drawer-status" role="status">{m(status)}</p>
      {error && <p className="warning" role="alert">{m(error)}</p>}
      <a className="source-link" href="https://github.com/dakiemdarktharr/NoSleepClub_HIST" target="_blank" rel="noreferrer">{t('sourceCode')}</a>
    </Modal>}
    {draft && <Modal title={t('namePlace')} onClose={() => { setDraft(null); setError(''); }} locked={busy}>
      <p className="draft-meta">{seconds(draft.duration)} / {sizeText(draft.blob.size)} / {t('clearFrames', {n: draft.captured.length})}</p>
      <form onSubmit={event => void submitFootage(event)} className="draft-form"><label htmlFor="place-name">{t('placeName')}</label><input autoFocus id="place-name" onInvalid={event=>event.currentTarget.setCustomValidity(t('requiredName'))} placeholder={t('deskExample')} maxLength={80} value={label} onChange={event => {event.currentTarget.setCustomValidity('');setLabel(event.target.value);}} required disabled={busy || !!draft.savedId}/>
        <label htmlFor="linked-site">{tourText(locale, 'bindSite')}</label><select id="linked-site" value={siteId} disabled={busy || !!draft.savedId || background} onChange={event => setSiteId(event.target.value)}><option value="">{tourText(locale, 'none')}</option>{TOUR_SITES.map(site => <option key={site.id} value={site.id}>{site[tour.state.language].name}</option>)}</select>
        <details className="draft-options"><summary>{t('footageOptions')}</summary><label htmlFor="footage-kind">{t('useFor')}</label><select id="footage-kind" value={kind} onChange={event => setKind(event.target.value as typeof kind)} disabled={busy || !!draft.savedId}><option value="reference">{t('reference')}</option><option value="validation">{t('validation')}</option></select><label className="checkbox-label"><input type="checkbox" checked={background} onChange={event => setBackground(event.target.checked)} disabled={busy || !!draft.savedId}/>{t('backgroundCheck')}</label></details>
        {!draft.captured.length && <p className="warning">{t('noClearFrames')}</p>}
        <button className="primary wide" disabled={busy || !label.trim() || !draft.captured.length || draft.blob.size > MAX_VIDEO_BYTES}>{busy ? <><i className="spinner"/>{t('learning')}</> : draft.savedId ? t('retryTrain') : t('saveTrain')}</button>
      </form>
      <div className="modal-actions"><button disabled={busy} onClick={() => saveBlob(draft.blob, `footage.${draft.blob.type.includes('mp4') ? 'mp4' : 'webm'}`)}>{t('downloadVideo')}</button><button disabled={busy} onClick={() => { setDraft(null); setError(''); }}>{draft.savedId ? t('close') : t('discardVideo')}</button></div>
      {busy && <p className="training-status" role="status">{m(status)}</p>}{error && <p className="warning" role="alert">{m(error)}</p>}
    </Modal>}
    {showQR && <Modal title={qrTarget === 'tour' ? tourText(locale, 'share') : room ? t('shareReferences') : t('openApp')} onClose={() => setShowQR(false)}><p>{qrTarget === 'tour' ? tourText(locale, 'intro') : t('qrHint')}</p>{qrImage && <img className="qr-image" src={qrImage} alt={t('qrAlt')}/>}<input aria-label={qrTarget === 'tour' ? tourText(locale, 'share') : t('roomLink')} readOnly value={link} onFocus={event => event.currentTarget.select()}/><div className="qr-actions"><button disabled={!navigator.clipboard} onClick={() => { navigator.clipboard?.writeText(link).then(() => setLinkCopied(true)).catch(fail); }}>{t('copyLink')}</button><button disabled={!qrImage} onClick={() => { const a = document.createElement('a'); a.href = qrImage; a.download = BRAND_FILE + '-QR.png'; a.click(); }}>{t('downloadQR')}</button></div>{linkCopied && <p role="status">{m('Đã sao chép link.')}</p>}{error && <p className="warning" role="alert">{m(error)}</p>}</Modal>}
    {curtains}
  </>;
}

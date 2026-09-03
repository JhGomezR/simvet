'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Crosshair,
  Eye,
  HeartPulse,
  Layers3,
  Maximize2,
  MousePointer2,
  Rotate3D,
  Thermometer,
  Wind,
  ZoomIn,
} from 'lucide-react';
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { ClinicalCase, PhysicalExamFinding, Vitals } from '@/lib/types';
import type { PatientStatus } from './vitals-monitor';
import { cn } from '@/lib/utils';

type Clinical3DSimulatorProps = {
  clinicalCase: ClinicalCase;
  activeFinding: PhysicalExamFinding | null;
  diagnosisText?: string;
  vitals: Vitals;
  patientStatus: PatientStatus;
};

type ViewMode = 'clinical' | 'anatomical';
type AnimalModel = 'dog' | 'cat';

type Region = {
  label: string;
  position: [number, number, number];
  size: [number, number, number];
};

const regions: Record<PhysicalExamFinding['system'], Region> = {
  cardiovascular: { label: 'Tórax · zona cardiovascular', position: [0.28, 0.65, 0], size: [0.68, 0.54, 0.52] },
  respiratorio: { label: 'Tórax · vías respiratorias', position: [0.08, 0.76, 0], size: [1.32, 0.74, 0.62] },
  digestivo: { label: 'Abdomen', position: [-0.28, 0.04, 0], size: [1.48, 0.82, 0.68] },
  neurologico: { label: 'Cabeza y sistema nervioso', position: [1.18, 1.05, 0], size: [0.7, 0.58, 0.6] },
  musculoesqueletico: { label: 'Extremidades y columna', position: [-0.1, -0.62, 0], size: [2.25, 1.15, 0.78] },
  tegumentario: { label: 'Piel y pelaje', position: [0, 0.27, 0], size: [2.35, 1.86, 1.18] },
  genitourinario: { label: 'Abdomen caudal', position: [-0.78, -0.14, 0], size: [0.82, 0.62, 0.58] },
  linfatico: { label: 'Ganglios periféricos', position: [0.78, 0.44, 0], size: [0.62, 0.7, 0.56] },
  general: { label: 'Evaluación general', position: [0, 0.25, 0], size: [2.3, 1.9, 1.15] },
};

const animalModels: Record<AnimalModel, { label: string; clinicalModelUrl: string; anatomicalModelUrl: string }> = {
  dog: {
    label: 'Perro',
    clinicalModelUrl: '/models/perro-3d.glb',
    anatomicalModelUrl: '/models/perro-anatomia-3d.glb',
  },
  cat: {
    label: 'Gato',
    clinicalModelUrl: '/models/gato-3d.glb',
    anatomicalModelUrl: '/models/gato-anatomia-3d.glb',
  },
};

const statusTone: Record<PatientStatus, string> = {
  Stable: 'bg-emerald-500',
  Improving: 'bg-emerald-500',
  Worsening: 'bg-amber-500',
  Unstable: 'bg-orange-500',
  Critical: 'bg-rose-500',
};

const statusLabel: Record<PatientStatus, string> = {
  Stable: 'Estable',
  Improving: 'Mejorando',
  Worsening: 'Empeorando',
  Unstable: 'Inestable',
  Critical: 'Crítico',
};

function getAnimalModel(species: string): AnimalModel {
  const value = species.trim().toLocaleLowerCase();
  return value.includes('fel') || value.includes('gat') || value.includes('cat') ? 'cat' : 'dog';
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />;
}

export function Clinical3DSimulator({
  clinicalCase,
  activeFinding,
  diagnosisText,
  vitals,
  patientStatus,
}: Clinical3DSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRef = useRef<Mesh | null>(null);
  const markerMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('clinical');

  const animal = getAnimalModel(clinicalCase.patient.species);
  const model = animalModels[animal];
  const activeModelUrl = viewMode === 'clinical' ? model.clinicalModelUrl : model.anatomicalModelUrl;
  const activeRegion = activeFinding ? regions[activeFinding.system] : null;
  const abnormalFindings = useMemo(
    () => clinicalCase.physicalExam?.filter((finding) => finding.isAbnormal) ?? [],
    [clinicalCase.physicalExam]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !activeRegion) {
      if (marker) marker.visible = false;
      return;
    }

    marker.position.set(...activeRegion.position);
    marker.scale.set(...activeRegion.size);
    marker.visible = true;
    markerMaterialRef.current?.color.set(activeFinding?.isAbnormal ? '#fb7185' : '#38bdf8');
    if (markerMaterialRef.current) markerMaterialRef.current.opacity = viewMode === 'anatomical' ? 0.09 : 0.16;
  }, [activeFinding, activeRegion, viewMode]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(model.anatomicalModelUrl, { signal: controller.signal }).catch(() => undefined);
    return () => controller.abort();
  }, [model.anatomicalModelUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setLoadError(false);
    let animationFrame = 0;
    let disposed = false;
    let dragging = false;
    let lastPointer = { x: 0, y: 0 };
    let targetRotation = { x: -0.12, y: -0.7 };
    let rotation = { ...targetRotation };
    let cameraDistance = 6.8;
    let patientModel: Group | null = null;

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const scene = new Scene();
    scene.background = new Color('#071420');
    const camera = new PerspectiveCamera(36, 1, 0.1, 100);
    const modelRoot = new Group();
    const pivot = new Group();
    scene.add(pivot);
    pivot.add(modelRoot);

    const ambient = new AmbientLight('#d8f5ff', 2.4);
    const key = new DirectionalLight('#ffffff', 3.8);
    key.position.set(4, 7, 6);
    key.castShadow = true;
    const rim = new DirectionalLight('#0ea5e9', 2.8);
    rim.position.set(-5, 3, -4);
    scene.add(ambient, key, rim);

    const floor = new Mesh(
      new PlaneGeometry(24, 24),
      new MeshStandardMaterial({ color: '#092335', metalness: 0.15, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.75;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new GridHelper(22, 30, '#155a7c', '#0d3450');
    grid.position.y = -1.73;
    scene.add(grid);

    const markerMaterial = new MeshBasicMaterial({ color: '#fb7185', transparent: true, opacity: 0.16, depthWrite: false });
    const marker = new Mesh(new BoxGeometry(1, 1, 1), markerMaterial);
    marker.visible = false;
    marker.renderOrder = 2;
    markerRef.current = marker;
    markerMaterialRef.current = markerMaterial;
    modelRoot.add(marker);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement ?? canvas);
    resize();

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      activeModelUrl,
      (gltf) => {
        if (disposed) return;
        const patient = gltf.scene;
        patientModel = patient;
        const bounds = new Box3().setFromObject(patient);
        const center = bounds.getCenter(new Vector3());
        const size = bounds.getSize(new Vector3());
        const largestSide = Math.max(size.x, size.y, size.z) || 1;
        const scale = 3.8 / largestSide;
        patient.position.sub(center);
        patient.scale.setScalar(scale);
        patient.traverse((object) => {
          const mesh = object as Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        modelRoot.add(patient);
        setLoading(false);
      },
      undefined,
      () => {
        if (!disposed) {
          setLoadError(true);
          setLoading(false);
        }
      }
    );

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      targetRotation.y += (event.clientX - lastPointer.x) * 0.012;
      targetRotation.x = Math.max(-0.7, Math.min(0.48, targetRotation.x + (event.clientY - lastPointer.y) * 0.009));
      lastPointer = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = () => {
      dragging = false;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraDistance = Math.max(3.5, Math.min(10, cameraDistance + event.deltaY * 0.006));
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const render = () => {
      rotation.x += (targetRotation.x - rotation.x) * 0.11;
      rotation.y += (targetRotation.y - rotation.y) * 0.11;
      pivot.rotation.set(rotation.x, rotation.y, 0);
      camera.position.set(0, 1.1, cameraDistance);
      camera.lookAt(0, 0, 0);
      if (marker.visible) markerMaterial.opacity = 0.12 + Math.sin(performance.now() / 300) * 0.04;
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      marker.geometry.dispose();
      markerMaterial.dispose();
      const disposedMaterials = new Set<MeshStandardMaterial>();
      patientModel?.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((rawMaterial) => {
          const material = rawMaterial as MeshStandardMaterial;
          if (!disposedMaterials.has(material)) {
            material.dispose();
            disposedMaterials.add(material);
          }
        });
      });
      renderer.dispose();
      markerRef.current = null;
      markerMaterialRef.current = null;
    };
  }, [activeModelUrl]);

  const toggleFullscreen = () => {
    const container = canvasRef.current?.closest('[data-simulator]') as HTMLElement | null;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen();
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const statusClass = statusTone[patientStatus];

  return (
    <section
      data-simulator
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        isFullscreen && 'h-screen rounded-none'
      )}
    >
      <div className="grid min-h-[470px] lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="relative min-h-[470px] overflow-hidden bg-[#061622]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-slate-950/80 to-transparent p-4 text-slate-100">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Crosshair className="h-4 w-4 text-cyan-300" /> Sala de urgencias 3D
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                <span className="rounded-full border border-slate-600 bg-slate-950/60 px-2 py-1">{model.label}</span>
                <span className={cn('rounded-full px-2 py-1 text-white', statusClass)}>{statusLabel[patientStatus]}</span>
                <span className="rounded-full border border-slate-600 bg-slate-950/60 px-2 py-1">{viewMode === 'clinical' ? 'Externo' : 'Interno'}</span>
              </div>
            </div>
            <button type="button" onClick={toggleFullscreen} className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-950/65 px-2.5 py-1.5 text-xs font-medium transition hover:bg-slate-800">
              <Maximize2 className="h-3.5 w-3.5" /> {isFullscreen ? 'Salir' : 'Ampliar'}
            </button>
          </div>

          <canvas ref={canvasRef} className="h-full w-full touch-none cursor-grab transition-opacity duration-300 active:cursor-grabbing" aria-label="Modelo 3D interactivo del paciente" />
          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-[#061622]/55 text-sm text-slate-100 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-full border border-slate-600 bg-slate-950/80 px-4 py-2.5 shadow-lg"><Spinner /> Cambiando modelo…</div>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-rose-100">No fue posible cargar la vista 3D del paciente.</div>
          )}
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-700 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
            <span className="flex items-center gap-1"><Rotate3D className="h-3.5 w-3.5 text-cyan-300" /> Arrastra</span>
            <span className="h-3 w-px bg-slate-600" />
            <span className="flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5 text-cyan-300" /> Zoom</span>
          </div>
        </div>

        <aside className="flex flex-col border-t bg-card lg:border-l lg:border-t-0">
          <div className="border-b p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Modo de exploración</p>
            <div className="mt-3 grid gap-2">
              <button type="button" aria-pressed={viewMode === 'clinical'} onClick={() => setViewMode('clinical')} className={cn('flex items-start gap-3 rounded-lg border p-3 text-left transition-all', viewMode === 'clinical' ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-primary/50 hover:bg-muted/50')}>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md', viewMode === 'clinical' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><Eye className="h-4 w-4" /></span>
                <span><span className="block text-sm font-semibold">Vista clínica</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">Animal en apariencia normal; observa signos externos.</span></span>
              </button>
              <button type="button" aria-pressed={viewMode === 'anatomical'} onClick={() => setViewMode('anatomical')} className={cn('flex items-start gap-3 rounded-lg border p-3 text-left transition-all', viewMode === 'anatomical' ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-primary/50 hover:bg-muted/50')}>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md', viewMode === 'anatomical' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><Layers3 className="h-4 w-4" /></span>
                <span><span className="block text-sm font-semibold">Vista anatómica</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">Partes internas del {model.label.toLocaleLowerCase()} y regiones relacionadas con el caso.</span></span>
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <section>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Monitor sincronizado</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600"><Activity className="h-3.5 w-3.5" /> En vivo</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/70 p-2.5"><p className="text-[10px] text-muted-foreground">FC</p><p className="mt-0.5 flex items-center gap-1 text-sm font-bold"><HeartPulse className="h-3.5 w-3.5 text-rose-500" />{vitals.heartRate}<span className="text-[10px] font-medium text-muted-foreground">lpm</span></p></div>
                <div className="rounded-lg bg-muted/70 p-2.5"><p className="text-[10px] text-muted-foreground">FR</p><p className="mt-0.5 flex items-center gap-1 text-sm font-bold"><Wind className="h-3.5 w-3.5 text-sky-500" />{vitals.respiratoryRate}<span className="text-[10px] font-medium text-muted-foreground">rpm</span></p></div>
                <div className="rounded-lg bg-muted/70 p-2.5"><p className="text-[10px] text-muted-foreground">Temperatura</p><p className="mt-0.5 flex items-center gap-1 text-sm font-bold"><Thermometer className="h-3.5 w-3.5 text-amber-500" />{vitals.temperature.toFixed(1)}<span className="text-[10px] font-medium text-muted-foreground">°C</span></p></div>
                <div className="rounded-lg bg-muted/70 p-2.5"><p className="text-[10px] text-muted-foreground">SpO₂</p><p className="mt-0.5 text-sm font-bold">{vitals.spO2 ?? '—'}{vitals.spO2 !== undefined && <span className="text-[10px] font-medium text-muted-foreground">%</span>}</p></div>
              </div>
            </section>

            <section className="border-t pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{viewMode === 'clinical' ? 'Hallazgo activo' : `Anatomía del ${model.label.toLocaleLowerCase()}`}</p>
              {activeFinding && activeRegion ? (
                <div className={cn('mt-2 rounded-lg border p-3', activeFinding.isAbnormal ? 'border-rose-200 bg-rose-50' : 'border-sky-200 bg-sky-50')}>
                  <div className="flex gap-2">
                    {activeFinding.isAbnormal ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />}
                    <div><p className="text-xs font-semibold">{activeRegion.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeFinding.finding}</p></div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2 rounded-lg border border-dashed p-3 text-xs leading-relaxed text-muted-foreground"><MousePointer2 className="h-4 w-4 shrink-0 text-primary" />Realiza una técnica en «Examen» para localizar el hallazgo en el modelo.</div>
              )}
            </section>

            {diagnosisText?.trim() && (
              <section className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">Diagnóstico indicado</p>
                <p className="mt-1 text-sm font-medium text-violet-950">{diagnosisText.trim()}</p>
              </section>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

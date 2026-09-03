'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Eye,
  Layers3,
  Maximize2,
  MousePointer2,
  Rotate3D,
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
import type { ClinicalCase, PhysicalExamFinding } from '@/lib/types';
import { cn } from '@/lib/utils';

type Clinical3DSimulatorProps = {
  clinicalCase: ClinicalCase;
  activeFinding: PhysicalExamFinding | null;
  diagnosisText?: string;
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

const animalModels: Record<AnimalModel, { label: string; modelUrl: string }> = {
  dog: { label: 'Perro', modelUrl: '/models/perro-3d.glb' },
  cat: { label: 'Gato', modelUrl: '/models/gato-3d.glb' },
};

function getAnimalModel(species: string): AnimalModel {
  const value = species.trim().toLocaleLowerCase();
  return value.includes('fel') || value.includes('gat') || value.includes('cat') ? 'cat' : 'dog';
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />;
}

export function Clinical3DSimulator({ clinicalCase, activeFinding, diagnosisText }: Clinical3DSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRef = useRef<Mesh | null>(null);
  const markerMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const anatomyGuideRef = useRef<Group | null>(null);
  const viewModeRef = useRef<ViewMode>('clinical');
  const surfaceMaterialsRef = useRef<Array<{
    material: MeshStandardMaterial;
    color: Color;
    opacity: number;
    transparent: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('clinical');

  const animal = getAnimalModel(clinicalCase.patient.species);
  const model = animalModels[animal];
  const activeRegion = activeFinding ? regions[activeFinding.system] : null;
  const abnormalFindings = useMemo(
    () => clinicalCase.physicalExam?.filter((finding) => finding.isAbnormal) ?? [],
    [clinicalCase.physicalExam]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !activeRegion || viewMode !== 'clinical') {
      if (marker) marker.visible = false;
      return;
    }

    marker.position.set(...activeRegion.position);
    marker.scale.set(...activeRegion.size);
    marker.visible = true;
    markerMaterialRef.current?.color.set(activeFinding?.isAbnormal ? '#fb7185' : '#38bdf8');
  }, [activeFinding, activeRegion, viewMode]);

  useEffect(() => {
    const anatomyView = viewMode === 'anatomical';
    viewModeRef.current = viewMode;
    anatomyGuideRef.current && (anatomyGuideRef.current.visible = anatomyView);
    for (const entry of surfaceMaterialsRef.current) {
      entry.material.transparent = anatomyView || entry.transparent;
      entry.material.opacity = anatomyView ? Math.min(entry.opacity, 0.3) : entry.opacity;
      entry.material.color.copy(entry.color);
      if (anatomyView) entry.material.color.lerp(new Color('#7dd3fc'), 0.26);
      entry.material.needsUpdate = true;
    }
  }, [viewMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setLoadError(false);
    surfaceMaterialsRef.current = [];
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

    const anatomyGuide = new Group();
    anatomyGuide.visible = viewModeRef.current === 'anatomical';
    Object.values(regions).forEach((region) => {
      const guide = new Mesh(
        new BoxGeometry(...region.size),
        new MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.11, depthWrite: false })
      );
      guide.position.set(...region.position);
      anatomyGuide.add(guide);
    });
    anatomyGuideRef.current = anatomyGuide;
    modelRoot.add(anatomyGuide);

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
      model.modelUrl,
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
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((rawMaterial) => {
              const material = rawMaterial as MeshStandardMaterial;
              if (!material.color) return;
              surfaceMaterialsRef.current.push({
                material,
                color: material.color.clone(),
                opacity: material.opacity,
                transparent: material.transparent,
              });
            });
          }
        });
        modelRoot.add(patient);
        const anatomyView = viewModeRef.current === 'anatomical';
        anatomyGuide.visible = anatomyView;
        surfaceMaterialsRef.current.forEach((entry) => {
          entry.material.transparent = anatomyView || entry.transparent;
          entry.material.opacity = anatomyView ? Math.min(entry.opacity, 0.3) : entry.opacity;
          if (anatomyView) entry.material.color.lerp(new Color('#7dd3fc'), 0.26);
          entry.material.needsUpdate = true;
        });
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
      anatomyGuide.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          (mesh.material as MeshBasicMaterial).dispose();
        }
      });
      renderer.dispose();
      markerRef.current = null;
      markerMaterialRef.current = null;
      anatomyGuideRef.current = null;
      surfaceMaterialsRef.current = [];
    };
  }, [model.modelUrl]);

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

  return (
    <section data-simulator className="overflow-hidden rounded-2xl border border-slate-800 bg-[#071420] shadow-2xl shadow-slate-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#081b2a] px-4 py-3 text-slate-100">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Crosshair className="h-4 w-4 text-cyan-300" />
            Exploración 3D vinculada al caso
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{clinicalCase.patient.name} · {model.label} · {viewMode === 'clinical' ? 'Vista clínica' : 'Vista anatómica'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-700 bg-slate-950/40 p-0.5">
            <button type="button" onClick={() => setViewMode('clinical')} className={cn('inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition', viewMode === 'clinical' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800')}>
              <Eye className="h-3.5 w-3.5" /> Vista clínica
            </button>
            <button type="button" onClick={() => setViewMode('anatomical')} className={cn('inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition', viewMode === 'anatomical' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800')}>
              <Layers3 className="h-3.5 w-3.5" /> Vista anatómica
            </button>
          </div>
          <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800">
            <Maximize2 className="h-3.5 w-3.5" /> {isFullscreen ? 'Salir' : 'Ampliar'}
          </button>
        </div>
      </div>

      <div className="grid min-h-[420px] lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,0.75fr)]">
        <div className="relative min-h-[420px] overflow-hidden">
          <canvas ref={canvasRef} className="h-full w-full touch-none cursor-grab active:cursor-grabbing" aria-label="Modelo 3D interactivo del paciente" />
          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-[#071420]/80 text-sm text-slate-200">
              <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2.5"><Spinner /> Cargando paciente 3D…</div>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-rose-200">No fue posible cargar el modelo 3D. Comprueba que el archivo del paciente esté disponible.</div>
          )}
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
            <span className="flex items-center gap-1"><Rotate3D className="h-3.5 w-3.5 text-cyan-300" /> Arrastra para girar</span>
            <span className="h-3 w-px bg-slate-600" />
            <span className="flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5 text-cyan-300" /> Rueda para zoom</span>
          </div>
        </div>

        <aside className="border-t border-slate-800 bg-[#0a1d2c] p-4 text-slate-100 lg:border-l lg:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{viewMode === 'clinical' ? 'Hallazgo clínico activo' : 'Mapa anatómico de referencia'}</p>
          {viewMode === 'anatomical' ? (
            <div className="mt-3">
              <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3">
                <p className="text-sm font-semibold">Sistemas anatómicos</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">La transparencia permite ubicar por región los sistemas que se revisan en el caso. No se carga un modelo de corazón independiente.</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.values(regions).slice(0, 8).map((region) => (
                  <div key={region.label} className="rounded-md border border-slate-700/80 bg-slate-950/25 px-2.5 py-2 text-xs text-slate-300">{region.label}</div>
                ))}
              </div>
            </div>
          ) : activeFinding && activeRegion ? (
            <div className="mt-3">
              <div className={cn('flex items-start gap-2 rounded-lg border p-3', activeFinding.isAbnormal ? 'border-rose-400/35 bg-rose-500/10' : 'border-cyan-400/30 bg-cyan-500/10')}>
                {activeFinding.isAbnormal ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />}
                <div>
                  <p className="text-sm font-semibold">{activeFinding.isAbnormal ? 'Alteración detectada' : 'Sin alteración relevante'}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{activeFinding.finding}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/35 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Ubicación marcada en 3D</p>
                <p className="mt-1 text-sm font-medium text-slate-100">{activeRegion.label}</p>
                <p className="mt-1 text-xs text-slate-400">Técnica: {activeFinding.technique}</p>
              </div>
              {diagnosisText?.trim() && (
                <div className="mt-3 rounded-lg border border-violet-400/30 bg-violet-500/10 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-violet-200">Diagnóstico indicado</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{diagnosisText.trim()}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-slate-700 p-4 text-center">
              <MousePointer2 className="mx-auto h-5 w-5 text-cyan-300" />
              <p className="mt-2 text-sm font-medium">Explora para localizar</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Al realizar una técnica en «Examen», aquí verás qué hallazgo se encontró y su ubicación.</p>
              {diagnosisText?.trim() && (
                <div className="mt-3 rounded-md border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-left">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-violet-200">Diagnóstico indicado</p>
                  <p className="mt-1 text-xs font-medium text-slate-100">{diagnosisText.trim()}</p>
                </div>
              )}
            </div>
          )}

          {abnormalFindings.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pendientes por examinar</p>
              <div className="mt-2 space-y-2">
                {abnormalFindings.filter((finding) => finding.id !== activeFinding?.id).slice(0, 3).map((finding) => (
                  <div key={finding.id} className="rounded-md border border-slate-700/80 bg-slate-950/25 px-3 py-2 text-xs text-slate-300">
                    <span className="font-medium text-slate-100">{regions[finding.system].label}</span><span className="text-slate-500"> · </span>{finding.technique}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

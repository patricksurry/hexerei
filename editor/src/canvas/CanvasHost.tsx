import {
  ACCENT_EDGE,
  ACCENT_HEX,
  ACCENT_VERTEX,
  buildScene,
  computeWorldBounds,
  type HitResult,
  hitTest,
  type MapModel,
  panBy,
  type SceneHighlight,
  type ViewportState,
  ZOOM_ANIMATION_DURATION,
  ZOOM_FIT_PADDING_FACTOR,
  ZOOM_SENSITIVITY,
  zoomAt,
} from '@hexmap/canvas';
import { Hex } from '@hexmap/core';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { drawScene } from './draw.js';
import { resolveCanvasTheme } from './resolve-theme';

export interface CanvasHostRef {
  resetZoom: () => void;
  centerOnHexes: (hexIds: string[]) => void;
}

interface CanvasHostProps {
  model: MapModel | null;
  highlights?: SceneHighlight[];
  segments?: string[][];
  onZoomChange?: (zoom: number) => void;
  onHitTest?: (result: HitResult) => void;
  onCursorHex?: (label: string | null) => void;
  onNavigate?: (direction: string) => void;
  paintTerrainKey?: string | null;
  paintTerrainColor?: string | null;
  paintGeometry?: 'hex' | 'edge' | 'vertex' | null;
  onPaintClick?: (hit: HitResult, shiftKey: boolean) => void;
}

export const CanvasHost = forwardRef<CanvasHostRef, CanvasHostProps>(
  (
    {
      model,
      highlights,
      segments,
      onZoomChange,
      onHitTest,
      onCursorHex,
      onNavigate,
      paintTerrainKey,
      paintTerrainColor,
      paintGeometry,
      onPaintClick,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Viewport state
    const viewportRef = useRef<ViewportState>({
      center: { x: 0, y: 0 },
      zoom: 1,
      width: 800,
      height: 600,
    });

    const fitZoomRef = useRef<number>(1);
    const canvasThemeRef = useRef(resolveCanvasTheme());
    const isDragging = useRef(false);
    const lastMouse = useRef<{ x: number; y: number } | null>(null);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const pendingFrame = useRef(0);

    useEffect(() => {
      canvasThemeRef.current = resolveCanvasTheme();
    }, []); // Re-resolve when model changes (typically on map load/new map)

    const [hoverType, setHoverType] = useState<'none' | 'hex' | 'edge' | 'vertex'>('none');

    const scheduleRender = () => {
      cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = requestAnimationFrame(render);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!(canvas && model)) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const vp = viewportRef.current;
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(vp.width * dpr);
      const targetH = Math.round(vp.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const theme = canvasThemeRef.current;

      const sceneHighlights = (highlights || []).map((hl) => {
        if (hl.color === ACCENT_HEX) return { ...hl, color: theme.accentHex };
        if (hl.color === ACCENT_EDGE) return { ...hl, color: theme.accentEdge };
        if (hl.color === ACCENT_VERTEX) return { ...hl, color: theme.accentVertex };
        return hl;
      });

      if (paintTerrainKey && paintTerrainColor && lastMouse.current) {
        const hit = hitTest(lastMouse.current, vp, model, { includeOffBoard: true });
        // Only show ghost preview if it matches the current paint geometry
        if (hit.type === paintGeometry) {
          if (hit.type === 'hex') {
            sceneHighlights.push({
              type: 'hex',
              hexIds: [hit.hexId],
              color: paintTerrainColor,
              style: 'ghost',
            });
          } else if (hit.type === 'edge') {
            sceneHighlights.push({
              type: 'edge',
              boundaryId: hit.boundaryId,
              color: paintTerrainColor,
              style: 'ghost',
            });
          } else if (hit.type === 'vertex') {
            sceneHighlights.push({
              type: 'vertex',
              vertexId: hit.vertexId,
              color: paintTerrainColor,
              style: 'ghost',
            });
          }
        }
      }

      const scene = buildScene(model, vp, {
        background: theme.background,
        highlights: sceneHighlights,
        segments,
      });
      drawScene(ctx, scene, { theme });
    };

    const fitExtent = () => {
      if (!(model && containerRef.current)) return;
      const { clientWidth, clientHeight } = containerRef.current;

      const centers = [];
      const orientation = Hex.orientationTop(model.grid.orientation);
      for (const hex of model.mesh.getAllHexes()) {
        centers.push(Hex.hexToPixel(Hex.hexFromId(hex.id), 1, orientation));
      }

      let zoom = 20;
      let center = { x: 0, y: 0 };

      if (centers.length > 0) {
        const bounds = computeWorldBounds(centers, 1, orientation);
        const worldWidth = bounds.max.x - bounds.min.x;
        const worldHeight = bounds.max.y - bounds.min.y;

        if (worldWidth > 0 && worldHeight > 0) {
          zoom = Math.min(clientWidth / (worldWidth * 1.1), clientHeight / (worldHeight * 1.1));
        }

        center = {
          x: (bounds.min.x + bounds.max.x) / 2,
          y: (bounds.min.y + bounds.max.y) / 2,
        };
      }

      viewportRef.current = {
        center,
        zoom,
        width: clientWidth,
        height: clientHeight,
      };

      fitZoomRef.current = zoom;
      if (onZoomChange) onZoomChange(100);
      scheduleRender();
    };

    // Fit viewport when the map identity changes (new/open), not on every render.
    // model.mesh is the stable identity — it changes only when a new map is loaded.
    const meshId = model?.mesh;
    useEffect(() => {
      fitExtent();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meshId]);

    useEffect(() => {
      scheduleRender();
    });

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          viewportRef.current = {
            ...viewportRef.current,
            width,
            height,
          };
          scheduleRender();
        }
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, [scheduleRender]);

    const handlePointerDown = (e: React.PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      isDragging.current = true;
      lastMouse.current = { x, y };
      dragStart.current = { x, y };

      if (e.currentTarget) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const screen = { x, y };

      if (isDragging.current && lastMouse.current) {
        const dx = x - lastMouse.current.x;
        const dy = y - lastMouse.current.y;
        viewportRef.current = panBy(viewportRef.current, { x: dx, y: dy });
        lastMouse.current = { x, y };
        scheduleRender();
      } else if (model) {
        const hit = hitTest(screen, viewportRef.current, model, {
          includeOffBoard: !!paintTerrainKey,
        });
        if (hit.type === 'hex') {
          onCursorHex?.(hit.offBoard ? null : hit.hexId);
        } else {
          onCursorHex?.(null);
        }
        setHoverType(hit.type);
        if (paintTerrainKey) {
          lastMouse.current = screen;
        }
        scheduleRender();
      }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      isDragging.current = false;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!(rect && dragStart.current && model)) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dist = Math.hypot(x - dragStart.current.x, y - dragStart.current.y);
      if (dist < 3) {
        const hit = hitTest(
          { x, y },
          viewportRef.current,
          model,
          paintTerrainKey ? { includeOffBoard: true } : undefined
        );

        if (paintTerrainKey) {
          if (onPaintClick) onPaintClick(hit, e.shiftKey);
        } else {
          if (onHitTest) onHitTest(hit);
        }
      }
      dragStart.current = null;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const factor = ZOOM_SENSITIVITY ** e.deltaY;
      viewportRef.current = zoomAt(viewportRef.current, { x, y }, factor);
      if (onZoomChange)
        onZoomChange(Math.round((viewportRef.current.zoom / fitZoomRef.current) * 100));
      scheduleRender();
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const animateZoom = (targetVp: ViewportState, duration = ZOOM_ANIMATION_DURATION) => {
      const startVp = { ...viewportRef.current };
      const startTime = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = 1 - (1 - progress) ** 3; // easeOutCubic

        viewportRef.current = {
          ...startVp,
          center: {
            x: startVp.center.x + (targetVp.center.x - startVp.center.x) * ease,
            y: startVp.center.y + (targetVp.center.y - startVp.center.y) * ease,
          },
          zoom: startVp.zoom + (targetVp.zoom - startVp.zoom) * ease,
        };

        if (onZoomChange) {
          onZoomChange(Math.round((viewportRef.current.zoom / fitZoomRef.current) * 100));
        }
        render();

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    useImperativeHandle(ref, () => ({
      resetZoom: () => {
        if (!(model && containerRef.current)) return;
        const { clientWidth, clientHeight } = containerRef.current;
        const centers = [];
        const orientation = Hex.orientationTop(model.grid.orientation);
        for (const hex of model.mesh.getAllHexes()) {
          centers.push(Hex.hexToPixel(Hex.hexFromId(hex.id), 1, orientation));
        }

        let zoom = 20;
        let center = { x: 0, y: 0 };

        if (centers.length > 0) {
          const bounds = computeWorldBounds(centers, 1, orientation);
          center = {
            x: (bounds.min.x + bounds.max.x) / 2,
            y: (bounds.min.y + bounds.max.y) / 2,
          };
          const worldWidth = bounds.max.x - bounds.min.x;
          const worldHeight = bounds.max.y - bounds.min.y;
          zoom = Math.min(
            clientWidth / (worldWidth * ZOOM_FIT_PADDING_FACTOR),
            clientHeight / (worldHeight * ZOOM_FIT_PADDING_FACTOR)
          );
        }

        animateZoom({
          ...viewportRef.current,
          center,
          zoom,
        });
      },
      centerOnHexes: (hexIds: string[]) => {
        if (!viewportRef.current || hexIds.length === 0 || !model) return;
        const orientation = Hex.orientationTop(model.grid.orientation);
        const centers = hexIds.map((id) => {
          const cube = Hex.hexFromId(id);
          return Hex.hexToPixel(cube, 1, orientation); // HEX_SIZE = 1
        });
        const bounds = computeWorldBounds(centers, 1, orientation);
        const _vp = viewportRef.current;
        // Center on the midpoint of the bounds, keep current zoom
        const targetCenter = {
          x: (bounds.min.x + bounds.max.x) / 2,
          y: (bounds.min.y + bounds.max.y) / 2,
        };

        animateZoom({
          ...viewportRef.current,
          center: targetCenter,
        });
      },
    }));

    return (
      <div
        ref={containerRef}
        className="canvas-host"
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            touchAction: 'none',
            display: 'block',
            cursor: paintTerrainKey
              ? 'crosshair'
              : isDragging.current
                ? 'grabbing'
                : hoverType !== 'none'
                  ? 'pointer'
                  : 'grab',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          tabIndex={0}
          onKeyDown={(e) => {
            if (!e.key.startsWith('Arrow')) return;

            const dirMap: Record<string, string> = e.shiftKey
              ? {
                  ArrowUp: 'NW',
                  ArrowDown: 'SE',
                }
              : {
                  ArrowLeft: 'W',
                  ArrowRight: 'E',
                  ArrowUp: 'NE',
                  ArrowDown: 'SW',
                };

            const direction = dirMap[e.key];
            if (direction) {
              e.preventDefault();
              onNavigate?.(direction);
            }
          }}
        />
      </div>
    );
  }
);

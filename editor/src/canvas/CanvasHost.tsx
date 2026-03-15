import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { drawScene } from './draw.js';
import { 
  MapModel, 
  ViewportState, 
  panBy, zoomAt, hitTest, buildScene, SceneHighlight, HitResult
} from '@hexmap/canvas';



export interface CanvasHostRef {
  resetZoom: () => void;
}

export interface CanvasHostProps {
  model: MapModel | null;
  highlights?: SceneHighlight[];
  segmentPath?: string[];
  onZoomChange?: (zoom: number) => void;
  onHitTest?: (result: HitResult) => void;
  onCursorHex?: (label: string | null) => void;
  onNavigate?: (direction: string) => void;
}

export const CanvasHost = forwardRef<CanvasHostRef, CanvasHostProps>(
  ({ model, highlights, segmentPath, onZoomChange, onHitTest, onCursorHex, onNavigate }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Viewport state
    const viewportRef = useRef<ViewportState>({
      center: { x: 0, y: 0 },
      zoom: 1,
      width: 800,
      height: 600
    });

    const isDragging = useRef(false);
    const lastMouse = useRef<{x: number, y: number} | null>(null);
    const dragStart = useRef<{x: number, y: number} | null>(null);

    // Initial fit
    useEffect(() => {
      if (!model || !containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      const centers = [];
      for (const hex of model.mesh.getAllHexes()) {
        centers.push(hex.id);
      }
      
      if (centers.length > 0) {
        // Just mock fitExtent for now to keep it simple, real logic would compute bounds
        viewportRef.current = { center: {x:0, y:0}, zoom: 20, width: clientWidth, height: clientHeight };
        if (onZoomChange) onZoomChange(20);
        requestAnimationFrame(render);
      }
    }, [model]);

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !model) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const vp = viewportRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = vp.width * dpr;
      canvas.height = vp.height * dpr;
      ctx.scale(dpr, dpr);

      const theme = {
        background: '#1a1a1a',
        gridStroke: '#333333',
        gridLineWidth: 1,
        terrainOpacity: 0.8,
        labelColor: '#888888',
        labelGlow: '#000000',
        selectionGlow: 10,
        hoverGlow: 5,
        featureLabelColor: '#ffffff',
        featureLabelShadow: '0px 2px 4px rgba(0,0,0,0.8)'
      };

      const scene = buildScene(model, vp, { background: theme.background, highlights, segmentPath });
      drawScene(ctx, scene, { theme });
    };

    useEffect(() => {
      render();
    }, [model, highlights, segmentPath]);

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
        requestAnimationFrame(render);
      } else if (model && onCursorHex) {
        const result = hitTest(screen, viewportRef.current, model);
        const label = result && result.type === 'hex' ? result.label : null;
        onCursorHex(label);
      }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      isDragging.current = false;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !dragStart.current || !model || !onHitTest) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const dist = Math.hypot(x - dragStart.current.x, y - dragStart.current.y);
      if (dist < 3) {
        const hit = hitTest({ x, y }, viewportRef.current, model);
        onHitTest(hit);
      }
      dragStart.current = null;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const factor = Math.pow(0.995, e.deltaY);
      viewportRef.current = zoomAt(viewportRef.current, { x, y }, factor);
      if (onZoomChange) onZoomChange(viewportRef.current.zoom);
      requestAnimationFrame(render);
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }, []);

    useImperativeHandle(ref, () => ({
      resetZoom: () => {
         // Mock reset
         if (onZoomChange) onZoomChange(20);
         requestAnimationFrame(render);
      }
    }));

    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block', cursor: isDragging.current ? 'grabbing' : 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key.startsWith('Arrow')) {
              e.preventDefault();
              onNavigate?.(e.key.replace('Arrow', '').toLowerCase());
            }
          }}
        />
      </div>
    );
  }
);

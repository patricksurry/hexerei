import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Hex } from '@hexmap/core';
import { MapModel } from '../model/map-model.js';
import { 
  ViewportState, 
  fitExtent, 
  computeWorldBounds, 
  panBy, 
  zoomAt 
} from '../model/viewport.js';
import { HEX_SIZE, hexAtScreen, hitTest } from '../model/hit-test.js';
import { buildScene } from '../model/scene.js';
import { drawScene } from './draw.js';
import { SceneHighlight } from '../model/selection.js';
import { HitResult } from '../types.js';
import './CanvasHost.css';

interface CanvasHostProps {
  model: MapModel | null;
  onCursorHex?: (label: string | null) => void;
  onZoomChange?: (zoom: number) => void;
  onHitTest?: (result: HitResult) => void;
  highlights?: SceneHighlight[];
}

export interface CanvasHostRef {
  resetZoom: () => void;
}

export const CanvasHost = forwardRef<CanvasHostRef, CanvasHostProps>(({ 
  model, 
  onCursorHex, 
  onZoomChange,
  onHitTest,
  highlights = []
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fitZoom, setFitZoom] = useState(1);
  const lastMousePos = useRef<{ x: number, y: number } | null>(null);
  const mouseDownPos = useRef<{ x: number, y: number } | null>(null);

  const performFit = useCallback((width: number, height: number): ViewportState | null => {
    if (!model) return null;
    const hexCenters = Array.from(model.mesh.getAllHexes()).map(a => 
      Hex.hexToPixel(Hex.hexFromId(a.id), HEX_SIZE, model.grid.hexTop)
    );
    const bounds = computeWorldBounds(hexCenters, HEX_SIZE, model.grid.hexTop);
    const initialVp = fitExtent(bounds, width, height);
    setFitZoom(initialVp.zoom);
    onZoomChange?.(100); // 100%
    return initialVp;
  }, [model, onZoomChange]);

  useImperativeHandle(ref, () => ({
    resetZoom: () => {
      if (containerRef.current) {
        const newVp = performFit(containerRef.current.clientWidth, containerRef.current.clientHeight);
        if (newVp) setViewport(newVp);
      }
    }
  }));

  // Resize: update viewport dimensions, fit on first load or model change
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      setViewport(vp => {
        if (!vp && model) {
          return performFit(width, height);
        }
        return vp ? { ...vp, width, height } : null;
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [model, performFit]);

  // Draw: rebuild scene and paint
  useEffect(() => {
    if (!model || !viewport || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Use devicePixelRatio for sharp rendering if possible, 
    // but for now keeping it simple.
    canvasRef.current.width = viewport.width;
    canvasRef.current.height = viewport.height;
    
    const bg = getComputedStyle(containerRef.current!).getPropertyValue('--bg-base').trim() || '#141414';
    const scene = buildScene(model, viewport, bg, highlights);

    drawScene(ctx, scene, { 
        labelMinZoom: 20, 
        labelColor: getComputedStyle(containerRef.current!).getPropertyValue('--text-muted') || '#555555' 
    });
  }, [model, viewport, highlights]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && lastMousePos.current && viewport) {
      const delta = {
        x: e.clientX - lastMousePos.current.x,
        y: e.clientY - lastMousePos.current.y
      };
      setViewport(vp => vp ? panBy(vp, delta) : null);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (model && viewport && onCursorHex) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const pt = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      onCursorHex(hexAtScreen(pt, viewport, model));
    }
  }, [isDragging, viewport, model, onCursorHex]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging && mouseDownPos.current && model && viewport && onHitTest) {
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 3) { // Click
        const rect = canvasRef.current!.getBoundingClientRect();
        const pt = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        onHitTest(hitTest(pt, viewport, model));
      }
    }
    setIsDragging(false);
    lastMousePos.current = null;
    mouseDownPos.current = null;
  }, [isDragging, model, viewport, onHitTest]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Arrow keys: 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW
    // For flat-top: Right=E(1), Left=W(4), Up=NW(5) or NE(0), Down=SE(2) or SW(3)
    if (e.key === 'ArrowRight') onHitTest?.({ type: 'hex', hexId: 'NAV', label: '1' });
    if (e.key === 'ArrowLeft') onHitTest?.({ type: 'hex', hexId: 'NAV', label: '4' });
    if (e.key === 'ArrowUp') onHitTest?.({ type: 'hex', hexId: 'NAV', label: '5' });
    if (e.key === 'ArrowDown') onHitTest?.({ type: 'hex', hexId: 'NAV', label: '2' });
  }, [onHitTest]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!viewport) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const pt = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(vp => {
        if (!vp) return null;
        const newVp = zoomAt(vp, pt, factor);
        onZoomChange?.(Math.round((newVp.zoom / fitZoom) * 100));
        return newVp;
    });
  }, [viewport, onZoomChange, fitZoom]);

  return (
    <div ref={containerRef} className="canvas-host-container">
      <canvas
        ref={canvasRef}
        className="canvas-host"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      />
      {!model && (
        <div className="canvas-loading">
          Loading HexMap...
        </div>
      )}
    </div>
  );
});

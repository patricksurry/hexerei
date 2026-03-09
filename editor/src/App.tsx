import { useState, useRef, useMemo, useEffect } from 'react';
import { AppLayout } from './layout/AppLayout';
import { CommandBar, CommandBarRef } from './components/CommandBar';
import { FeatureStack } from './components/FeatureStack';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { CanvasHost, CanvasHostRef } from './canvas/CanvasHost';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Selection, HitResult } from './types';
import { MapModel } from './model/map-model';
import { Hex, HexMapDocument } from '@hexmap/core';
import { parseHexPathInput, HexPathPreview } from './model/hex-path-preview';
import {
  SceneHighlight,
  clearSelection,
  selectHex,
  selectFeature,
  selectEdge,
  selectVertex,
  highlightsForSelection,
  highlightsForHover,
  topmostFeatureAtHex,
  boundaryIdToHexPath,
  vertexIdToHexPath
} from './model/selection';

export function App() {
  const [model, setModel] = useState<MapModel | null>(null);
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [commandValue, setCommandValue] = useState('');
  const [selection, setSelection] = useState<Selection>({ type: 'none' });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorHex, setCursorHex] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const [preview, setPreview] = useState<HexPathPreview | null>(null);

  const commandBarRef = useRef<CommandBarRef>(null);
  const canvasHostRef = useRef<CanvasHostRef>(null);

  useEffect(() => {
    fetch('/maps/battle-for-moscow.hexmap.yaml')
      .then(r => r.text())
      .then(yaml => setModel(MapModel.load(yaml)))
      .catch(err => console.error('Failed to load map:', err));
  }, []);

  useEffect(() => {
    if (model && commandValue && !commandValue.startsWith('>') && !commandValue.startsWith('/')) {
      setPreview(parseHexPathInput(commandValue, model));
    } else {
      setPreview(null);
    }
  }, [commandValue, model]);

  const shortcuts = useMemo(() => ({
    'mod+1': () => setLeftPanelVisible(v => !v),
    'mod+2': () => setRightPanelVisible(v => !v),
    'mod+0': () => canvasHostRef.current?.resetZoom(),
    'mod+k': () => commandBarRef.current?.focus(),
    'escape': () => setSelection(clearSelection()),
  }), []);

  useKeyboardShortcuts(shortcuts);

  const highlights = useMemo(() => {
    if (!model) return [];
    
    const previewHighlights: SceneHighlight[] = (preview && preview.hexIds.length > 0) 
      ? [{ type: 'hex', hexIds: preview.hexIds, color: '#00D4FF', style: 'ghost' }]
      : [];

    return [
      ...highlightsForSelection(selection, model),
      ...highlightsForHover(hoverIndex, model),
      ...previewHighlights
    ];
  }, [selection, hoverIndex, model, preview]);

  const stackSelectedIndices = useMemo(() => {
    if (!model) return [];
    if (selection.type === 'feature') return selection.indices;
    if (selection.type === 'hex') {
      const idx = topmostFeatureAtHex(selection.hexId, model);
      return idx !== null ? [idx] : [];
    }
    return [];
  }, [selection, model]);

  const handleHit = (result: HitResult) => {
    if (!result) {
      setSelection(clearSelection());
      return;
    }

    if (result.type === 'hex') {
      setSelection(selectHex(result.hexId, result.label));
      setCommandValue(result.label);
    }
    if (result.type === 'edge') {
      setSelection(selectEdge(result.boundaryId, result.hexLabels));
      if (model) setCommandValue(boundaryIdToHexPath(result.boundaryId, model));
    }
    if (result.type === 'vertex') {
      setSelection(selectVertex(result.vertexId));
      if (model) setCommandValue(vertexIdToHexPath(result.vertexId, model));
    }
  };

  const handleCommandSubmit = (value: string) => {
    if (!model || !value.trim()) return;

    if (value.startsWith('>')) {
      const cmd = value.substring(1).trim().toLowerCase();
      if (cmd === 'zoom fit') {
        canvasHostRef.current?.resetZoom();
      } else if (cmd === 'clear') {
        setSelection(clearSelection());
      }
      setCommandValue('');
      return;
    }

    if (value.startsWith('/')) return;

    const doc = new HexMapDocument(model.toYAML());
    doc.addFeature({
      at: value.trim(),
      terrain: 'clear', // Default
      label: 'New Feature'
    });

    const newYaml = doc.toString();
    setModel(MapModel.load(newYaml));
    setCommandValue('');
  };

  const handleNavigate = (direction: number) => {
    if (!model || selection.type !== 'hex') return;
    const cube = Hex.hexFromId(selection.hexId);
    const neighbor = Hex.hexNeighbor(cube, direction);
    const neighborId = Hex.hexId(neighbor);
    if (model.mesh.getHex(neighborId)) {
      setSelection(selectHex(neighborId, model.hexIdToLabel(neighborId)));
    }
  };

  const handleSelectFeature = (indices: number[], modifier: 'none' | 'shift' | 'cmd' = 'none') => {
    if (modifier === 'none' && indices.length > 1) {
      // Direct multi-index selection (e.g., range from FeatureStack): set all at once
      setSelection({ type: 'feature', indices: [...indices].sort((a, b) => a - b) });
    } else {
      setSelection(prev => selectFeature(indices[0], prev, modifier));
    }
    if (modifier === 'none' && indices.length === 1 && model) {
      const feature = model.features[indices[0]];
      if (feature) setCommandValue(feature.at);
    }
  };

  const features = model?.features ?? [];
  const mapTitle = model?.metadata?.title ?? 'Untitled';

  return (
    <AppLayout
      leftPanelVisible={leftPanelVisible}
      rightPanelVisible={rightPanelVisible}
      commandBar={
        <CommandBar
          ref={commandBarRef}
          value={commandValue}
          onChange={setCommandValue}
          onClear={() => setCommandValue('')}
          onSubmit={handleCommandSubmit}
          error={preview?.error?.message}
        />
      }
      leftPanel={
        <FeatureStack
          features={features}
          selectedIndices={stackSelectedIndices}
          terrainColor={(t) => model?.terrainColor(t) ?? '#888'}
          onSelect={handleSelectFeature}
          onHover={setHoverIndex}
        />
      }
      canvas={
        <CanvasHost 
          ref={canvasHostRef} 
          model={model} 
          onCursorHex={setCursorHex} 
          onZoomChange={setZoom} 
          onHitTest={handleHit}
          onNavigate={handleNavigate}
          highlights={highlights}
          segmentPath={preview?.segmentPath ?? []}
        />
      }
      rightPanel={
        <Inspector
          selection={selection}
          model={model}
          onSelectFeature={(idx) => handleSelectFeature([idx])}
        />
      }
      statusBar={
        <StatusBar
          cursor={cursorHex ?? (hoverIndex !== null && features[hoverIndex] ? features[hoverIndex].at.split(' ')[0] : '----')}
          zoom={zoom}
          mapTitle={mapTitle}
          dirty={false}
        />
      }
    />
  );
}

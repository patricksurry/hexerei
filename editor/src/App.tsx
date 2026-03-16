import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Hex } from '@hexmap/core';
import {
  MapModel,
  CommandHistory,
  MapCommand,
  Selection,
  HitResult,
  HexPathPreview,
  parseHexPathInput,
  SceneHighlight,
  clearSelection,
  selectHex,
  selectFeature,
  selectEdge,
  selectVertex,
  highlightsForSelection,
  highlightsForHover,
  highlightsForCursor,
  topmostFeatureAtHex,
  boundaryIdToHexPath,
  vertexIdToHexPath,
} from '@hexmap/canvas';
import { downloadFile } from './utils/download';
import { AppLayout } from './layout/AppLayout';
import { CommandBar, CommandBarRef } from './components/CommandBar';
import { FeatureStack } from './components/FeatureStack';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { CanvasHost, CanvasHostRef } from './canvas/CanvasHost';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useHybridFocus } from './hooks/useHybridFocus';
import { filterFeatures } from './utils/filter-features';

export const App = () => {
  const historyRef = useRef<CommandHistory | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const history = historyRef.current;
  const model = history?.currentState.model ?? null;
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [commandValue, setCommandValue] = useState('');
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ type: 'none' });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorHex, setCursorHex] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const [preview, setPreview] = useState<HexPathPreview | null>(null);
  const [theme, setTheme] = useState<'sandtable' | 'classic'>('sandtable');

  const commandBarRef = useRef<CommandBarRef>(null);
  const canvasHostRef = useRef<CanvasHostRef>(null);

  // Refs to avoid stale closures in keyboard shortcuts (useMemo with [] deps)
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const commandValueRef = useRef(commandValue);
  commandValueRef.current = commandValue;

  useEffect(() => {
    // Apply theme class to root element
    document.documentElement.classList.remove('theme-sandtable', 'theme-classic');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    fetch('/maps/battle-for-moscow.hexmap.yaml')
      .then((r) => r.text())
      .then((yaml) => {
        const newModel = MapModel.load(yaml);
        historyRef.current = new CommandHistory({ document: newModel.document, model: newModel });
        setHistoryVersion((v) => v + 1);
      })
      .catch((err) => console.error('Failed to load map:', err));
  }, []);

  useEffect(() => {
    if (model && commandValue && !commandValue.startsWith('>') && !commandValue.startsWith('/')) {
      setPreview(parseHexPathInput(commandValue, model));
    } else {
      setPreview(null);
    }
  }, [commandValue, model]);

  useEffect(() => {
    if (commandValue.startsWith('/')) {
      setFilterQuery(commandValue.substring(1));
    } else {
      setFilterQuery(null);
    }
  }, [commandValue]);

  const deleteSelected = useCallback(() => {
    const sel = selectionRef.current;
    if (sel.type === 'feature' && historyRef.current) {
      // Delete in reverse index order to preserve earlier indices.
      // Each deleteFeature is a separate command, but conceptually this is
      // one user action — so we group them: only one setHistoryVersion bump.
      for (const idx of [...sel.indices].sort((a, b) => b - a)) {
        historyRef.current.execute({ type: 'deleteFeature', index: idx });
      }
      setHistoryVersion((v) => v + 1);
      setSelection(clearSelection());
    }
  }, []);

  const shortcuts = useMemo(
    () => ({
      'mod+1': () => setLeftPanelVisible((v) => !v),
      'mod+2': () => setRightPanelVisible((v) => !v),
      'mod+0': () => canvasHostRef.current?.resetZoom(),
      'mod+k': () => commandBarRef.current?.focus(),
      'mod+z': () => {
        if (historyRef.current?.canUndo) {
          historyRef.current.undo();
          setHistoryVersion((v) => v + 1);
        }
      },
      'mod+shift+z': () => {
        if (historyRef.current?.canRedo) {
          historyRef.current.redo();
          setHistoryVersion((v) => v + 1);
        }
      },
      escape: () => {
        if (commandValueRef.current) {
          setCommandValue('');
          commandBarRef.current?.blur();
        } else {
          setSelection(clearSelection());
        }
      },
      tab: () => {
        const zones = [
          document.querySelector('.feature-stack .feature-list'),
          document.querySelector('.canvas-host canvas'),
          document.querySelector('.inspector input, .inspector select'),
        ].filter(Boolean) as HTMLElement[];

        const activeZone = zones.findIndex(
          (z) => z === document.activeElement || z.contains(document.activeElement)
        );
        const nextIdx = (activeZone + 1) % zones.length;
        zones[nextIdx]?.focus();
      },
      delete: deleteSelected,
      backspace: deleteSelected,
      'mod+s': () => {
        const yaml = historyRef.current?.currentState.document.toString() ?? '';
        const currentModel = historyRef.current?.currentState.model;
        const title = currentModel?.metadata.title?.replace(/\s+/g, '-').toLowerCase() || 'hexmap';
        downloadFile(yaml, `${title}.hexmap.yaml`, 'text/yaml');
        historyRef.current?.markSaved();
        setHistoryVersion((v) => v + 1);
      },
      'mod+d': () => {
        const sel = selectionRef.current;
        const currentModel = historyRef.current?.currentState.model;
        if (sel.type === 'feature' && sel.indices.length === 1 && currentModel) {
          const feature = currentModel.features[sel.indices[0]];
          if (feature && historyRef.current) {
            historyRef.current.execute({
              type: 'addFeature',
              feature: {
                at: feature.at,
                terrain: feature.terrain || undefined,
                label: feature.label ? `${feature.label} (copy)` : undefined,
              },
            });
            setHistoryVersion((v) => v + 1);
          }
        }
      },
    }),
    [deleteSelected]
  );

  useKeyboardShortcuts(shortcuts);

  const handleHybridCapture = useCallback((key: string) => {
    setCommandValue((prev) => prev + key);
    commandBarRef.current?.focus();
  }, []);

  useHybridFocus({ onCapture: handleHybridCapture });

  const filteredIndices = useMemo(() => {
    if (!filterQuery || !model) return null; // null = no filter active
    return filterFeatures(model.features, filterQuery);
  }, [filterQuery, model]);

  const highlights = useMemo(() => {
    if (!model) return [];

    const previewHighlights: SceneHighlight[] =
      preview && preview.hexIds.length > 0
        ? [{ type: 'hex', hexIds: preview.hexIds, color: '#00D4FF', style: 'ghost' }]
        : [];

    // Dim highlights for non-matching features when filter is active
    const dimHighlights: SceneHighlight[] = [];
    if (filteredIndices !== null) {
      const matchingHexIds = new Set(
        filteredIndices.flatMap((idx) => model.features[idx]?.hexIds ?? [])
      );
      const allHexIds = model.mesh.getAllHexes().map((h) => h.id);
      const dimHexIds = allHexIds.filter((id) => !matchingHexIds.has(id));
      if (dimHexIds.length > 0) {
        dimHighlights.push({ type: 'hex', hexIds: dimHexIds, color: '#000000', style: 'dim' });
      }
    }

    return [
      ...highlightsForSelection(selection, model),
      ...highlightsForHover(hoverIndex, model),
      ...highlightsForCursor(cursorHex, model),
      ...previewHighlights,
      ...dimHighlights,
    ];
  }, [selection, hoverIndex, cursorHex, model, preview, historyVersion, filteredIndices]);

  const stackSelectedIndices = useMemo(() => {
    if (!model) return [];
    if (selection.type === 'feature') return selection.indices;
    if (selection.type === 'hex') {
      const idx = topmostFeatureAtHex(selection.hexId, model);
      return idx !== null ? [idx] : [];
    }
    return [];
  }, [selection, model, historyVersion]);

  const gotoSuggestions = useMemo(() => {
    if (!model || !commandValue.startsWith('@')) return [];
    const query = commandValue.substring(1).toLowerCase();
    if (!query) {
      return model.features
        .filter((f) => f.label)
        .map((f) => ({ label: f.label!, index: f.index }));
    }
    return model.features
      .filter(
        (f) =>
          (f.label ?? '').toLowerCase().includes(query) ||
          (f.id ?? '').toLowerCase().includes(query)
      )
      .filter((f) => f.label || f.id)
      .map((f) => ({ label: f.label ?? f.id ?? `Feature ${f.index}`, index: f.index }));
  }, [commandValue, model]);

  const handleHit = (result: HitResult) => {
    if (!result || result.type === 'none') {
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
      } else if (cmd === 'theme sandtable') {
        setTheme('sandtable');
      } else if (cmd === 'theme classic') {
        setTheme('classic');
      } else if (cmd === 'export yaml' || cmd === 'export') {
        const yaml = historyRef.current?.currentState.document.toString() ?? '';
        const title = model.metadata.title?.replace(/\s+/g, '-').toLowerCase() || 'hexmap';
        downloadFile(yaml, `${title}.hexmap.yaml`, 'text/yaml');
        historyRef.current?.markSaved();
        setHistoryVersion((v) => v + 1);
      } else if (cmd === 'export json') {
        const doc = historyRef.current?.currentState.document;
        const json = JSON.stringify(doc?.toJS() ?? {}, null, 2);
        const title = model.metadata.title?.replace(/\s+/g, '-').toLowerCase() || 'hexmap';
        downloadFile(json, `${title}.hexmap.json`, 'application/json');
        historyRef.current?.markSaved();
        setHistoryVersion((v) => v + 1);
      }
      setCommandValue('');
      return;
    }

    if (value.startsWith('/')) return;

    if (value.startsWith('@')) {
      const query = value.substring(1).toLowerCase();
      if (!model) return;
      const match = model.features.find(
        (f) => (f.label ?? '').toLowerCase() === query || (f.id ?? '').toLowerCase() === query
      );
      if (match) {
        handleSelectFeature([match.index]);
        // Center viewport on feature's hexes
        if (match.hexIds.length > 0) {
          canvasHostRef.current?.centerOnHexes(match.hexIds);
        }
      }
      setCommandValue('');
      return;
    }

    if (historyRef.current) {
      const cmd: MapCommand = { type: 'addFeature', feature: { at: value.trim() } };
      historyRef.current.execute(cmd);
      setHistoryVersion((v) => v + 1);
    }
    setCommandValue('');
  };

  const handleNavigate = (directionName: string) => {
    if (!model || selection.type !== 'hex') return;
    const direction = Hex.directionIndex(directionName, Hex.orientationTop(model.grid.orientation));
    const cube = Hex.hexFromId(selection.hexId);
    const neighbor = Hex.hexNeighbor(cube, direction);
    const neighborId = Hex.hexId(neighbor);
    if (model.mesh.getHex(neighborId)) {
      setSelection(
        selectHex(
          neighborId,
          Hex.formatHexLabel(
            neighbor,
            model.grid.labelFormat,
            model.grid.orientation,
            model.grid.firstCol,
            model.grid.firstRow
          )
        )
      );
    }
  };

  const handleSelectFeature = (indices: number[], modifier: 'none' | 'shift' | 'cmd' = 'none') => {
    if (modifier === 'none' && indices.length > 1) {
      // Direct multi-index selection (e.g., range from FeatureStack): set all at once
      setSelection({ type: 'feature', indices: [...indices].sort((a, b) => a - b) });
    } else {
      setSelection((prev) => selectFeature(indices[0], prev, modifier));
    }
    if (modifier === 'none' && indices.length === 1 && model) {
      const feature = model.features[indices[0]];
      if (feature) setCommandValue(feature.at);
    }
  };

  const dispatch = (cmd: MapCommand) => {
    if (!historyRef.current) return;
    historyRef.current.execute(cmd);
    setHistoryVersion((v) => v + 1);
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
          gotoSuggestions={gotoSuggestions}
        />
      }
      leftPanel={
        <FeatureStack
          features={features}
          filteredIndices={filteredIndices}
          selectedIndices={stackSelectedIndices}
          terrainColor={(t) => model?.terrainColor(t) ?? '#888'}
          onSelect={handleSelectFeature}
          onHover={setHoverIndex}
          dispatch={dispatch}
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
          dispatch={dispatch}
        />
      }
      statusBar={
        <StatusBar
          cursor={
            cursorHex ??
            (hoverIndex !== null && features[hoverIndex]
              ? features[hoverIndex].at.split(' ')[0]
              : '----')
          }
          zoom={zoom}
          mapTitle={mapTitle}
          dirty={history?.isDirty ?? false}
        />
      }
    />
  );
};

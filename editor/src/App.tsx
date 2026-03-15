import { useState, useRef, useMemo, useEffect } from 'react';
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
import { AppLayout } from './layout/AppLayout';
import { CommandBar, CommandBarRef } from './components/CommandBar';
import { FeatureStack } from './components/FeatureStack';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { CanvasHost, CanvasHostRef } from './canvas/CanvasHost';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

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
      escape: () => setSelection(clearSelection()),
    }),
    []
  );

  useKeyboardShortcuts(shortcuts);

  const filteredIndices = useMemo(() => {
    if (!filterQuery || !model) return null; // null = no filter active
    const query = filterQuery.toLowerCase();

    // Key:value search (e.g., "terrain:forest")
    const colonIdx = query.indexOf(':');
    if (colonIdx > 0) {
      const key = query.substring(0, colonIdx).trim();
      const value = query.substring(colonIdx + 1).trim();
      return model.features
        .filter((f) => {
          switch (key) {
            case 'terrain': return f.terrain.toLowerCase().includes(value);
            case 'label': return (f.label ?? '').toLowerCase().includes(value);
            case 'id': return (f.id ?? '').toLowerCase().includes(value);
            case 'at': return f.at.toLowerCase().includes(value);
            case 'tags': return f.tags.some((t) => t.toLowerCase().includes(value));
            default: return false;
          }
        })
        .map((f) => f.index);
    }

    // Fuzzy match across all fields
    return model.features
      .filter((f) =>
        f.terrain.toLowerCase().includes(query) ||
        (f.label ?? '').toLowerCase().includes(query) ||
        (f.id ?? '').toLowerCase().includes(query) ||
        f.at.toLowerCase().includes(query) ||
        f.tags.some((t) => t.toLowerCase().includes(query))
      )
      .map((f) => f.index);
  }, [filterQuery, model]);

  const highlights = useMemo(() => {
    if (!model) return [];

    const previewHighlights: SceneHighlight[] =
      preview && preview.hexIds.length > 0
        ? [{ type: 'hex', hexIds: preview.hexIds, color: '#00D4FF', style: 'ghost' }]
        : [];

    return [
      ...highlightsForSelection(selection, model),
      ...highlightsForHover(hoverIndex, model),
      ...highlightsForCursor(cursorHex, model),
      ...previewHighlights,
    ];
  }, [selection, hoverIndex, cursorHex, model, preview, historyVersion]);

  const stackSelectedIndices = useMemo(() => {
    if (!model) return [];
    if (selection.type === 'feature') return selection.indices;
    if (selection.type === 'hex') {
      const idx = topmostFeatureAtHex(selection.hexId, model);
      return idx !== null ? [idx] : [];
    }
    return [];
  }, [selection, model, historyVersion]);

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
      }
      setCommandValue('');
      return;
    }

    if (value.startsWith('/')) return;

    if (history) {
      const cmd: MapCommand = { type: 'addFeature', feature: { at: value.trim() } };
      history.execute(cmd);
      setHistory(new CommandHistory(history.currentState)); // Ensure re-render
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

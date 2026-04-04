import {
  ACCENT_HEX,
  boundaryIdToHexPath,
  CommandHistory,
  clearSelection,
  type HexPathPreview,
  type HitResult,
  highlightsForCursor,
  highlightsForHover,
  highlightsForSelection,
  type MapCommand,
  MapModel,
  parseHexPathInput,
  type SceneHighlight,
  type Selection,
  selectEdge,
  selectFeature,
  selectHex,
  selectVertex,
  topmostFeatureAtEdge,
  topmostFeatureAtHex,
  topmostFeatureAtVertex,
  vertexIdToHexPath,
} from '@hexmap/canvas';
import { Hex, HexPath } from '@hexmap/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasHost, type CanvasHostRef } from './canvas/CanvasHost';
import { CommandBar, type CommandBarRef } from './components/CommandBar';
import { FeatureStack } from './components/FeatureStack';
import { Inspector } from './components/Inspector';
import { NewMapDialog } from './components/NewMapDialog';
import { PaintBadge } from './components/PaintBadge';
import { ShortcutsOverlay } from './components/ShortcutsOverlay';
import { StatusBar } from './components/StatusBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useHybridFocus } from './hooks/useHybridFocus';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppLayout } from './layout/AppLayout';
import { downloadFile } from './utils/download';
import { filterFeatures } from './utils/filter-features';

export const App = () => {
  const historyRef = useRef<CommandHistory | null>(null);
  const [_historyVersion, setHistoryVersion] = useState(0);
  const history = historyRef.current;
  const model = history?.currentState.model ?? null;
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [commandValue, setCommandValue] = useState('');
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ type: 'none' });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorHex, setCursorHex] = useState<string | null>(null);
  const cursorLabel = useMemo(() => {
    if (!(cursorHex && model)) return null;
    return Hex.formatHexLabel(
      Hex.hexFromId(cursorHex),
      model.grid.labelFormat,
      model.grid.orientation,
      model.grid.firstCol,
      model.grid.firstRow
    );
  }, [cursorHex, model]);
  const [zoom, setZoom] = useState(0);
  const [preview, setPreview] = useState<HexPathPreview | null>(null);
  const [theme, setTheme] = useState<'sandtable' | 'classic'>('sandtable');
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [paintState, setPaintState] = useState<{
    terrainKey: string;
    geometry: 'hex' | 'edge' | 'vertex';
    targetFeatureIndex: number | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHexPath = useCallback(() => {
    if (!model) return null;
    return new HexPath(model.mesh, {
      labelFormat: model.grid.labelFormat,
      orientation: model.grid.orientation,
      firstCol: model.grid.firstCol,
      firstRow: model.grid.firstRow,
    });
  }, [model]);

  const commandBarRef = useRef<CommandBarRef>(null);
  const canvasHostRef = useRef<CanvasHostRef>(null);

  // Refs to avoid stale closures in keyboard shortcuts (useMemo with [] deps)
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const commandValueRef = useRef(commandValue);
  commandValueRef.current = commandValue;
  const paintStateRef = useRef(paintState);
  paintStateRef.current = paintState;

  useEffect(() => {
    // Apply theme class to root element
    document.documentElement.classList.remove('theme-sandtable', 'theme-classic');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    // Only show the new map dialog if there is no map loaded and it's the initial load
    if (!historyRef.current) {
      setShowNewMapDialog(true);
    }
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
      'mod+n': () => setShowNewMapDialog(true),
      'mod+o': () => fileInputRef.current?.click(),
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
        if (paintStateRef.current) {
          setPaintState(null);
        } else if (commandValueRef.current) {
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
    if (!(filterQuery && model)) return null; // null = no filter active
    return filterFeatures(model.features, filterQuery);
  }, [filterQuery, model]);

  const highlights = useMemo(() => {
    if (!model) return [];

    const previewHighlights: SceneHighlight[] =
      preview && preview.hexIds.length > 0
        ? [{ type: 'hex', hexIds: preview.hexIds, color: ACCENT_HEX, style: 'ghost' }]
        : [];

    // Dim highlights for non-matching features when filter is active
    const dimHighlights: SceneHighlight[] = [];
    if (filteredIndices !== null) {
      const matchingHexIds = new Set(
        filteredIndices.flatMap((idx) => model.features[idx]?.hexIds ?? [])
      );
      const allHexIds = Array.from(model.mesh.getAllHexes()).map((h: { id: string }) => h.id);
      const dimHexIds = allHexIds.filter((id: string) => !matchingHexIds.has(id));
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
  }, [selection, hoverIndex, cursorHex, model, preview, filteredIndices]);

  const stackSelectedIndices = useMemo(() => {
    if (!model) return [];
    if (selection.type === 'feature') return selection.indices;
    if (selection.type === 'hex') {
      const idx = topmostFeatureAtHex(selection.hexId, model);
      return idx !== null ? [idx] : [];
    }
    return [];
  }, [selection, model]);

  const gotoSuggestions = useMemo(() => {
    if (!(model && commandValue.startsWith('@'))) return [];
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

  const handlePaintClick = (hit: HitResult, shiftKey: boolean, altKey: boolean) => {
    if (!(paintState && model) || hit.type === 'none') return;
    if (hit.type !== paintState.geometry) return;

    const hp = getHexPath();
    if (!hp) return;

    // Convert hit to atom string
    let atomId = '';
    if (hit.type === 'hex') {
      if (!model.mesh.getHex(hit.hexId)) return;
      atomId = hp.idToAtom(hit.hexId, 'hex');
    } else if (hit.type === 'edge') {
      atomId = hp.idToAtom(hit.boundaryId, 'edge');
    } else if (hit.type === 'vertex') {
      atomId = hp.idToAtom(hit.vertexId, 'vertex');
    }
    if (!atomId) return;

    const targetIndex = paintState.targetFeatureIndex;

    // Alt-click: remove atom from feature
    if (altKey && targetIndex !== null) {
      const feature = model.features[targetIndex];
      const existing = feature.at ? hp.resolve(feature.at) : { segments: [], type: hit.type };
      const segments = [...(existing.segments ?? [])];
      const newAtomResult = hp.resolve(atomId);
      const removeId = newAtomResult.items[0];

      // Remove from segments: filter out matching IDs, drop empty segments
      const filtered = segments
        .map((seg) => seg.filter((id) => id !== removeId))
        .filter((seg) => seg.length > 0);

      const newAt = hp.serialize(filtered, hit.type);
      dispatch({ type: 'updateFeature', index: targetIndex, changes: { at: newAt } });
      setCommandValue(newAt);
      handleSelectFeature([targetIndex]);
      return;
    }

    if (targetIndex !== null) {
      const feature = model.features[targetIndex];
      // Parse existing expression into segments
      const existing = feature.at ? hp.resolve(feature.at) : { segments: [], type: hit.type };
      const segments = [...(existing.segments ?? [])];

      if (shiftKey && segments.length > 0) {
        // Extend last segment (connected path)
        const lastSegment = segments[segments.length - 1];
        const newAtomResult = hp.resolve(atomId);
        const newId = newAtomResult.items[0];
        lastSegment.push(newId);
      } else {
        // New disconnected atom (singleton segment)
        const newAtomResult = hp.resolve(atomId);
        const newId = newAtomResult.items[0];
        // Deduplicate: skip if this atom already exists in any segment
        const allIds = segments.flat();
        if (!allIds.includes(newId)) {
          segments.push([newId]);
        }
      }

      const newAt = hp.serialize(segments, hit.type);
      dispatch({ type: 'updateFeature', index: targetIndex, changes: { at: newAt } });
      setCommandValue(newAt);
      handleSelectFeature([targetIndex]);
    } else {
      // New paint session — create new feature
      dispatch({ type: 'addFeature', feature: { at: atomId, terrain: paintState.terrainKey } });
      const newIndex = model.features.length;
      setPaintState({ ...paintState, targetFeatureIndex: newIndex });
      setCommandValue(atomId);
      handleSelectFeature([newIndex]);
    }
  };

  const handleHit = (result: HitResult) => {
    if (!result || result.type === 'none') {
      setSelection(clearSelection());
      return;
    }

    if (model) {
      if (result.type === 'hex') {
        const featureIdx = topmostFeatureAtHex(result.hexId, model);
        if (featureIdx !== null) {
          handleSelectFeature([featureIdx]);
          return;
        }
        setSelection(selectHex(result.hexId, result.label));
        setCommandValue(result.label);
      } else if (result.type === 'edge') {
        const featureIdx = topmostFeatureAtEdge(result.boundaryId, model);
        if (featureIdx !== null) {
          handleSelectFeature([featureIdx]);
          return;
        }
        setSelection(selectEdge(result.boundaryId, result.hexLabels));
        setCommandValue(boundaryIdToHexPath(result.boundaryId, model));
      } else if (result.type === 'vertex') {
        const featureIdx = topmostFeatureAtVertex(result.vertexId, model);
        if (featureIdx !== null) {
          handleSelectFeature([featureIdx]);
          return;
        }
        setSelection(selectVertex(result.vertexId));
        setCommandValue(vertexIdToHexPath(result.vertexId, model));
      }
    }
  };

  const handleCommandSubmit = (value: string) => {
    if (!value.trim()) return;

    // Commands that work without a model
    if (value.startsWith('>')) {
      const cmd = value.substring(1).trim().toLowerCase();
      if (cmd === 'new') {
        setShowNewMapDialog(true);
        setCommandValue('');
        return;
      } else if (cmd === 'open') {
        fileInputRef.current?.click();
        setCommandValue('');
        return;
      } else if (cmd === 'shortcuts' || cmd === 'keys' || cmd === 'help') {
        setShowShortcuts(true);
        setCommandValue('');
        return;
      }
    }

    if (!model) return;

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
      } else if (cmd === 'export json') {
        const doc = historyRef.current?.currentState.document;
        const json = JSON.stringify(doc?.toJS() ?? {}, null, 2);
        const title = model.metadata.title?.replace(/\s+/g, '-').toLowerCase() || 'hexmap';
        downloadFile(json, `${title}.hexmap.json`, 'application/json');
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
      const sel = selectionRef.current;
      if (sel.type === 'feature' && sel.indices.length === 1) {
        // Edit selected feature's `at` expression
        const cmd: MapCommand = {
          type: 'updateFeature',
          index: sel.indices[0],
          changes: { at: value.trim() },
        };
        historyRef.current.execute(cmd);
      } else {
        // No feature selected — create new feature
        const cmd: MapCommand = { type: 'addFeature', feature: { at: value.trim() } };
        historyRef.current.execute(cmd);
      }
      setHistoryVersion((v) => v + 1);
    }
    setCommandValue('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const newModel = MapModel.load(text);
        historyRef.current = new CommandHistory({ document: newModel.document, model: newModel });
        setHistoryVersion((v) => v + 1);
        setSelection(clearSelection());
      } catch (err) {
        console.error('Failed to parse map file:', err);
      }
    };
    reader.readAsText(file);

    // Clear input so the same file can be selected again
    e.target.value = '';
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

  const commandBarPlaceholder = useMemo(() => {
    if (selection.type === 'hex') return `Add features at ${selection.label}, or > for commands…`;
    if (selection.type === 'feature' && model) {
      const f = model.features[selection.indices[0]];
      return f ? `Editing ${f.label || f.terrain || 'feature'}, or > for commands…` : undefined;
    }
    return undefined;
  }, [selection, model]);

  return (
    <>
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
            placeholder={commandBarPlaceholder}
          />
        }
        leftPanel={
          <FeatureStack
            features={features}
            filteredIndices={filteredIndices}
            selectedIndices={stackSelectedIndices}
            terrainColor={(t, geo) =>
              model?.terrainColor(geo as 'hex' | 'edge' | 'vertex', t) ?? '#888'
            }
            onSelect={handleSelectFeature}
            onHover={setHoverIndex}
            dispatch={dispatch}
            orientation={model?.grid.orientation}
          />
        }
        canvas={
          <>
            {model ? (
              <CanvasHost
                ref={canvasHostRef}
                model={model}
                onCursorHex={setCursorHex}
                onZoomChange={setZoom}
                onHitTest={handleHit}
                onNavigate={handleNavigate}
                highlights={highlights}
                segments={preview?.segments ?? []}
                paintTerrainKey={paintState?.terrainKey ?? null}
                paintTerrainColor={
                  paintState
                    ? model?.terrainColor(paintState.geometry, paintState.terrainKey)
                    : null
                }
                paintGeometry={paintState?.geometry ?? null}
                onPaintClick={handlePaintClick}
              />
            ) : (
              <WelcomeScreen
                onNewMap={() => setShowNewMapDialog(true)}
                onOpenMap={() => fileInputRef.current?.click()}
              />
            )}
            {paintState && (
              <PaintBadge
                terrainKey={paintState.terrainKey}
                terrainColor={
                  model?.terrainColor(paintState.geometry, paintState.terrainKey) ?? '#888'
                }
                onExit={() => setPaintState(null)}
              />
            )}
          </>
        }
        rightPanel={
          <Inspector
            selection={selection}
            model={model}
            onSelectFeature={(idx) => handleSelectFeature([idx])}
            dispatch={dispatch}
            paintTerrainKey={paintState?.terrainKey ?? null}
            paintGeometry={paintState?.geometry ?? null}
            onPaintActivate={(key, geometry) =>
              setPaintState(
                key && geometry ? { terrainKey: key, geometry, targetFeatureIndex: null } : null
              )
            }
          />
        }
        statusBar={
          <StatusBar
            cursor={
              cursorLabel ??
              (hoverIndex !== null && features[hoverIndex]
                ? features[hoverIndex].at.split(' ')[0]
                : '----')
            }
            zoom={zoom}
            mapTitle={mapTitle}
            dirty={history?.isDirty ?? false}
            paintTerrainKey={paintState?.terrainKey ?? null}
            paintTerrainColor={
              paintState ? model?.terrainColor(paintState.geometry, paintState.terrainKey) : null
            }
          />
        }
      />

      {showNewMapDialog && (
        <NewMapDialog
          onCreateMap={(yaml) => {
            try {
              const newModel = MapModel.load(yaml);
              historyRef.current = new CommandHistory({
                document: newModel.document,
                model: newModel,
              });
              setHistoryVersion((v) => v + 1);
              setSelection(clearSelection());
              setShowNewMapDialog(false);
            } catch (err) {
              console.error('Failed to create map:', err);
              // In a real app we'd show an error state in the dialog
            }
          }}
          onCancel={() => setShowNewMapDialog(false)}
        />
      )}

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".yaml,.yml,.json"
        onChange={handleFileChange}
      />
    </>
  );
};

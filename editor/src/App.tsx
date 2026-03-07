import React, { useState, useRef, useMemo } from 'react';
import { AppLayout } from './layout/AppLayout';
import { CommandBar, CommandBarRef } from './components/CommandBar';
import { FeatureStack } from './components/FeatureStack';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { CanvasPlaceholder } from './components/CanvasPlaceholder';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { FeatureItem, Selection } from './types';

const MOCK_FEATURES: FeatureItem[] = [
  { index: 0, terrain: 'clear', at: '@all', isBase: true },
  { index: 1, id: 'moscow', terrain: 'major_city', label: 'Moscow', at: '0507', isBase: false },
  { index: 2, terrain: 'forest', at: '0302 0303 0402', isBase: false },
  { index: 3, terrain: 'river', at: '0405:se 0506:nw', isBase: false },
  { index: 4, terrain: 'mountain', at: '0101 0102 0201', isBase: false },
];

export function App() {
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [commandValue, setCommandValue] = useState('');
  const [selection, setSelection] = useState<Selection>({ type: 'none' });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const commandBarRef = useRef<CommandBarRef>(null);

  const shortcuts = useMemo(() => ({
    'mod+1': () => setLeftPanelVisible(v => !v),
    'mod+2': () => setRightPanelVisible(v => !v),
    'mod+k': () => commandBarRef.current?.focus(),
  }), []);

  useKeyboardShortcuts(shortcuts);

  const handleSelectFeature = (indices: number[]) => {
    setSelection({ type: 'feature', indices });
  };

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
        />
      }
      leftPanel={
        <FeatureStack
          features={MOCK_FEATURES}
          selectedIndices={selection.type === 'feature' ? selection.indices : []}
          onSelect={handleSelectFeature}
          onHover={setHoverIndex}
        />
      }
      canvas={<CanvasPlaceholder />}
      rightPanel={
        <Inspector
          selection={selection}
          features={MOCK_FEATURES}
          mapTitle="Battle for Moscow"
        />
      }
      statusBar={
        <StatusBar
          cursor={hoverIndex !== null ? MOCK_FEATURES[hoverIndex].at.split(' ')[0] : '----'}
          zoom={100}
          mapTitle="Battle for Moscow"
          dirty={false}
        />
      }
    />
  );
}

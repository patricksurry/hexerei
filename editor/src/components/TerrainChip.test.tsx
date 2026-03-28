import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { TerrainChip } from './TerrainChip';

test('renders hex geometry as filled hexagon', () => {
  const { container } = render(<TerrainChip color="#2d6a1e" geometry="hex" />);
  expect(container.querySelector('polygon')).toBeInTheDocument();
});

test('renders edge geometry as line', () => {
  const { container } = render(<TerrainChip color="#0044cc" geometry="edge" />);
  expect(container.querySelector('line')).toBeInTheDocument();
});

test('renders vertex geometry as dot', () => {
  const { container } = render(<TerrainChip color="#FFD600" geometry="vertex" />);
  expect(container.querySelector('circle')).toBeInTheDocument();
});

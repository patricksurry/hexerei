import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FeatureStack } from './FeatureStack';
import type { FeatureItem } from '../types';

const mockFeatures: FeatureItem[] = [
  { index: 0, terrain: 'clear', at: '@all', isBase: true },
  { index: 1, id: 'moscow', terrain: 'major_city', label: 'Moscow', at: '0507', isBase: false },
  { index: 2, terrain: 'forest', at: '0302 0303 0402', isBase: false },
];

test('renders all feature rows', () => {
  render(<FeatureStack features={mockFeatures} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('displays terrain label and HexPath preview', () => {
  render(<FeatureStack features={mockFeatures} />);
  expect(screen.getByText('Moscow')).toBeInTheDocument();
  expect(screen.getByText('0507')).toBeInTheDocument();
});

test('marks the @all feature as base layer', () => {
  render(<FeatureStack features={mockFeatures} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAttribute('data-base', 'true');
});

test('calls onSelect when a feature row is clicked', async () => {
  const onSelect = vi.fn();
  render(<FeatureStack features={mockFeatures} onSelect={onSelect} />);
  await userEvent.click(screen.getByText('Moscow'));
  expect(onSelect).toHaveBeenCalledWith([1]);
});

test('calls onHover when mouse enters a feature row', async () => {
  const onHover = vi.fn();
  render(<FeatureStack features={mockFeatures} onHover={onHover} />);
  await userEvent.hover(screen.getAllByRole('listitem')[2]);
  expect(onHover).toHaveBeenCalledWith(2);
});

test('highlights the selected feature', () => {
  render(<FeatureStack features={mockFeatures} selectedIndices={[1]} />);
  const items = screen.getAllByRole('listitem');
  expect(items[1]).toHaveAttribute('aria-selected', 'true');
});

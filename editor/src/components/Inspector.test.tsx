import { render, screen } from '@testing-library/react';
import { Inspector } from './Inspector';
import type { FeatureItem, Selection } from '../types';

const mockFeature: FeatureItem = {
  index: 1, id: 'moscow', terrain: 'major_city',
  label: 'Moscow', at: '0507', isBase: false,
};

test('shows map metadata when nothing is selected', () => {
  render(<Inspector selection={{ type: 'none' }} mapTitle="Battle for Moscow" />);
  expect(screen.getByText('Battle for Moscow')).toBeInTheDocument();
  expect(screen.getByText(/map/i)).toBeInTheDocument();
});

test('shows feature properties when a feature is selected', () => {
  render(
    <Inspector
      selection={{ type: 'feature', indices: [1] }}
      features={[mockFeature]}
    />
  );
  expect(screen.getByText('moscow')).toBeInTheDocument();
  expect(screen.getByText('major_city')).toBeInTheDocument();
  expect(screen.getByText('0507')).toBeInTheDocument();
});

test('shows section headings for feature fields', () => {
  render(
    <Inspector
      selection={{ type: 'feature', indices: [1] }}
      features={[mockFeature]}
    />
  );
  expect(screen.getByText(/terrain/i)).toBeInTheDocument();
  // Use word boundary to avoid matching "FEATURE"
  expect(screen.getByText(/\bAt\b/i)).toBeInTheDocument();
});

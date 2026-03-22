import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

test('displays cursor coordinate', () => {
  render(<StatusBar cursor="0507" />);
  expect(screen.getByText('0507')).toBeInTheDocument();
});

test('displays zoom level', () => {
  render(<StatusBar zoom={150} />);
  expect(screen.getByText('150%')).toBeInTheDocument();
});

test('displays map title', () => {
  render(<StatusBar mapTitle="Battle for Moscow" />);
  expect(screen.getByText('Battle for Moscow')).toBeInTheDocument();
});

test('shows dirty indicator when modified', () => {
  render(<StatusBar dirty />);
  expect(screen.getByText(/modified/i)).toBeInTheDocument();
});

test('shows no indicator when clean', () => {
  render(<StatusBar dirty={false} />);
  expect(screen.queryByText(/modified/i)).not.toBeInTheDocument();
});

test('shows paint mode indicator with terrain name and color', () => {
  render(<StatusBar paintTerrainKey="forest" paintTerrainColor="#2d6a1e" />);
  expect(screen.getByText('PAINT')).toBeInTheDocument();
  expect(screen.getByText(/forest/)).toBeInTheDocument();
  expect(screen.getByText(/Esc to exit/)).toBeInTheDocument();
});

test('does not show paint indicator when paintTerrainKey is null', () => {
  render(<StatusBar paintTerrainKey={null} />);
  expect(screen.queryByText('PAINT')).not.toBeInTheDocument();
});

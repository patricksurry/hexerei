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
  render(<StatusBar dirty={true} />);
  expect(screen.getByText(/modified/i)).toBeInTheDocument();
});

test('shows no indicator when clean', () => {
  render(<StatusBar dirty={false} />);
  expect(screen.queryByText(/modified/i)).not.toBeInTheDocument();
});

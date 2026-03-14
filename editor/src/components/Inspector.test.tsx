import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Inspector } from './Inspector';
import { Selection } from '@hexmap/canvas';

describe('Inspector', () => {
  it('renders placeholder when nothing selected', () => {
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={null} />);
    expect(screen.getByText(/Loading/i)).toBeDefined();
  });
});

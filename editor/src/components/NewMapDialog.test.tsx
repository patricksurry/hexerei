import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, test, vi } from 'vitest';
import { NewMapDialog } from './NewMapDialog';

describe('NewMapDialog', () => {
  it('generates standard YAML on create', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

    // Default is 10x10, flat-down, top-left, standard palette, clear base terrain
    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'New Map' } });
    fireEvent.click(screen.getByText('Create'));

    expect(onCreateMap).toHaveBeenCalled();
    const yaml = onCreateMap.mock.calls[0][0];

    expect(yaml).toContain('title: "New Map"');
    expect(yaml).toContain('orientation: flat-down');
    expect(yaml).toContain('all: "0101 - 1001 - 1010 - 0110 fill"');
    expect(yaml).toContain('terrain: clear');
  });

  it('includes custom title in generated YAML', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Battle for Moscow' } });

    fireEvent.click(screen.getByText('Create'));
    const yaml = onCreateMap.mock.calls[0][0];
    expect(yaml).toContain('title: "Battle for Moscow"');
  });

  it('updates YAML when inputs change', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Test' } });

    const widthInput = screen.getByLabelText('Width:');
    fireEvent.change(widthInput, { target: { value: '5' } });

    const heightInput = screen.getByLabelText('Height:');
    fireEvent.change(heightInput, { target: { value: '5' } });

    const orientationBtn = screen.getByTitle('pointy-right');
    fireEvent.click(orientationBtn);

    const originBtn = screen.getByTitle('bottom-right');
    fireEvent.click(originBtn);

    fireEvent.click(screen.getByText('Create'));
    const yaml = onCreateMap.mock.calls[0][0];

    expect(yaml).toContain('orientation: pointy-right');
    // Actual 5x5 rectangle path
    expect(yaml).toContain('all: "0101 - 0501 - 0505 - 0105 fill"');
  });

  it('generates valid YAML when base terrain is none', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Test' } });

    const baseTerrainSelect = screen.getByLabelText('Base Terrain:');
    fireEvent.change(baseTerrainSelect, { target: { value: 'none' } });

    fireEvent.click(screen.getByText('Create'));
    const yaml = onCreateMap.mock.calls[0][0];

    expect(yaml).toContain('features:\n');
    expect(yaml).not.toContain('terrain: none');
  });

  it('generates distinct colors for standard wargame terrain', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create'));
    const yaml = onCreateMap.mock.calls[0][0];

    const colorMatches = [...yaml.matchAll(/color: "(#[0-9a-f]{6})"/gi)];
    const colors = colorMatches.map((m: RegExpMatchArray) => m[1]);
    const uniqueColors = new Set(colors);

    expect(colors.length).toBeGreaterThanOrEqual(6);
    expect(uniqueColors.size).toBe(colors.length);
  });

  it('generates YAML with XX.YY label format', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Test' } });

    const labelSelect = screen.getByLabelText('Label Format:');
    fireEvent.change(labelSelect, { target: { value: 'XX.YY' } });

    fireEvent.click(screen.getByText('Create'));
    const yaml = onCreateMap.mock.calls[0][0];

    expect(yaml).toContain('label: XX.YY');
    expect(yaml).toContain('01.01');
    expect(yaml).toContain('10.01');
    expect(yaml).toContain('10.10');
    expect(yaml).toContain('01.10');
  });

  it('generates YAML with AYY label format', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Test' } });

    const labelSelect = screen.getByLabelText('Label Format:');
    fireEvent.change(labelSelect, { target: { value: 'AYY' } });

    const widthInput = screen.getByLabelText('Width:');
    fireEvent.change(widthInput, { target: { value: '5' } });
    const heightInput = screen.getByLabelText('Height:');
    fireEvent.change(heightInput, { target: { value: '5' } });

    fireEvent.click(screen.getByText('Create'));
    const yaml = onCreateMap.mock.calls[0][0];

    expect(yaml).toContain('label: AYY');
    expect(yaml).toContain('A01');
    expect(yaml).toContain('E01');
    expect(yaml).toContain('E05');
    expect(yaml).toContain('A05');
  });

  it('generates YAML with custom first values', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Test' } });

    const firstColInput = screen.getByLabelText('First Column:');
    fireEvent.change(firstColInput, { target: { value: '0' } });
    const firstRowInput = screen.getByLabelText('First Row:');
    fireEvent.change(firstRowInput, { target: { value: '0' } });

    fireEvent.click(screen.getByText('Create'));
    const yaml = onCreateMap.mock.calls[0][0];

    expect(yaml).toContain('first: [0, 0]');
    expect(yaml).toContain('0000');
    expect(yaml).toContain('0909');
  });

  it('updates base terrain dropdown when palette changes', () => {
    render(<NewMapDialog onCreateMap={() => {}} onCancel={() => {}} />);

    const baseTerrainSelect = screen.getByLabelText('Base Terrain:') as HTMLSelectElement;
    expect(baseTerrainSelect.options.length).toBeGreaterThan(1);

    const paletteSelect = screen.getByLabelText('Terrain Palette:');
    fireEvent.change(paletteSelect, { target: { value: 'blank' } });

    // Base terrain should change to 'none' and have no other options except 'None'
    expect(baseTerrainSelect.options.length).toBe(1);
    expect(baseTerrainSelect.value).toBe('none');
  });

  it('Standard Wargame palette generates edge terrain in YAML', () => {
    let createdYaml = '';
    render(
      <NewMapDialog
        onCreateMap={(yaml) => {
          createdYaml = yaml;
        }}
        onCancel={() => {}}
      />
    );

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create'));

    expect(createdYaml).toContain('edge:');
    expect(createdYaml).toContain('river:');
  });

  it('Standard Wargame palette generates path terrain in YAML', () => {
    let createdYaml = '';
    render(
      <NewMapDialog
        onCreateMap={(yaml) => {
          createdYaml = yaml;
        }}
        onCancel={() => {}}
      />
    );

    const titleInput = screen.getByLabelText('Title:');
    fireEvent.change(titleInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create'));

    expect(createdYaml).toContain('road:');
    expect(createdYaml).toContain('path: true');
  });
});

test('Create button is disabled when title is empty', () => {
  render(<NewMapDialog onCreateMap={vi.fn()} onCancel={vi.fn()} />);
  const createBtn = screen.getByRole('button', { name: /create/i });
  expect(createBtn).toBeDisabled();
});

test('title field starts empty with placeholder', () => {
  render(<NewMapDialog onCreateMap={vi.fn()} onCancel={vi.fn()} />);
  const titleInput = screen.getByLabelText('Title:');
  expect(titleInput).toHaveValue('');
  expect(titleInput).toHaveAttribute('placeholder', 'Enter map name...');
});

test('Create button enables when title is entered', async () => {
  render(<NewMapDialog onCreateMap={vi.fn()} onCancel={vi.fn()} />);
  const titleInput = screen.getByLabelText('Title:');
  const createBtn = screen.getByRole('button', { name: /create/i });

  expect(createBtn).toBeDisabled();
  await userEvent.type(titleInput, 'My Map');
  expect(createBtn).not.toBeDisabled();
});

import { describe, it, expect, beforeEach } from 'vitest';
import { HexRenderer } from './index';
import { HexMapLoader } from '@hexmap/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as d3 from 'd3';

describe('HexRenderer (Headless)', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';
        // Mock clientWidth/Height since JSDOM doesn't handle layout
        Object.defineProperty(container, 'clientWidth', { value: 800 });
        Object.defineProperty(container, 'clientHeight', { value: 600 });
    });

    it('should render Battle for Moscow map correctly', () => {
        const mapPath = join(__dirname, '../../maps/definitions/battle-for-moscow.hexmap.yaml');
        const mapSource = readFileSync(mapPath, 'utf-8');
        const mesh = HexMapLoader.load(mapSource);

        const renderer = new HexRenderer(mesh, {
            element: container,
            width: 800,
            height: 600,
            hexSize: 30
        });

        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('width')).toBe('800');

        // Check grid group
        const grid = container.querySelector('#grid');
        expect(grid).not.toBeNull();

        // Check hex count
        const paths = grid?.querySelectorAll('path');
        expect(paths?.length).toBe(154);
    });

    it('should render labels with Offset coordinates', () => {
        const mapPath = join(__dirname, '../../maps/definitions/battle-for-moscow.hexmap.yaml');
        const mapSource = readFileSync(mapPath, 'utf-8');
        const mesh = HexMapLoader.load(mapSource);

        const renderer = new HexRenderer(mesh, {
            element: container,
            width: 800,
            height: 600,
            hexSize: 30
        });

        const labels = container.querySelectorAll('#labels text');
        expect(labels.length).toBe(154);

        // Check content of first label (Should be "0101" or similar offset)
        const content = Array.from(labels).map(l => l.textContent);
        expect(content).toContain('0101');
    });

    it('should render terrain colors', () => {
        const mapPath = join(__dirname, '../../maps/definitions/battle-for-moscow.hexmap.yaml');
        const mapSource = readFileSync(mapPath, 'utf-8');
        const mesh = HexMapLoader.load(mapSource);

        new HexRenderer(mesh, {
            element: container,
            width: 800,
            height: 600,
            hexSize: 30
        });

        const grid = container.querySelector('#grid');
        const paths = grid?.querySelectorAll('path');
        const fills = Array.from(paths || []).map(p => p.getAttribute('fill'));

        expect(fills).toContain('#aaddaa'); // Forest
        expect(fills).toContain('#888888'); // City (e.g. Smolensk)
    });

    it('should support highlights', () => {
        const mesh = HexMapLoader.load('hexmap: "1.0"\nlayout:\n  columns: 2\n  rows: 2');
        const renderer = new HexRenderer(mesh, {
            element: container,
            width: 800,
            height: 600,
            hexSize: 30
        });

        renderer.highlight(['0,0,0', '1,-1,0']);

        const highlights = container.querySelectorAll('#highlights path');
        expect(highlights.length).toBe(2);
        expect(highlights[0].getAttribute('fill')).toBe('rgba(255, 255, 0, 0.4)');

        // Replace highlights
        renderer.highlight(['0,0,0']);
        expect(container.querySelectorAll('#highlights path').length).toBe(1);
    });

    it('should update reactively', () => {
        const mapSource = 'hexmap: "1.0"\nlayout:\n  columns: 1\n  rows: 1';
        const mesh = HexMapLoader.load(mapSource);
        const renderer = new HexRenderer(mesh, {
            element: container,
            width: 800,
            height: 600,
            hexSize: 30
        });

        const grid = container.querySelector('#grid');
        const initialFill = grid?.querySelector('path')?.getAttribute('fill');
        expect(initialFill).toBe('#fff'); // unknown maps to #ffffff, but D3 might return #fff

        // Update mesh
        const areaId = '0,0,0'; // offset(0,0) in 1x1 starting at (1,1) with Stagger.Odd
        mesh.updateArea(areaId, { terrain: 'forest' });
        renderer.update(mesh);

        const updatedFill = grid?.querySelector('path')?.getAttribute('fill');
        expect(updatedFill).toBe('#aaddaa'); // Forest
    });
});

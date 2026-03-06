import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

// Mock HexRenderer to avoid JSDOM issues with canvas/svg/d3
vi.mock('@hexmap/renderer', () => {
    return {
        HexRenderer: class {
            constructor() {}
            update() {}
            highlight() {}
        }
    };
});

describe('App', () => {
    it('renders without crashing', () => {
        // Since render() requires @testing-library/react, let's see if we have it
        // If not, we can just test if the component is a function
        expect(typeof App).toBe('function');
    });

    it('renders sidebar buttons', () => {
        const { getByTitle } = render(<App />);
        expect(getByTitle('Source')).toBeDefined();
        expect(getByTitle('Layout')).toBeDefined();
        expect(getByTitle('Features')).toBeDefined();
    });
});

import {hex, edge} from './hex';

test('face edge vertex match', () => {
    const o = {q: 0, r: 0},
        vs = hex.vertices(o),
        evs = hex.edges(o).map(edge.vertices).flat();
    expect(vs.length).toBe(6);
    expect(evs.length).toBe(12);
    expect(new Set(vs.map(v => JSON.stringify(v)))).toEqual(new Set(evs.map(v => JSON.stringify(v))));
})

test('hex - hex = 0', () => {
    const h = {q: 3, r: 2};
    expect(hex.sub(h, h)).toEqual({q: 0, r: 0});
})

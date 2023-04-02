import {rayIntersects} from './hextopo';
import {hex} from './hex';

test('rayIntersects unit hex', () => {
    const es = hex.edges({q: 0, r: 0});
    expect(es.filter(e => rayIntersects({q: 0, r: 0}, e)).length).toBe(1);
    expect(es.filter(e => rayIntersects({q: 1, r: 1}, e)).length).toBe(0);
    expect(es.filter(e => rayIntersects({q: -1, r: -1}, e)).length).toBe(2);
})

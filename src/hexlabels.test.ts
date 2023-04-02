import {hexLabeler, _labelers} from './hexlabels';

test("fmtAB", () => {
    const fmt = _labelers['A'].format;
    expect(fmt(0)).toBe('A');
    expect(fmt(25)).toBe('Z');
    expect(fmt(27)).toBe('AB');
})

test("parseAB", () => {
    const parse = _labelers['A'].parse;
    expect(parse('A')).toBe(0);
    expect(parse('Z')).toBe(25);
    expect(parse('AB')).toBe(27);
})

test("fmtAA", () => {
    const fmt = _labelers['AA'].format;
    expect(fmt(0)).toBe('A');
    expect(fmt(25)).toBe('Z');
    expect(fmt(27)).toBe('BB');
    expect(fmt(52)).toBe('AAA');
})

test("parseAA", () => {
    const parse = _labelers['AA'].parse;
    expect(parse('A')).toBe(0);
    expect(parse('Z')).toBe(25);
    expect(parse('BB')).toBe(27);
    expect(parse('AAA')).toBe(52);
})

test("formatLabel", () => {
    expect(hexLabeler('qAr1')({q: 0, r: 0})).toBe('A1');
    expect(hexLabeler('qAQ1')({q: 0, r: 1})).toBe('A2');
    expect(hexLabeler('qAQ1')({q: 1, r: 0})).toBe('B1');
})

test("ambiguousStyle", () => {
    expect(hexLabeler('q0r0')({q: 0, r: 0})).toBe('0:0');
    expect(hexLabeler('q00r00')({q: 0, r: 0})).toBe('0000');
    expect(hexLabeler('q00r00')({q: 100, r: 100})).toBe('100:100');
})

test("parseLabel", () => {
    expect(hexLabeler('qAr1').parse("A1")).toEqual({q: 0, r: 0});
    expect(hexLabeler('qAQ1').parse("A1")).toEqual({q: 0, r: 0});
    expect(hexLabeler('qAQ1').parse("A2")).toEqual({q: 0, r: 1});
    expect(hexLabeler('qAQ1').parse("B1")).toEqual({q: 1, r: 0});
})

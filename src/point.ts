type Point2D = [number, number];
type Matrix2D = [Point2D, Point2D];

function matrix2d() {}

matrix2d.muladd = ([[a, b], [c, d]]: Matrix2D, [x, y]: Point2D, [du, dv]: Point2D = [0,0]): Point2D =>
    [x*a + y*b + du, x*c + y*d + dv];

matrix2d.invert = ([[a, b], [c, d]]: Matrix2D): Matrix2D => {
    const den = (a*d - b*c);
    return [[d/den, -b/den], [-c/den, a/den]];
}

export {
    type Point2D,
    type Matrix2D,
    matrix2d,
}


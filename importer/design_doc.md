# Grid Detection Design: Flat-Top Hex Geometry

## 1. User Inputs & Constraints
- **Image**: ~1800 x 645 px.
- **Topology**: Flat-Top Hex Data.
- **Grid Size**: ~33 Columns x ~10 Rows.
- **Key Dimensions**:
  - `H_total = 10 * H_hex`. `H_hex = 64.5 px`.
  - `Flat-to-Vertex` (Apothem `a`) = `32.2 px`.
  - `Column Width` (Center-Center `dx`) = `1800 / 33 = 54-56 px`.

## 2. Hexagon Geometry (Flat-Top)
- **Side Length `s`**:
  - `H = 2a = sqrt(3) * s`.
  - `64.5 = 1.732 * s` -> `s ~ 37.2 px`.
- **Column Spacing `dx`**:
  - `dx = 1.5 * s`.
  - `1.5 * 37.2 = 55.8 px`. (Matches 56px estimate).
- **Row Spacing `dy`**:
  - `dy = a = H/2 = 32.2 px`.
  - Rows are staggered, but the "lines" (Top/Bottom edges) repeat every `a`?
  - actually, Row 1 edges are at `y = +/- a`.
  - Row 2 centers at `y = 2a`? No.
  - Staggered grid usually centers at `(0,0), (dx, a), (0, 2a)`.
  - So "Row Period" for centers is `a` (32.2).
  - Horizontal Lines (Edges) are at `y = +/- a`.
  - So edges define horizontal lines spaced by `a`.

## 3. Projection Strategy
To detect the grid, we use Radon Transform (Projections) to find the "Lines".
Flat-Top Hexes have 3 sets of parallel edges:
1.  **Horizontal (0 deg)**: Top/Bottom edges.
2.  **Diagonal 1 (60 deg)**: Top-Left / Bottom-Right.
3.  **Diagonal 2 (120 deg)**: Top-Right / Bottom-Left.

**Correct Projection Angles**:
To measure density of lines at angle `theta`, we rotate the image so those lines become vertical, then sum columns (project onto X).
*   **Axis 0**: Angle 0. Rotate 90. Sum Cols. (Vertical Lines in rotated frame).
*   **Axis 60**: Angle 60. Rotate 30. Sum Cols.
*   **Axis 120**: Angle 120. Rotate -30 (or 150). Sum Cols.

**Expected Periodicity**:
*   **Axis 0**: Period = `a` (32.2 px). Strong signal (Horizontal lines).
*   **Axis 60**: Period = `a` (32.2 px). (Distance between parallel 60-deg edges).
*   **Axis 120**: Period = `a` (32.2 px).

**Consistency Check**:
All 3 axes should show a fundamental period of `~32 px`.
The previous algorithm detected `dx ~ 29` (half-period of something?) on Axis 90.
Axis 90 (Vertical) corresponds to **Vertical Lines**. Flat-Top Hexes have **NO** vertical lines (only vertices).
So we strictly avoid Axis 90 for scale.

## 4. Algorithm Steps
1.  **Pre-process**: Edges (Canny).
2.  **Projections**:
    -   Iterate `angles = [0, 60, 120]`.
    -   Rotate `90 - angle`.
    -   Get Profile.
    -   Detect Peaks with `min_dist ~ 20` (0.6 * 32).
    -   Verify Period `P ~ 32 +/- 5`.
3.  **Intersection**:
    -   Intersect lines from Axis 0, 60, 120.
    -   3-way intersection confirms Center vs Vertex.
    -   (Vertices are intersection of only 2 lines? No, vertices intersect 2 lines. Centers intersect 3 lines? No. Centers intersect 0 lines? Edges don't go through centers!)
    -   **Correction**:
        -   The projected lines are EDGES.
        -   Intersection of Edges = vertices.
        -   We want CENTERS.
        -   Centers are equidistant from lines.
        -   Or we shift the lines by `Period/2`?
        -   Actually, for `Axis 0` (Horizontal), peaks are at `y = +/- a`. Center at `y=0`.
        -   Phase Shift: A peak at `P` suggests a line `y=P`.
        -   Center is at `y = P + a/2`? No, geometric center is halfway between parallel edges.
        -   So if we detect lines `L1, L2` separated by `a`. The band `(L1+L2)/2` contains centers.
    -   **Validation**:
        -   Find "Valley" in projection? (Centers are empty).
        -   In Edge Image, Edges are bright. Centers are dark.
        -   So Centers correspond to VALLEYS in the projection profile.
        -   We should detect VALLEYS (or invert profile).
        -   Wait. If we detect Peaks (Lines), we find the Grid of Edges.
        -   The Intersection of Edges = Vertices.
        -   If we find Vertices, we can derive Centers.
        -   Center of Hex = Average of its 6 vertices.
        -   Or simply: Center has Y-coord halfway between Axis 0 lines.
4.  **Synthetic Grid**:
    -   Use `s` derived from Period (`P / 0.866`).
    -   Anchor `origin` at (Valley_0, Valley_60, Valley_120)? Or just shift detected Vertex origin.

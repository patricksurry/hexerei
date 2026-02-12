# Hexerei Prior Art Survey

*February 2026*

A survey of the existing landscape for hex grid libraries, map rendering/creation
tools, wargame engines, and AI for strategy games -- to understand what exists,
what's reusable, and where the gaps are.

---

## 1. Hex Grid Math Libraries

Red Blob Games' hex guide (redblobgames.com/grids/hexagons/) is the canonical
reference. Virtually every library below derives from it. The guide covers
cube/axial/offset/doubled coordinates, hex-to-pixel conversion, neighbors,
distance, line drawing, rings, spirals, pathfinding, FOV, and movement range.
It provides complete pseudocode and reference implementations in many languages.

### Python

| Library | Coords | Pathfinding | FOV | Rendering | Status |
|---|---|---|---|---|---|
| **hexy** | Cube, axial | No | No | Pixel conv only | Dormant (~2020), NumPy-based |
| **hexutil** | Cube | No | Basic | Pixel conv only | Dead (~2019) |
| **hexalattice** | Cartesian | No | No | Matplotlib (data-viz) | Low activity |

**The Python hex ecosystem is notably weak.** No actively maintained,
comprehensive library exists. The practical approach is to implement ~200 lines
of Red Blob Games algorithms directly, possibly with NumPy for bulk operations,
and layer networkx on top for graph/pathfinding.

### TypeScript / JavaScript

| Library | Coords | Pathfinding | FOV | Rendering | Status |
|---|---|---|---|---|---|
| **Honeycomb v4** | Cube, axial, offset | No | No | Agnostic (BYO) | Active, best-in-class |
| **rot.js** | Offset | A*, Dijkstra | Yes | Canvas/DOM | Active (roguelike toolkit) |
| **react-hexgrid** | Cube | No | No | SVG (React) | Low activity |
| **d3-hexbin** | N/A | No | No | SVG (data-viz) | Maintained (not for games) |

**Honeycomb** is the clear winner for JS/TS game dev -- clean API, multiple
coord systems, TypeScript-native, zero deps, MIT licensed. But it's purely
math/geometry; rendering is up to you.

### Other languages

| Library | Language | Notes |
|---|---|---|
| **hexx** | Rust | Most complete hex lib in any language. FOV, mesh gen, chunk storage, Bevy integration. Active. |
| **hexameter** | Java/Kotlin | Cube/axial, A* pathfinding. Slowed ~2020. |
| Catlike Coding tutorials | C#/Unity | Comprehensive 27-part hex map tutorial. Unity-specific. |

### Uber H3

H3 (h3geo.org) is Uber's hierarchical hexagonal geospatial indexing system.
Very actively maintained, multi-language bindings, excellent for tiling Earth
in hexagons at multiple scales.

**Wrong tool for game hex grids.** H3 is earth-centric (lat/lng, not flat
boards), has 12 pentagons at each resolution, non-uniform cell sizes, and no
local coordinate math. Overkill and ill-fitting for game boards.

**However**, H3 is useful for the "discretize a real-world region to hexes" use
case -- `h3.polyfill()` a bounding polygon, then query land-use/elevation data
per cell.

### Key takeaway

The ecosystem is **fragmented into many small, thin libraries** that each
implement the same Red Blob Games algorithms. Nobody has built a comprehensive,
opinionated hex toolkit that goes beyond basic coordinate math. Most libraries
provide adjacency but leave pathfinding, FOV, terrain, rendering, and
serialization to external code.

---

## 2. Map Rendering & Creation

### SVG hex map rendering

No library in any language combines hex math + SVG rendering + terrain data.
The pieces exist separately:

- **Python**: svgwrite (general SVG generation) + manual hex geometry. Full
  control but you build everything yourself.
- **JS/TS**: Honeycomb provides vertex positions you feed to D3/raw SVG/Canvas.
  react-hexgrid gives you React SVG components but limited hex math.
- **PixiJS**: WebGL-based, high performance for large grids, but raster not SVG.

### Hex map editors

| Tool | Stack | Structured data out? | Notes |
|---|---|---|---|
| **Worldographer** (Hexographer 2) | Java/Swing | Proprietary XML, CSV | De facto RPG hex map editor. Commercial. Rich icon library. Dated UI. |
| **HexKit** | macOS native | PNG only | Beautiful tile-based editor. Visual only, no data export. |
| **Foundry VTT / Roll20** | Web | No | VTTs overlay hexes on images. Not creation tools. |
| **Owlbear Rodeo** | Web/React | No | Lightweight VTT with hex overlay extension. |
| **Watabou generators** | Haxe/JS | SVG, no hex data | Procedural generators. Beautiful output but no coordinate system. |

**None of these produce structured hex data suitable for programmatic game
logic.** They're either visual-only editors or virtual tabletops that overlay
hexes on images.

### Procedural hex terrain generation

| Tool | Approach | Hex-native? | License |
|---|---|---|---|
| **Azgaar's Fantasy Map Generator** | Voronoi + noise + simulation | No (Voronoi cells) | MIT, 9k+ stars |
| **Red Blob Games terrain-from-noise** | Perlin/Simplex noise tutorials | Educational | Apache 2.0 |
| **Martin O'Leary** (mewo2) | Erosion-based terrain | No (continuous mesh) | Open |
| **Here Dragons Abound** (blog) | Cartographic aesthetics | No | Code not released |
| **simplex-noise** (npm) | Noise function library | No | MIT |
| **Wave Function Collapse** | Tile adjacency constraints | Could be adapted | Various |

Azgaar's is the most impressive -- full world simulation with biomes, rivers,
politics, cultures. Exports GeoJSON. But it uses Voronoi cells internally,
not regular hex grids. You'd need to re-discretize.

### Bitmap-to-hex extraction

**Essentially no prior art.** No published tool takes a board game map image
and outputs structured hex data. The pieces that exist:

- OpenCV can detect hex grids via Hough transform (hex grids produce lines
  at exactly 3 orientations: 0/60/120 for flat-top)
- Per-hex color histogram / K-means can classify ~5-10 terrain types from
  solid-colored maps
- CNN classifiers could be fine-tuned on labeled hex tile images
- Meta's SAM could segment terrain regions to map to hex cells
- OCR (Tesseract) could extract hex labels

Nobody has assembled these into a pipeline. Real board game maps with textured
terrain, icons, and labels make every step harder than clean synthetic grids.

### Geospatial-to-hex conversion

The pieces exist but are **fragmented across tools**:

- **H3**: `polyfill()` a polygon at chosen resolution
- **Shapely + GeoPandas**: Generate hex grid as polygons, spatial join with
  geographic features (coastlines, rivers, forests from Natural Earth data)
- **rasterio**: Sample elevation DEMs per hex center
- **QGIS**: Desktop GIS can generate hex grids and intersect with layers

Nobody has wrapped "give me a bounding box and scale, get back a hex map with
terrain" into a clean library or CLI tool.

### Map formats

**No standard hex map interchange format exists.** What people use:

| Format | Pros | Cons |
|---|---|---|
| **GeoJSON** | Standard, universal tool support, extensible properties | Verbose (6 vertices per hex), no adjacency concept |
| **TopoJSON** | Compact (shared edges stored once), preserves topology | Less widely supported |
| **SVG** | Visual, browser-native, styleable with CSS | No semantic hex data unless embedded in data attributes |
| **Worldographer XML** | Full map state | Proprietary, undocumented, tool-specific |
| **CSV** | Simple | Loses all detail beyond terrain type |

A clean JSON/GeoJSON-based schema for hex maps -- defining grid geometry,
coordinate system, per-hex terrain, edge features (rivers, roads), vertex
features, and metadata -- would be genuinely new. The GeoJSON-based approach
sketched in NOTES.md (origin line, boundary polygon, features mapped to
tile/edge/vertex) is a solid starting point.

TopoJSON is worth considering as a compact transport format since hex grids
have massive edge sharing.

---

## 3. Wargame Engines & Frameworks

### Digital wargame platforms

| Platform | Stack | Rules enforcement? | AI? | Status |
|---|---|---|---|---|
| **VASSAL** | Java/Swing | No -- virtual tabletop only | No | Active, dominant, LGPL |
| **Tabletop Simulator** | Unity/Lua | No | No | Active, commercial |
| **Wargame Studio** | C#/.NET | Limited | No | Small user base, commercial |
| **ZunTzu** | C#/DirectX | No | No | Dead (~2010) |
| **ADC2** | Windows | No | No | Legacy |

**VASSAL** dominates with thousands of game modules and 20+ years of community,
but it's fundamentally a virtual tabletop -- it doesn't know the rules of any
game. You can move any piece anywhere. No path to AI players.

**No platform combines rules enforcement + hex grid + AI.** This is the
central gap.

### Game frameworks with potential hex/wargame use

| Framework | Stack | Hex support | AI | Notes |
|---|---|---|---|---|
| **boardgame.io** | JS/TS, React | None (BYO) | MCTS (built-in) | Clean state mgmt, multiplayer. AI struggles with large action spaces. MIT. ~10k stars. |
| **OpenSpiel** | C++/Python | None (but extensible) | MCTS, AlphaZero, CFR, NFSP, policy gradient, etc. | Gold standard for game AI research. You implement a State/Game class. Apache 2.0. |
| **PettingZoo** | Python | None | Standard RL API | Flat action/observation model is awkward for multi-decision wargame turns. MIT. |
| **Ludii** | Java | Yes (primitive) | MCTS, minimax | DSL for abstract games. Wargame concepts (CRTs, supply, stacking) don't fit. GPL. |
| **TripleA** | Java | Area-based | Scripted AI | Open-source Axis & Allies engine. GPL. Active. |

**OpenSpiel** is the most interesting for AI research -- it has the richest
algorithm library. But wargames stress its assumptions: enormous action spaces,
sequential sub-decisions within a turn, complex state. You'd need significant
adaptation.

**boardgame.io** is interesting for the multiplayer/UI layer but provides no
hex or wargame primitives.

### The graveyard pattern

Multiple attempts at open-source hex wargame engines appear on GitHub
periodically. The consistent pattern: enthusiastic start, basic hex rendering
and movement implemented, then the project goes dormant when the complexity
of full rules implementation becomes apparent. No reusable framework has
emerged from these efforts.

---

## 4. AI for Hex Wargames

### The state of the art

**This is the biggest gap.** Almost no open-source projects successfully apply
modern AI to traditional hex-and-counter wargames.

### Why wargames are hard for AI

1. **Enormous action spaces** -- moving 20-50 units with 6+ destination choices
   each, then attack combinations. Dwarfs Chess/Go.
2. **Long horizons** -- 15-30+ turns, each with many sequential sub-decisions.
3. **Complex rules** -- CRTs, supply, ZOC, stacking, terrain effects create
   complex state machines.
4. **Stochastic outcomes** -- dice-based combat introduces variance.
5. **Imperfect information** -- many wargames have fog of war.

### Closest prior work

| Project | Game | Approach | Key insight |
|---|---|---|---|
| **DeepMind Stratego** (2022) | Stratego | R-NaD (Regularized Nash Dynamics) | AlphaZero doesn't work for imperfect info; needed new algorithm |
| **Risk AlphaZero** (KTH thesis) | Risk | AlphaZero adaptation | Action space already problematic for a simpler-than-wargame game |
| **Meta CICERO** (2022) | Diplomacy | LLM + game theory | Area-based, multi-player negotiation game |
| **AlphaStar** (DeepMind) | StarCraft II | RL + imitation learning | Required enormous compute; RTS not hex-based |
| **NeuroHex** | Hex (abstract) | Deep Q-learning | Simpler game structure than wargames |
| **microRTS** | microRTS | Various RL | Open-source research environment for tactical combat AI |
| **Lux AI** | Lux (Kaggle) | RL + planning | Grid-based strategy competition |

### DARPA / Military

DARPA has invested significantly in AI wargaming (GAMECHANGER program and
others) but results are mostly classified. Publicly: the RAND Corporation's
surveys note that most military wargaming AI remains rule-based/scripted.
Commercial military sims (Command: Modern Operations, Arma 3) use behavior
trees and FSMs, not learned AI.

### Promising approaches for wargame AI

1. **Hierarchical decomposition** -- different AI per phase (movement, combat,
   exploitation). MCTS for movement, optimization for combat allocation.
2. **Action abstraction** -- search over high-level actions ("advance left
   flank") rather than individual unit moves. How humans actually play.
3. **Scripted + learned hybrids** -- heuristics for tactical decisions,
   learning for strategic decisions.
4. **MCTS with domain knowledge** -- vanilla MCTS struggles; MCTS with good
   move ordering and rollout policies informed by wargaming knowledge can work.
5. **Learned evaluation functions** -- train a neural net to evaluate positions
   (like AlphaZero's value head) but pair with simpler search (beam search,
   greedy) rather than full MCTS.

### Game state representation for AI

- **Tensor**: Multi-channel 2D arrays (offset coord mapping) with channels for
  terrain, unit type, strength, owner, ZOC, supply. Standard for CNNs.
- **Graph**: Hexes as nodes, adjacency as edges. More natural for hex grids,
  enables GNNs, handles irregular maps. Less standard tooling.

No standard "FEN for wargames" exists. A compact notation is achievable for
simple games (map referenced by name, unit list with hex:type.strength.owner)
but scales poorly with game complexity.

---

## 5. Summary: Where Hexerei Fits

### What can be reused

- **Red Blob Games algorithms** -- the hex math is solved; implement directly
- **Honeycomb** (JS/TS) -- if the TS rendering layer uses it rather than
  reimplementing hex geometry
- **Shapely + GeoPandas** -- for geospatial-to-hex pipeline
- **H3** -- for the specific real-world-region-to-hex use case
- **svgwrite** (Python) or raw SVG (TS) -- for rendering output
- **OpenSpiel** -- potentially for AI algorithm library, if a wargame can be
  adapted to its interface
- **boardgame.io** -- potentially for multiplayer/state management layer

### What doesn't exist and hexerei would be building new

1. **Integrated hex toolkit** -- Python library combining hex math + planar
   graph representation + terrain/edge/vertex features + coordinate system
   conversions + serialization. Nothing does this.

2. **The graph-duality model** -- treating face/edge/vertex as first-class
   citizens mapped to a planar graph. Most tools only deal with hex tiles.
   This directly enables wargame mechanics: rivers on edges, roads through
   faces, terrain on tiles, bridges at vertices.

3. **A hex map interchange format** -- GeoJSON-based or standalone JSON schema
   with grid geometry, coordinates, terrain, edge/vertex features, metadata.

4. **SVG hex map renderer with pluggable styles** -- takes structured hex map
   data, produces styled SVG. No library does this in any language.

5. **Bitmap-to-hex extraction pipeline** -- grid detection + terrain
   classification from board game images.

6. **Geo-to-hex pipeline** -- "bounding box + scale -> hex map with terrain"
   as a clean workflow.

7. **Rules-aware wargame engine** -- hex grid + game state + rules enforcement
   + AI interface. The VASSAL gap.

8. **Wargame AI** -- even a basic competent AI for Battle for Moscow would be
   novel as an open-source achievement.

### The opportunity

The landscape is surprisingly barren for something that's been a hobby niche
for 50+ years. The reasons likely include:

- **Hex math is "easy enough" to reimplement** -- so nobody invests in a
  definitive library. Everyone rolls their own 200 lines from Red Blob Games.
- **Wargame rules are "hard enough" to encode** -- the graveyard pattern shows
  that enthusiasm fades when CRTs, supply, and ZOC need implementing.
- **The community is small and fragmented** -- hex wargamers, Python devs, AI
  researchers, and web developers rarely overlap.
- **VASSAL is "good enough"** -- for human-vs-human play, VASSAL works. The
  missing piece is rules enforcement and AI, which require a fundamentally
  different architecture.

A project that bridges these communities -- hex toolkit for developers,
game framework for wargamers, AI environment for researchers, browser-based
for accessibility -- would genuinely fill a gap.

---

## 6. Computer Opponents in Wargames: How They Actually Work

The prior art survey (section 4) focused on learned/RL approaches and found
them mostly absent from hex wargames. But many published digital wargames
*do* have computer opponents -- they just use hand-crafted heuristics rather
than learned strategies. This section surveys those approaches.

### The standard architecture: layered heuristics

Most wargame computer opponents follow a broadly similar architecture, even
if the implementations vary widely in sophistication:

**1. Influence / threat mapping**

Nearly every competent wargame AI builds some form of spatial evaluation map:

- Compute "friendly strength" and "enemy strength" per hex (or per region),
  often projected by movement range.
- Identify the frontline (hexes where influence is contested).
- Identify weak points (where enemy strength exceeds friendly) and strong
  points (where we have local superiority).
- Sometimes includes terrain modifiers (river lines count as stronger
  defensive positions, etc.)

This is the most consistently documented technique. The Panzer General series,
Unity of Command, TOAW, and Gary Grigsby games all use variants of influence
mapping.

**2. Objective-based planning**

Better AIs assign priorities to geographic objectives (victory hexes, key
terrain, supply sources) and allocate forces toward them:

- Score each objective by strategic value and current control status.
- Assign force groups to objectives (often greedy: highest-value unassigned
  objective gets the nearest available force).
- This creates a rough "plan" that guides unit-level decisions.

Unity of Command's AI is notable here -- it explicitly plans supply corridor
attacks and encirclements as objectives, not just territory capture.

**3. Combat odds evaluation**

When deciding attacks, the AI typically:

- Enumerate possible attack combinations (which units attack which defender).
- Look up the odds on the CRT and compute expected outcomes.
- Apply a threshold: only attack if odds exceed some minimum (e.g., 3:1 in
  favorable terrain, 2:1 in open terrain).
- Factor in terrain, unit type modifiers, support assets.

This is usually the most "correct" part of wargame AI because CRT evaluation
is deterministic -- given the odds table, you can compute the expected value
of each attack.

**4. Movement planning**

This is where most AIs are weakest. Approaches range from:

- **Greedy/local**: Each unit independently moves toward its assigned
  objective or toward the nearest enemy, checking stacking limits.
  (Simplest, most common in older games.)
- **Formation-aware**: Units assigned to the same objective try to maintain
  cohesion. Some games group units into corps/armies.
- **Search-based**: A* or Dijkstra for individual unit pathfinding is
  standard. Multi-unit coordinated movement planning is rare due to the
  combinatorial explosion.
- **Sequential decision**: Move units in priority order (e.g., most
  threatened first, or most important objective first). Earlier moves
  constrain later ones.

The fundamental problem: moving 30 units optimally is a combinatorial
optimization problem that's intractable to solve exactly. Every game
compromises with heuristic ordering and local decisions.

### Game-by-game survey

#### Panzer General / Allied General / People's General (SSI, 1994-1998)

The classic hex wargame AI. Well-documented due to reverse engineering and
fan community analysis:

- Uses influence maps to identify the frontline.
- Units are assigned roles: attacker, defender, reserve.
- Attack logic: enumerate attacks at favorable odds, prioritize killing
  weakened units and capturing objectives.
- Movement: greedy toward objectives, with some formation cohesion.
- **Exploitable weaknesses**: Predictable attack patterns, poor at
  strategic maneuver, doesn't understand combined arms well beyond
  basic odds calculation.
- Overall: competent at tactical combat, weak at operational planning.

#### Unity of Command / Unity of Command II (2012 / 2019)

Widely considered to have the best AI in any operational hex wargame:

- Explicitly models supply lines -- AI will attempt to cut enemy supply
  by encirclement, which is unusual and impressive.
- Plans at the operational level (identify enemy weak points, concentrate
  force for breakthroughs) not just the tactical level.
- Uses a form of theater-level objective planning.
- The developer (Tomislav Uzelac / 2x2 Games) has given some talks and
  interviews discussing the AI approach, though no detailed technical
  writeup exists.
- Still heuristic-based, but the heuristics are unusually sophisticated
  and game-specific.

#### Gary Grigsby's War in the East / War in the West (2010 / 2014)

Massive-scale Eastern Front simulations with hundreds of units:

- AI uses an influence map approach for front management.
- Unit movement is largely sequential and local -- move each unit
  independently based on nearby threats and objectives.
- The AI struggles with the scale -- coordinating hundreds of units
  over a vast map is where heuristic approaches break down.
- Developer (2by3 Games/Joel Billings) has acknowledged the AI as the
  weakest part of the system.
- Community has developed "AI improvement" mods that mostly tweak
  scenario setup (force distribution, reinforcement timing) rather
  than fixing the AI algorithms.

#### The Operational Art of War (TOAW, 1998-2020)

Long-running series, latest version TOAW IV:

- AI operates at the "force" level, grouping units into armies/corps.
- Uses a front-management approach: identify the front, assign forces
  to sectors, attack where local odds are favorable.
- Has a reputation for being adequate on defense but poor on offense --
  it defends lines competently but struggles to plan and execute
  multi-axis offensives.
- No public documentation of the AI internals.

#### Strategic Command (Fury Software, 2002-present)

Operational/strategic level WWII wargame:

- Developer Hubert Cater has discussed the AI in forum posts.
- Uses a combination of scripted national strategies (invasion plans,
  front assignments) and tactical heuristic evaluation.
- "Decision events" trigger scripted AI behaviors (e.g., Germany
  invades Russia on a certain turn if conditions are met).
- Tactical combat uses standard odds evaluation.
- The scripted strategic layer makes the AI feel "smart" at the grand
  strategic level even though the underlying tactical AI is basic.

#### Decisive Campaigns (VR Designs, 2012-2019)

Notable for transparency about AI:

- Developer Victor Reijkersz published detailed forum posts about the
  AI architecture.
- Uses a hierarchical system: theater AI assigns objectives to corps,
  corps AI plans attacks, unit AI executes movement.
- Influence mapping for threat assessment.
- Attack planning uses exhaustive CRT evaluation within small
  local neighborhoods.
- One of the few wargame AIs with published design documentation.

#### John Tiller Campaign Series / Panzer Campaigns (1990s-present)

Long-running tactical/operational wargame series:

- AI is notoriously weak -- widely considered the worst part of
  otherwise well-researched games.
- Essentially greedy unit-by-unit movement toward objectives.
- Minimal coordination between units.
- Has barely evolved over decades of releases.
- The focus of the series is human vs human play or solitaire with
  the AI as a punching bag.

### Common patterns and limitations

Across all these games, several patterns emerge:

**What heuristic AIs do well:**
- Evaluate combat odds via CRT (this is essentially a lookup table)
- Defend static lines (hold hexes, retreat when threatened)
- React to immediate threats (reinforce weakened sectors)
- Follow scripted strategic plans (invasion timelines, etc.)

**What heuristic AIs do poorly:**
- **Coordinated multi-unit maneuver** -- encirclements, feints, pincer
  movements require planning across many units simultaneously
- **Operational-level planning** -- identifying that a 3-turn sequence
  of moves creates an opportunity requires look-ahead that heuristics
  don't provide
- **Adapting to unexpected situations** -- scripted strategies break
  when the human does something unanticipated
- **Resource allocation under uncertainty** -- where to commit reserves,
  when to trade space for time

### Documentation and references

Published references on wargame AI implementation are **remarkably sparse**
considering the decades of commercial development:

- **GameAIPro** (gameaipro.com) -- the free online book series has some
  relevant chapters on strategy game AI, influence maps, and tactical
  decision-making, but nothing specific to hex wargames.
- **AI Game Programming Wisdom** (4 volumes, 2002-2006) -- has chapters
  on influence maps, strategic AI, and RTS AI. The strategy game chapters
  by various authors are the closest to wargame AI documentation.
- **Decisive Campaigns forum posts** by Victor Reijkersz -- probably the
  most detailed public documentation of a commercial wargame AI.
- **Unity of Command interviews** with Tomislav Uzelac -- discuss the
  philosophy but not deep technical details.
- **Various wargame forum threads** on BoardGameGeek, Matrix Games forums,
  and Grogheads where developers occasionally reveal AI approaches.

The overall picture: commercial wargame AI is a **craft tradition** passed
down through individual developers, with very little written documentation.
Each developer reinvents similar heuristics independently.

---

## 7. LLM Agents as Wargame Players: An Emerging Possibility

### The idea

Rather than trying to replace heuristic subsystems with learned models, use
an LLM as a **strategic coordinator** that manages heuristic subsystems --
the way a human general issues orders to staff officers who handle details.

The LLM would:
- Assess the overall situation (in natural language, from a structured
  game state summary)
- Form a strategic plan ("concentrate forces for a breakthrough at the
  river crossing, hold defensively on the southern flank")
- Delegate execution to heuristic subsystems (pathfinding, CRT evaluation,
  formation movement)
- Evaluate results and adjust the plan

### Prior art: LLM game agents

This is a very active area as of 2024-2025:

**Diplomacy / CICERO (Meta, 2022)**

The clearest precedent. CICERO combined:
- A language model for negotiation (the "LLM" component)
- A strategic reasoning module trained via RL and search
- Dialogue planning that aligned communication with strategy

Achieved human-level play in Diplomacy. Diplomacy is area-based, not hex,
but it's a multi-player wargame requiring strategic reasoning, alliance
management, and coordinated military operations.

Key insight: the LLM handled the natural-language reasoning and negotiation
while structured algorithms handled the combinatorial strategy.

**Voyager / DEPS / other Minecraft/game agents (2023-2024)**

Multiple projects used LLMs as high-level planners for game agents:
- LLM generates a plan in natural language
- Plan is decomposed into executable actions via code generation or
  skill library lookup
- Results are fed back to the LLM for replanning

The pattern -- LLM as planner, structured systems as executors -- maps
directly to the wargame AI problem.

**LLM + MCTS hybrids (2024-2025)**

Several papers explored using LLMs to guide MCTS:
- LLM provides a prior policy (which moves look promising?) to focus
  the search tree
- MCTS provides the rigorous evaluation and look-ahead
- The LLM's "intuition" about strategy reduces the branching factor
  that makes wargame MCTS intractable

This is the most promising hybrid architecture for wargames specifically.

**LLM agents for board games**

Various projects have applied LLMs to play board games (Chess, Go, Settlers
of Catan, etc.) with mixed results:
- LLMs alone play Chess/Go poorly compared to dedicated engines
- But for games requiring strategic reasoning, negotiation, or natural
  language understanding, LLMs add genuine value
- Wargames sit in an interesting middle ground: they have both a
  combinatorial tactical layer (where heuristics excel) and a strategic
  reasoning layer (where LLMs could contribute)

### A potential architecture for hexerei

```
                    LLM Strategic Agent
                    (situation assessment,
                     plan formation,
                     plan adaptation)
                           |
                    Structured Game State
                    (hex map + units + rules)
                           |
              +------------+------------+
              |            |            |
         Movement     Combat       Supply
         Planner      Evaluator    Analyzer
         (A* paths,   (CRT odds,   (graph
          influence    expected     connectivity,
          maps)        outcomes)    trace routes)
```

The LLM reads a natural-language situation report, reasons about strategy,
and issues high-level directives. Heuristic subsystems translate those
directives into specific game actions. The LLM evaluates outcomes and
adjusts.

### Why this might work for wargames specifically

1. **Wargames are designed for human reasoning** -- the mechanics (maps,
   CRTs, unit types) are designed to be comprehensible to human players
   making strategic decisions. LLMs are much closer to human reasoning
   than RL agents are.

2. **The action space problem is reduced** -- the LLM reasons about
   high-level actions ("attack the salient", "retreat to the river line")
   which the heuristic systems decompose into individual unit moves.
   This is the "action abstraction" approach identified as promising
   in the AI literature.

3. **Wargame knowledge is extensively documented** -- decades of strategy
   guides, after-action reports, and historical analysis that LLMs have
   been trained on. An LLM "knows" that overextended supply lines are
   dangerous, that river crossings are costly, that reserves should be
   committed at the decisive point.

4. **Evaluation is natural-language friendly** -- "we're winning on the
   northern front but our southern flank is exposed" is a valid and
   useful assessment that an LLM can produce and reason about.

### Open questions

- **Latency**: LLM inference per turn might be acceptable for turn-based
  play (seconds per turn) but not for rapid self-play training.
- **Consistency**: LLMs can be inconsistent in strategic reasoning across
  turns. Would need state tracking / memory management.
- **Cost**: Running an LLM for thousands of training games is expensive
  compared to pure heuristic self-play.
- **Evaluation**: How do you measure if the LLM is actually contributing
  strategic value beyond what heuristics alone provide?

### The bottom line

This is speculative but plausible territory. Nobody has done it for hex
wargames yet. The hexerei architecture -- clean game state representation,
rules engine, heuristic subsystems -- would be the prerequisite
infrastructure. The LLM agent layer could be added once the foundation
exists, which aligns with the "AI is down the road" instinct.

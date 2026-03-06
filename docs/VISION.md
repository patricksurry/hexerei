Some rough ideas for a multi-part toolkit 
for implementing hex and counter (and similar) 
boardgames with AI players.

Name:

    hexerei - the art or power of bringing magical or preternatural power to bear or the act or practice of attempting to do so

Initial goal: flexible support for hex maps

Representation:
  - elegant representation for map features (human editable, compact) 
    could also support analogy of FEN for recording game state 
  - support for common coordinate systems (xxyy, AAxx etc) 
    and orientations (convert back/forth to internal coords)
  - specify map features in user coords, directions (up/north)
    including  edge/vertex/face of hexes (the graph duality is interesting)
  - internally maps to a (mostly) planar graph representation,
    used for game play reasoning 
    would extend to more generic area/region maps like diplomacy

Rendering:
  - procedural rendering of map (and later counters) as SVG.  some pluggable 
    system for rendering styles (e.g. trees, rivers, train tracks etc)
  - (maybe) interactive map editor for viewing and modifying map structure

Map creation:
  - hand crafted map definitions (compact notation for e.g. forrested region,
    or contiguous river along hex sides or roads thru hex faces)
  - extract basic map structure from good quality bitmap image of a game map,
    recognize hex grid, some discretization to guess terrain types, maybe labels?
  - discretize a real-world region to a hex map, eg. select a rectangular region
    from some world-map service, pick hex orientation and scale,


Ideally get to a point where we could define and render a map for one of the simple example games, maybe with counters, and then phase two would be to make a playable version in a browser, ideally with a simple AI agent.

Keep the framework simple, accessible, browser-based, probably python + typescript.


Unorganized references/ideas
===

Real world map sourcing
---

  geojson.io - mapbox open source geojson editor
  geojson.xyz - sample files via natural earth
  geonmaes.org - collection of mostly points for many features
  geoman.io - alternative freemium geojson editor


Procedural rendering
---

  https://www.redblobgames.com/maps/terrain-from-noise/
  https://github.com/w8r/polygon-offset
  https://riccardoscalco.it/textures/
  https://www.npmjs.com/package/simplex-noise
  https://www.redblobgames.com/maps/noisy-edges/
  https://heredragonsabound.blogspot.com/search?q=rivers
  https://github.com/Azgaar/Fantasy-Map-Generator
  https://azgaar.wordpress.com/
  https://mewo2.com/notes/terrain/
  https://roberthodgin.com/project/meander
  https://catlikecoding.com/unity/tutorials/hex-map/


Map specification
---

geojson => hex map

specials:

Geometry Line with id='origin' with hex side length = pointy radius,
and direction 90deg right of 'up' orientation,
or Point with properties 'scale' hex size in km, and orient=degrees default 0
default flat top, optional pointy=true.

Polygon (or multipolygon) geometry with id='boundary'

other features optional property map='tile|edge|vertex|none', default tile
optional property label=str


coordinate systems:

[web mercator][webgm]for geojson e.g. for map background tiles or cities
[webgm]: https://en.wikipedia.org/wiki/Web_Mercator_projection

cube/axial coordinates as native hex coords

user coords (string ids) like offset xxyy "0304" or alternative axial like "AA01"
needs a cube2id and id2cube method

map geojson objects to hex tiles, edges and/or vertices  via shapely

Uber's H3 https://h3geo.org/
use directed edge identifiers between two hexes to represent flow between them?


Simple hex and counter games as good test cases
---

- [Hold the Line](https://boardgamegeek.com/boardgame/35342/hold-line)
- [Drive on Metz](https://boardgamegeek.com/boardgame/33030/drive-metz-second-edition)
- [Target Arnhem](https://boardgamegeek.com/boardgame/16162/target-arnhem-across-6-bridges)
- [Gettysburg 150](https://boardgamegeek.com/boardgame/135530/gettysburg-150)
- [Battle for Moscow](https://grognard.com/bfm/game.html)


AI players
---

- [AI and wargaming][https://arxiv.org/pdf/2009.08922.pdf]
- [Playing the Game of Risk with an AlphaZero Agent](http://kth.diva-portal.org/smash/get/diva2:1514096/FULLTEXT01.pdf)

- [From Poincare Recurrence to Convergence in Imperfect Information Games: ´
Finding Equilibrium via Regularization](https://arxiv.org/pdf/2002.08456.pdf)
- [Mastering the Game of Stratego with Model-Free Multiagent Reinforcement Learning](https://arxiv.org/pdf/2206.15378.pdf)
- [Snake reinforcement learning](https://github.com/oscarknagg/wurm)
- https://github.com/baskuit/R-NaD

- NeuroHex: A Deep Q-learning Hex Agent
  [slides]](https://webdocs.cs.ualberta.ca/~hayward/talks/hex.deepQ.pdf),
  [paper](https://webdocs.cs.ualberta.ca/~hayward/papers/neurohex-paper.pdf)
- [AI in Human-computer Gaming: Techniques, Challenges and Opportunities](https://arxiv.org/pdf/2111.07631.pdf)
- file:///Users/psurry/Downloads/algorithms-15-00282.pdf
- [GameAIPro](https://www.gameaipro.com/)
- [Neural Replicator Dynamics:
Multiagent Learning via Hedging Policy Gradients](https://arxiv.org/pdf/1906.00190.pdf)


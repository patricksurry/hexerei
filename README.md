Hex and counter AI
===

    hexerei - the art or power of bringing magical or preternatural power to bear or the act or practice of attempting to do so

  -     make a blog visual test page that shows labeling and various tests


geojson.io - mapbox open source geojson editor
geojson.xyz - sample files via natural earth
geonmaes.org - collection of mostly points for many features
geoman.io - alternative freemium geojson editor


Map spec
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


build and run like

npx tsc
node --es-module-specifier-resolution=node  dist/flowsnake.js


Simple hex and counter games
---

- [Hold the Line](https://boardgamegeek.com/boardgame/35342/hold-line)
- [Drive on Metz](https://boardgamegeek.com/boardgame/33030/drive-metz-second-edition)
- [Target Arnhem](https://boardgamegeek.com/boardgame/16162/target-arnhem-across-6-bridges)
- [Gettysburg 150](https://boardgamegeek.com/boardgame/135530/gettysburg-150)
- [Battle for Moscow](https://grognard.com/bfm/game.html)

References
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

Uber's H3 https://h3geo.org/
use directed edge identifiers between two hexes to represent flow between them?

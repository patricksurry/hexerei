overall: 
    UI discoverability is not great, as a UX designer what improvements would you suggest?
    both for mouse and keyboard actions, e.g. how to load/save, how does terrain palette work?  

need to review label contrast e.g. for hexpath shown in feature list, and revisit the visual identity, doesn't feel like we've captured that


shift-click to draw edge path crashed:
    hex-math.ts:62 Uncaught Error: Invalid hex ID: VOID
        at Module.hexFromId (hex-math.ts:62:33)
        at buildScene (scene.ts:169:24)
        at render (CanvasHost.tsx:123:21)
    chunk-U4Z7RTTL.js?v=13138fe8:16670 Uncaught TypeError: Cannot read properties of undefined (reading 'startsWith')
        at buildScene (scene.ts:243:15)
        at render (CanvasHost.tsx:123:21)
        at CanvasHost.tsx:179:7

first col/row is not part of the RFC.  need to brainstorm how @all vs row x col + first should actually work,
and how it interacts with orientation.  is orientation w.r.t. odd/even cube coords?  or wrt min(row/col) inferred from @all?  how should we do rectangle shortcut?

orientation should be a button bar with thumbnail showing each of the four orientations,
same with origin.

"starter palette" could be "terrain palette".  picking opaque named palette doesn't seem ideal, is there some more intuitive onboarding step of selecting/deselecting from a set of standard terrain chips, and marking one as default?

map labels are almost unreadable blurry

zoom seems v slow (and zoom value in footer should just be integer % not huge precision float).  
how is zoom currently implemented, do we render at fixed resolution and zoom the canvas, or only draw the visible area at variable resolution?

inspector sections should be collapsible

clicking on the terrain color chip to activate paint vs clicking on the terrain name to edit it is weird discoverability, as is having to click off the map to exit paint mode (or maybe there is another way?)

can we do a better visual grouping of hex/edge/vertex terrain sub sections, rather than having them look like completely separate things?

do we have room for two column palette?  rather than square chip + name, could we do a hex (respecting flat/pointy) styled properly (e.g. filled for hex, line for hex path) with name below?   this would also be nice
in the feature list, show the same hex terrain chip, and then the feature name rather than terrain name?

linear hex terrain is rendered both with fill and the path.  we should only have the path so it can stack, path should also be thicker

hexpath bar is not synced as I draw terrain on the map

"feature stack" seems overly technical label.  the "+" to add a new element looks like part of the label ("FEATURE STACK+")

does 'Base Layer' need to be completely separate from the stack rather than just first in the list?  'Base Layer' also seems like an odd name for it.

if I draw some forrest, then another terrain, then pick forrest and draw more, it's combined with the first forrest feature.  should be separate feature, e.g. id 'forrest1', 'forrest2'?

resizing the window squashes or stretches the map's aspect ratio

when map orientation is pointy (left or right), edge and vertex selection is picking the wrong edge/vertex.
hex selection seems correct in all orientations, and edge+vertex is correct in both flat top orientations.  we should have a test for this.

origin should be available in the layout section after map creation

we need a favicon.ico to match the visual identity

there's a strange 'Loading...' message when the new map popover is present.  'Cancel' on the popover leaves it in that state so can't manually build a new map.

the new map popover doesn't seem visually distinguished from the map background, and style doesn't seem to match visual identity/design system.  do we have clear documented guidelines for UI?
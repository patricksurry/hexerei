## Extensibility

### The `extensions` object

The top-level `extensions` object is reserved for implementation-specific
or game-specific data that falls outside this specification. Producers
MAY include arbitrary data here. Consumers MUST ignore extensions they
do not recognize.

```yaml
extensions:
  hexerei_renderer:
    style: "classic-wargame"
    hex_size_px: 48
  my_game_engine:
    fog_of_war: true
    turn_limit: 12
```

### The `properties` objects

The `properties` field on terrain type definitions and on feature entries
is the primary mechanism for per-element extension data. Unrecognized
properties MUST be preserved and passed through.

### Forward compatibility

Consumers that encounter unrecognized top-level keys SHOULD ignore them
(not reject the document). This allows future versions of the format to
add new sections without breaking older parsers.

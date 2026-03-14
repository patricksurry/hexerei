## JSON Schema

The normative JSON Schema for the HexMap format is defined below.

<sourcecode type="json"><![CDATA[
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hexerei.io/schemas/hexmap-1.0.schema.json",
  "title": "HexMap 1.0",
  "description": "A format for hexagonal grid maps.",
  "type": "object",
  "required": ["hexmap", "layout"],
  "properties": {
    "hexmap": {
      "const": "1.0",
      "description": "Format version."
    },
    "metadata": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" },
        "version": { "type": "string" },
        "title": { "type": "string" },
        "description": { "type": "string" },
        "designer": { "type": "string" },
        "publisher": { "type": "string" },
        "date": { "type": "string" },
        "source": {
          "type": "object",
          "properties": {
            "url": { "type": "string", "format": "uri" },
            "notes": { "type": "string" }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "layout": {
      "type": "object",
      "required": ["orientation", "all"],
      "properties": {
        "orientation": {
          "type": "string",
          "enum": ["flat-down", "flat-up", "pointy-right", "pointy-left"]
        },
        "all": { "type": "string" },
        "label": { "type": "string", "default": "auto" },
        "origin": {
          "enum": ["top-left", "bottom-left", "top-right", "bottom-right"],
          "default": "top-left"
        },
        "georef": {
          "type": "object",
          "properties": {
            "scale": { "type": "number", "exclusiveMinimum": 0 },
            "anchor": {
              "type": "object",
              "properties": {
                "lat": { "type": "number" },
                "lng": { "type": "number" }
              },
              "required": ["lat", "lng"],
              "additionalProperties": false
            },
            "anchor_hex": { "type": "string" },
            "bearing": { "type": "number", "minimum": 0, "exclusiveMaximum": 360 },
            "projection": { "type": "string", "default": "mercator" }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "terrain": {
      "type": "object",
      "properties": {
        "hex": { "$ref": "#/$defs/TerrainVocabulary" },
        "edge": { "$ref": "#/$defs/TerrainVocabulary" },
        "vertex": { "$ref": "#/$defs/TerrainVocabulary" }
      },
      "additionalProperties": false
    },
    "features": {
      "type": "array",
      "items": { "$ref": "#/$defs/FeatureEntry" }
    },
    "extensions": {
      "type": "object",
      "additionalProperties": true
    }
  },
  "additionalProperties": false,

  "$defs": {
    "TerrainVocabulary": {
      "type": "object",
      "patternProperties": {
        "^[a-z][a-z0-9_]*$": { "$ref": "#/$defs/TerrainTypeDef" }
      },
      "additionalProperties": false
    },
    "TerrainTypeDef": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "type": { "enum": ["base", "modifier"], "default": "base" },
        "onesided": { "type": "boolean", "default": false },
        "style": {
          "type": "object",
          "properties": {
            "color": { "type": "string" },
            "pattern": { "type": "string" },
            "stroke": { "type": "string" },
            "stroke_width": { "type": "number" }
          },
          "additionalProperties": false
        },
        "properties": { "type": "object", "additionalProperties": true }
      },
      "additionalProperties": false
    },
    "FeatureAttributes": {
      "type": "object",
      "properties": {
        "terrain": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" },
        "elevation": { "type": "integer" },
        "label": { "type": "string" },
        "id": { "type": "string" },
        "tags": { "type": "string" },
        "properties": { "type": "object", "additionalProperties": true },
        "side": {
             "enum": ["both", "in", "out", "left", "right"],
             "description": "For edge features only."
        }
      }
    },
    "FeatureEntry": {
      "allOf": [
        { "$ref": "#/$defs/FeatureAttributes" },
        { "$ref": "#/$defs/GeometrySelector" }
      ],
      "unevaluatedProperties": false
    },
    "GeometrySelector": {
      "type": "object",
      "properties": {
        "at": { "type": "string" }
      },
      "required": ["at"]
    }
  }
}
]]>

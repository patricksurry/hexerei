## JSON Schema

The normative JSON Schema for the HexMap format is defined below.

<sourcecode type="json"><![CDATA[
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hexerei.io/schemas/hexmap-1.0.schema.json",
  "title": "HexMap 1.0",
  "description": "A format for hexagonal grid maps.",
  "type": "object",
  "required": ["hexmap", "grid"],
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
          }
        }
      }
    },
    "grid": {
      "type": "object",
      "required": ["hex_top", "columns", "rows"],
      "properties": {
        "hex_top": { "enum": ["flat", "pointy"] },
        "columns": { "type": "integer", "minimum": 1 },
        "rows": { "type": "integer", "minimum": 1 },
        "stagger": { "enum": ["low", "high"], "default": "low" },
        "boundary": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "coordinates": {
          "type": "object",
          "properties": {
            "label": { "type": "string", "default": "XXYY" },
            "origin": {
              "enum": ["top-left", "bottom-left", "top-right", "bottom-right"],
              "default": "top-left"
            },
            "first": {
              "type": "array",
              "items": { "type": "integer" },
              "minItems": 2,
              "maxItems": 2,
              "default": [1, 1]
            }
          }
        },
        "geo": {
          "type": "object",
          "properties": {
            "scale": { "type": "number", "exclusiveMinimum": 0 },
            "anchor": {
              "type": "array",
              "items": { "type": "number" },
              "minItems": 2,
              "maxItems": 2
            },
            "anchor_hex": { "type": "string" },
            "bearing": { "type": "number", "minimum": 0, "exclusiveMaximum": 360 },
            "projection": { "type": "string", "default": "mercator" }
          }
        }
      }
    },
    "terrain": {
      "type": "object",
      "properties": {
        "hex": { "$ref": "#/$defs/TerrainVocabulary" },
        "edge": { "$ref": "#/$defs/TerrainVocabulary" },
        "vertex": { "$ref": "#/$defs/TerrainVocabulary" },
        "path": { "$ref": "#/$defs/TerrainVocabulary" }
      }
    },
    "defaults": {
      "type": "object",
      "properties": {
        "hex": { "$ref": "#/$defs/FeatureAttributes" },
        "edge": { "$ref": "#/$defs/FeatureAttributes" },
        "vertex": { "$ref": "#/$defs/FeatureAttributes" }
      }
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
        "directed": { "type": "boolean", "default": false },
        "style": {
          "type": "object",
          "properties": {
            "color": { "type": "string" },
            "pattern": { "type": "string" },
            "stroke": { "type": "string" },
            "stroke_width": { "type": "number" }
          }
        },
        "properties": { "type": "object", "additionalProperties": true }
      }
    },
    "FeatureAttributes": {
      "type": "object",
      "properties": {
        "terrain": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" },
        "elevation": { "type": "integer" },
        "label": { "type": "string" },
        "id": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } },
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
      ]
    },
    "GeometrySelector": {
      "oneOf": [
        {
          "properties": { "hexes": { "$ref": "#/$defs/HexExpression" } },
          "required": ["hexes"]
        },
        {
          "properties": { "hex": { "$ref": "#/$defs/HexExpressionLiteral" } },
          "required": ["hex"]
        },
        {
          "properties": { "edges": { "$ref": "#/$defs/EdgeExpression" } },
          "required": ["edges"]
        },
        {
          "properties": { "edge": { "$ref": "#/$defs/EdgeExpressionLiteral" } },
          "required": ["edge"]
        },
        {
          "properties": { "vertices": { "$ref": "#/$defs/VertexExpression" } },
          "required": ["vertices"]
        },
        {
          "properties": { "vertex": { "$ref": "#/$defs/VertexExpressionLiteral" } },
          "required": ["vertex"]
        },
        {
          "properties": { "path": { "$ref": "#/$defs/PathExpression" } },
          "required": ["path"]
        },
        {
           "title": "Region (Syntactic Sugar for Hexes)",
           "properties": {
             "region": {
                "type": "object",
                "required": ["hexes"],
                "properties": {
                    "id": { "type": "string" },
                    "hexes": { "$ref": "#/$defs/HexExpression" }
                }
             }
           },
           "required": ["region"]
        }
      ]
    },

    "HexExpression": {
      "oneOf": [
        { "type": "array", "items": { "type": "string" } },
        { "$ref": "#/$defs/GeometrySetOps" },
        { "$ref": "#/$defs/GeneratorsAndOperators" }
      ]
    },
    "HexExpressionLiteral": { "type": "string" },

    "EdgeExpression": {
      "oneOf": [
        { "type": "array", "items": { "type": "string" } },
        { "$ref": "#/$defs/GeometrySetOps" },
        { "$ref": "#/$defs/GeneratorsAndOperators" }
      ]
    },
    "EdgeExpressionLiteral": { "type": "string" },

    "VertexExpression": {
      "oneOf": [
        { "type": "array", "items": { "type": "string" } },
        { "$ref": "#/$defs/GeometrySetOps" },
        { "$ref": "#/$defs/GeneratorsAndOperators" }
      ]
    },
    "VertexExpressionLiteral": { "type": "string" },
    
    "PathExpression": {
       "type": "array",
       "items": { "type": "string" },
       "minItems": 2
    },

    "GeometrySetOps": {
      "type": "object",
      "properties": {
        "include": { "$ref": "#/$defs/AnyExpression" },
        "exclude": { "$ref": "#/$defs/AnyExpression" },
        "intersect": { "$ref": "#/$defs/AnyExpression" }
      },
      "additionalProperties": false
    },

    "GeneratorsAndOperators": {
      "type": "object",
      "properties": {
        "range": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 2,
          "maxItems": 2
        },
        "path": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 2
        },
        "nudge": { "type": "string" },
        "loop": { "type": "boolean" },
        
        "boundary": { "$ref": "#/$defs/AnyExpression" },
        "inside": { "$ref": "#/$defs/AnyExpression" },
        "fill": { "$ref": "#/$defs/AnyExpression" },
        "touching": { "$ref": "#/$defs/AnyExpression" }
      },
      "additionalProperties": false
    },

    "AnyExpression": {
        "oneOf": [
            { "type": "string" },
            { "type": "array", "items": { "type": "string" } },
            { "$ref": "#/$defs/GeometrySetOps" },
            { "$ref": "#/$defs/GeneratorsAndOperators" }
        ]
    }
  }
}
]]></sourcecode>


import json
import yaml
import sys
from pathlib import Path
try:
    import jsonschema
except ImportError:
    print("Please install jsonschema: uv add jsonschema")
    sys.exit(1)

def validate(schema_path, yaml_path):
    print(f"Loading Schema: {schema_path}")
    with open(schema_path, 'r') as f:
        schema = json.load(f)

    print(f"Loading Map: {yaml_path}")
    with open(yaml_path, 'r') as f:
        data = yaml.safe_load(f)

    print("Validating...")
    try:
        jsonschema.validate(instance=data, schema=schema)
        print("✓ Validation SUCCESS!")
    except jsonschema.ValidationError as e:
        print(f"✗ Validation FAILED!")
        print(f"Message: {e.message}")
        print(f"Path: {e.path}")
        print(f"Validator: {e.validator}")
        
if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Defaults for convenience
        schema = "hexmap.schema.json"
        map_file = "examples/battle-for-moscow.hexmap.yaml"
    else:
        schema = sys.argv[1]
        map_file = sys.argv[2]
        
    validate(schema, map_file)

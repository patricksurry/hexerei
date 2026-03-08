import json
import sys
import os
from pathlib import Path
import jsonschema

def run_tests():
    schema_path = Path("rfc/hexmap.schema.json")
    with open(schema_path, 'r') as f:
        schema = json.load(f)

    base_dir = Path("conductor/tracks/hexmap-schema-tdd/tests")
    valid_dir = base_dir / "valid"
    invalid_dir = base_dir / "invalid"

    failed = False

    print("--- Running VALID tests (should pass) ---")
    for fpath in valid_dir.glob("*.json"):
        with open(fpath, 'r') as f:
            instance = json.load(f)
        try:
            jsonschema.validate(instance=instance, schema=schema)
            print(f"✓ {fpath.name}")
        except jsonschema.ValidationError as e:
            print(f"✗ {fpath.name}: {e.message}")
            failed = True

    print("\n--- Running INVALID tests (should fail) ---")
    for fpath in invalid_dir.glob("*.json"):
        with open(fpath, 'r') as f:
            instance = json.load(f)
        try:
            jsonschema.validate(instance=instance, schema=schema)
            print(f"✗ {fpath.name}: FAILED to reject invalid document")
            failed = True
        except jsonschema.ValidationError:
            print(f"✓ {fpath.name} (correctly rejected)")

    if failed:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()

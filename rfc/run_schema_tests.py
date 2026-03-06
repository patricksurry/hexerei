import json
import yaml
import sys
import jsonschema
from pathlib import Path

def run_tests():
    print("Running negative schema tests...")
    
    schema_path = Path("hexmap.schema.json")
    with open(schema_path, 'r') as f:
        schema = json.load(f)

    test_dir = Path("tests/schema_tests")
    passed = 0
    failed = 0

    for test_file in test_dir.glob("*.yaml"):
        print(f"Testing {test_file.name} (Expect Failure)... ", end="")
        with open(test_file, 'r') as f:
            data = yaml.safe_load(f)
        
        try:
            jsonschema.validate(instance=data, schema=schema)
            print("FAIL (Unexpectedly Valid)")
            failed += 1
        except jsonschema.ValidationError:
            print("PASS (Caught Invalid Input)")
            passed += 1
        except Exception as e:
            print(f"ERROR ({e})")
            failed += 1

    print(f"\nResults: {passed} PASSED, {failed} FAILED")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()

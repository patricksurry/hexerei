#!/usr/bin/env python3
"""
HexMap RFC Build Script

Builds the HexMap RFC from modular markdown sources using mmark.
Generates HTML, XML, and optionally text output.

Requirements:
    - mmark (installed via Homebrew or Go)
    - xml2rfc (installed via uv/pip, for text output)

Usage:
    uv run python build.py [--html] [--xml] [--txt] [--all]

    If no options specified, builds HTML and text by default.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


# ANSI color codes
class Color:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color


def print_error(msg: str) -> None:
    """Print error message in red."""
    print(f"{Color.RED}✗ {msg}{Color.NC}", file=sys.stderr)


def print_success(msg: str) -> None:
    """Print success message in green."""
    print(f"{Color.GREEN}✓ {msg}{Color.NC}")


def print_warning(msg: str) -> None:
    """Print warning message in yellow."""
    print(f"{Color.YELLOW}⚠ {msg}{Color.NC}")


def print_info(msg: str) -> None:
    """Print info message in blue."""
    print(f"{Color.BLUE}→ {msg}{Color.NC}")


def check_mmark() -> bool:
    """Check if mmark is installed."""
    if shutil.which('mmark') is None:
        print_error("mmark is not installed")
        print("Install with:")
        print("  - Homebrew: brew install mmark")
        print("  - Go: go install github.com/mmarkdown/mmark@latest")
        print("  - Download from: https://github.com/mmarkdown/mmark/releases")
        return False
    return True


def check_xml2rfc() -> bool:
    """Check if xml2rfc is installed."""
    return shutil.which('xml2rfc') is not None


def build_html(build_dir: Path, master_file: Path) -> bool:
    """Build HTML output using mmark."""
    print_info("Building HTML output...")

    html_out = build_dir / "hexmap-format-rfc.html"

    try:
        with open(html_out, 'w') as f:
            result = subprocess.run(
                ['mmark', '-html', str(master_file)],
                stdout=f,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )

        print_success(f"HTML output: {html_out}")
        return True

    except subprocess.CalledProcessError as e:
        print_error(f"Failed to build HTML: {e.stderr}")
        return False


def build_xml(build_dir: Path, master_file: Path) -> bool:
    """Build XML (RFC format) output using mmark."""
    print_info("Building XML output...")

    xml_out = build_dir / "hexmap-format-rfc.xml"

    try:
        with open(xml_out, 'w') as f:
            result = subprocess.run(
                ['mmark', str(master_file)],
                stdout=f,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )

        print_success(f"XML output: {xml_out}")
        return True

    except subprocess.CalledProcessError as e:
        print_error(f"Failed to build XML: {e.stderr}")
        return False


def build_txt(build_dir: Path) -> bool:
    """Build text output using xml2rfc."""
    if not check_xml2rfc():
        print_warning("xml2rfc not found. Skipping text output.")
        print("  Install with: uv add xml2rfc")
        print("  Or: pip install xml2rfc")
        return False

    print_info("Building text output...")

    xml_in = build_dir / "hexmap-format-rfc.xml"
    txt_out = build_dir / "hexmap-format-rfc.txt"

    if not xml_in.exists():
        print_error("XML file not found. Build XML first.")
        return False

    try:
        result = subprocess.run(
            ['xml2rfc', '--text', str(xml_in), '-o', str(txt_out)],
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )

        print_success(f"Text output: {txt_out}")
        return True

    except subprocess.CalledProcessError as e:
        print_error(f"Failed to build text: {e.stderr}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Build HexMap RFC documentation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run python build.py              # Build HTML and text (default)
  uv run python build.py --all        # Build all formats
  uv run python build.py --html       # Build HTML only
  uv run python build.py --xml --txt  # Build XML and text
        """
    )

    parser.add_argument('--html', action='store_true', help='Build HTML output')
    parser.add_argument('--xml', action='store_true', help='Build XML output')
    parser.add_argument('--txt', action='store_true', help='Build text output')
    parser.add_argument('--all', action='store_true', help='Build all formats')
    parser.add_argument('--clean', action='store_true', help='Clean build directory first')

    args = parser.parse_args()

    # Default: build HTML and text if no options specified
    if not (args.html or args.xml or args.txt or args.all):
        args.html = True
        args.txt = True

    # --all means build everything
    if args.all:
        args.html = args.xml = args.txt = True

    # Paths
    script_dir = Path(__file__).parent.resolve()
    print(f"Script dir: {script_dir}")
    build_dir = script_dir / "build"
    master_file = script_dir / "master.md"
    print(f"Master file: {master_file}")

    # Check prerequisites
    if not check_mmark():
        sys.exit(1)

    if not master_file.exists():
        print_error(f"Master file not found: {master_file}")
        sys.exit(1)

    # Clean if requested
    if args.clean and build_dir.exists():
        print_info("Cleaning build directory...")
        shutil.rmtree(build_dir)

    # Create build directory
    build_dir.mkdir(exist_ok=True)

    # Build outputs
    success = True

    if args.html:
        success = build_html(build_dir, master_file) and success

    if args.xml:
        success = build_xml(build_dir, master_file) and success

    # Text requires XML to exist
    if args.txt:
        # Build XML first if not already built
        xml_file = build_dir / "hexmap-format-rfc.xml"
        if not xml_file.exists():
            print_info("XML not found, building it first...")
            if not build_xml(build_dir, master_file):
                success = False
            else:
                success = build_txt(build_dir) and success
        else:
            success = build_txt(build_dir) and success

    # Summary
    print()
    if success:
        print_success("Build complete!")
        print(f"Outputs in: {build_dir}/")
    else:
        print_error("Build completed with errors")
        sys.exit(1)


if __name__ == '__main__':
    main()

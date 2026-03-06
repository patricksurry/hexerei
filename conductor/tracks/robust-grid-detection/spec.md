# Specification: Robust Hex Grid Detection Pipeline

## Goal
Build a robust computer vision pipeline that can automatically detect, align, and parse hexagonal grids from photos/scans with perspective and clutter.

## Requirements
- Support **perspective and skew** (Homography estimation).
- Handle **cluttered backgrounds** (Dense terrain, text, legends).
- Work on **partial/faint grids** (Multi-patch consensus).
- Output a **valid HexMap YAML** or approximate grid JSON.
- Provide **diagnostic overlays** for verification.

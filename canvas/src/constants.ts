/**
 * Shared geometric and interaction constants for the hex grid.
 * All world-space dimensions are relative to HEX_SIZE = 1.
 */

export const HEX_SIZE = 1;

/**
 * Hit-test thresholds (distance in world units)
 */
export const HIT_THRESHOLD_VERTEX = HEX_SIZE * 0.25;
export const HIT_THRESHOLD_EDGE = HEX_SIZE * 0.3;

/**
 * Viewport and Interaction
 */
export const DEFAULT_FIT_PADDING = 0.08; // 8% padding around map
export const ZOOM_FIT_PADDING_FACTOR = 1.1; // 10% extra space for "zoom fit"
export const ZOOM_SENSITIVITY = 0.995; // base for exponent (factor ** deltaY)
export const ZOOM_ANIMATION_DURATION = 300; // ms

/**
 * Culling
 */
export const SCENE_CULL_PADDING_FACTOR = 1.5;

/**
 * Selection and Highlighting
 */
export const ACCENT_HEX = '#00D4FF';
export const ACCENT_EDGE = '#FF44FF';
export const ACCENT_VERTEX = '#FFDD00';

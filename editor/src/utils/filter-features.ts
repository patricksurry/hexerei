import { FeatureItem } from '@hexmap/canvas';

export function filterFeatures(features: FeatureItem[], query: string): number[] {
  const q = query.toLowerCase();

  // Key:value search (e.g., "terrain:forest")
  const colonIdx = q.indexOf(':');
  if (colonIdx > 0) {
    const key = q.substring(0, colonIdx).trim();
    const value = q.substring(colonIdx + 1).trim();
    return features
      .filter((f) => {
        switch (key) {
          case 'terrain': return f.terrain.toLowerCase().includes(value);
          case 'label': return (f.label ?? '').toLowerCase().includes(value);
          case 'id': return (f.id ?? '').toLowerCase().includes(value);
          case 'at': return f.at.toLowerCase().includes(value);
          case 'tags': return f.tags.some((t) => t.toLowerCase().includes(value));
          default: return false;
        }
      })
      .map((f) => f.index);
  }

  // Fuzzy match across all fields
  return features
    .filter((f) =>
      f.terrain.toLowerCase().includes(q) ||
      (f.label ?? '').toLowerCase().includes(q) ||
      (f.id ?? '').toLowerCase().includes(q) ||
      f.at.toLowerCase().includes(q) ||
      f.tags.some((t) => t.toLowerCase().includes(q))
    )
    .map((f) => f.index);
}

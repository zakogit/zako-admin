export const RELEASE_STATUS_KEY = ['app-version-status'];

// Same rules as the backend `compareVersions` and the mobile
// `VersionComparator`: dotted numeric, 1–4 segments, compared segment by
// segment; build/pre-release suffixes ignored, missing segments count as 0.
export const VERSION_RE = /^\d+(\.\d+){0,3}$/;

export function compareVersions(a: string, b: string): number {
  const segments = (v: string) =>
    String(v)
      .split(/[+\- ]/)[0]
      .trim()
      .split('.')
      .map((s) => parseInt(s, 10) || 0);
  const x = segments(a);
  const y = segments(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

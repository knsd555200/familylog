export function focal(x?: number | null, y?: number | null) {
  return { objectPosition: `${x ?? 50}% ${y ?? 50}%` }
}

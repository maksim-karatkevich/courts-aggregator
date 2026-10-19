// scrollTop that places the row directly under the sticky header (header counted once).
export function scrollTopFor(
  labelTop: number,
  containerTop: number,
  currentScrollTop: number,
  headerHeight: number
): number {
  return Math.max(0, labelTop - containerTop + currentScrollTop - headerHeight)
}

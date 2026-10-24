import axe from 'axe-core'

// Runs axe's WCAG 2.1 A/AA rules on a rendered component and fails with a
// readable list. jsdom has no layout or CSS, so colour contrast is checked in
// the Playwright scans instead; "region" (content outside landmarks) only
// makes sense for a whole page.
export async function expectNoA11yViolations(container: Element): Promise<void> {
  // axe probes canvas for icon detection; jsdom has none and logs noise.
  HTMLCanvasElement.prototype.getContext = () => null
  const { violations } = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  if (violations.length > 0) {
    const list = violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join('\n')
    throw new Error(`Accessibility violations:\n${list}`)
  }
}

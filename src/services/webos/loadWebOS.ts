export function loadWebOS(): void {
  // webOSTV.js registers itself on window.webOS and has no ES module exports.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  void import('@procot/webostv/webOSTV/index.js')
}

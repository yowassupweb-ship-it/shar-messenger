/**
 * Scroll utilities based on Signal Desktop implementation
 * https://github.com/signalapp/Signal-Desktop
 */

/**
 * Get the distance from the current scroll position to the bottom of the container
 * This value remains stable when content is added at the top
 */
export const getScrollBottom = (
  el: Pick<HTMLElement, 'clientHeight' | 'scrollHeight' | 'scrollTop'>
): number => {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
};

/**
 * Set scroll position by specifying the distance from the bottom
 * This maintains visual position when content is added at the top
 */
export function setScrollBottom(
  el: Pick<HTMLElement, 'clientHeight' | 'scrollHeight' | 'scrollTop'>,
  scrollBottom: number
): void {
  el.scrollTop = el.scrollHeight - scrollBottom - el.clientHeight;
}

/**
 * Scroll to the very bottom of the container
 */
export function scrollToBottom(
  el: Pick<HTMLElement, 'scrollHeight' | 'scrollTop'>
): void {
  el.scrollTop = el.scrollHeight;
}

/**
 * Check if the container is scrolled near the bottom (within threshold)
 */
export function isAtBottom(
  el: Pick<HTMLElement, 'clientHeight' | 'scrollHeight' | 'scrollTop'>,
  threshold = 15
): boolean {
  const scrollBottom = getScrollBottom(el);
  const hasScrollbars = el.clientHeight < el.scrollHeight;
  return scrollBottom <= threshold || !hasScrollbars;
}

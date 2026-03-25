/**
 * Timeline utilities based on Signal Desktop implementation
 * https://github.com/signalapp/Signal-Desktop
 */

export enum ScrollAnchor {
  /** Don't change scroll position */
  ChangeNothing,
  /** Scroll to the very bottom */
  ScrollToBottom,
  /** Maintain position from the top (loading newer messages) */
  Top,
  /** Maintain position from the bottom (loading older messages) */
  Bottom,
}

export enum MessageLoadingState {
  DoingInitialLoad = 1,
  LoadingOlderMessages,
  LoadingNewerMessages,
}

// Props needed to determine scroll anchor
export type ScrollAnchorProps = {
  messageLoadingState: MessageLoadingState | null;
  messagesLength: number;
  isAtBottom: boolean;
};

/**
 * Determine which scroll anchor strategy to use before an update
 * Based on Signal Desktop's getScrollAnchorBeforeUpdate
 */
export function getScrollAnchorBeforeUpdate(
  prevProps: ScrollAnchorProps,
  currentProps: ScrollAnchorProps
): ScrollAnchor {
  // If currently loading or no messages, don't change anything
  if (currentProps.messageLoadingState || !currentProps.messagesLength) {
    return ScrollAnchor.ChangeNothing;
  }

  // Check if loading just finished
  const loadingStateThatJustFinished: MessageLoadingState | undefined =
    !currentProps.messageLoadingState && prevProps.messageLoadingState
      ? prevProps.messageLoadingState
      : undefined;

  // Handle different loading states
  switch (loadingStateThatJustFinished) {
    case MessageLoadingState.DoingInitialLoad:
      // After initial load, scroll to bottom
      return ScrollAnchor.ScrollToBottom;

    case MessageLoadingState.LoadingOlderMessages:
      // After loading older messages, maintain position from bottom
      return ScrollAnchor.Bottom;

    case MessageLoadingState.LoadingNewerMessages:
      // After loading newer messages, maintain position from top
      return ScrollAnchor.Top;

    case undefined: {
      // If messages changed and we're at bottom, stay at bottom
      const messagesChanged = prevProps.messagesLength !== currentProps.messagesLength;
      if (messagesChanged && currentProps.isAtBottom) {
        return ScrollAnchor.ScrollToBottom;
      }
      break;
    }
  }

  return ScrollAnchor.ChangeNothing;
}

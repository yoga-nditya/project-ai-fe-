import { Keyboard } from 'react-native';

/**
 * Keyboard Utilities untuk React Native
 * Helper functions untuk keyboard handling
 */

/**
 * Dismiss keyboard
 */
export const dismissKeyboard = () => {
  Keyboard.dismiss();
};

/**
 * Add keyboard listeners
 * Returns cleanup function
 */
export const addKeyboardListeners = (
  onShow?: (height: number) => void,
  onHide?: () => void
) => {
  const showListener = Keyboard.addListener('keyboardDidShow', (e) => {
    if (onShow) {
      onShow(e.endCoordinates.height);
    }
  });

  const hideListener = Keyboard.addListener('keyboardDidHide', () => {
    if (onHide) {
      onHide();
    }
  });

  // Cleanup function
  return () => {
    showListener.remove();
    hideListener.remove();
  };
};

/**
 * Check if keyboard is visible
 */
let keyboardVisible = false;

export const isKeyboardVisible = () => keyboardVisible;

// Setup keyboard visibility tracking
export const setupKeyboardTracking = () => {
  const showListener = Keyboard.addListener('keyboardDidShow', () => {
    keyboardVisible = true;
  });

  const hideListener = Keyboard.addListener('keyboardDidHide', () => {
    keyboardVisible = false;
  });

  return () => {
    showListener.remove();
    hideListener.remove();
  };
};

export default {
  dismissKeyboard,
  addKeyboardListeners,
  isKeyboardVisible,
  setupKeyboardTracking,
};
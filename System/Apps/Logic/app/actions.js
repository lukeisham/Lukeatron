/** Print and Copy — both act on the view currently on screen. */

import { currentView, viewToText } from './view.js';

export function printCurrentView(win) {
  win.print();
}

/** @returns {Promise<boolean>} whether the text reached the clipboard */
export async function copyCurrentView(state, clipboard) {
  const text = viewToText(state, currentView(state));
  try {
    await clipboard.writeText(text);
    return true;
  } catch (error) {
    console.warn('copy: clipboard write refused', error);
    return false;
  }
}

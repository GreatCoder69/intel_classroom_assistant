/* filepath: c:\Users\gitaa\OneDrive\Desktop\Coding\intel_classroom_assistant\classroom-assistant\src\fixScrolling.js */
/**
 * This script helps maintain consistent dark background color
 * when scrolling beyond the content boundaries (overscroll)
 */

const setOverscrollColors = () => {
  /**
   * Maintain consistent dark background color when scrolling beyond content boundaries.
   * Sets up mutation observers and event listeners to enforce dark theme.
   */
  // Apply background color to all key elements
  document.documentElement.style.backgroundColor = 'var(--dark-bg)';
  document.body.style.backgroundColor = 'var(--dark-bg)';
  
  // Create a mutation observer to watch for changes
  const observer = new MutationObserver(() => {
    document.documentElement.style.backgroundColor = 'var(--dark-bg)';
    document.body.style.backgroundColor = 'var(--dark-bg)';
  });
  
  // Watch for changes in the body
  observer.observe(document.body, { 
    attributes: true, 
    childList: true,
    subtree: true
  });
  
  // Handle scrolling events
  document.addEventListener('scroll', () => {
    document.documentElement.style.backgroundColor = 'var(--dark-bg)';
    document.body.style.backgroundColor = 'var(--dark-bg)';
  });
  
  // Reapply styles after any potential DOM updates
  window.addEventListener('resize', () => {
    document.documentElement.style.backgroundColor = 'var(--dark-bg)';
    document.body.style.backgroundColor = 'var(--dark-bg)';
  });
};

export { setOverscrollColors };

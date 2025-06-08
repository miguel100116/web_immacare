// frontend/src/ui/componentLoader.js

/**
 * Fetches and injects an HTML component into a placeholder.
 * Can optionally show a skeleton loader first.
 * If finalComponentPath is not provided, 'skeletonPath' is treated as the final path.
 *
 * @param {string} placeholderId - The ID of the element to inject into.
 * @param {string} skeletonPath - The path to the skeleton OR the final component.
 * @param {string} [finalComponentPath] - Optional. The path to the real component.
 */
export async function loadComponent(placeholderId, skeletonPath, finalComponentPath) {
  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) {
    // This is correct: silently return if the placeholder isn't on the page.
    return;
  }

  // --- THIS IS THE NEW, FLEXIBLE LOGIC ---
  const isSkeleton = !!finalComponentPath; // True if a third argument exists
  const mainComponentPath = finalComponentPath || skeletonPath; // Use the 3rd arg if it exists, otherwise use the 2nd.

  try {
    // Step 1: If it's a skeleton load, fetch and display it first.
    if (isSkeleton) {
      const skeletonResponse = await fetch(skeletonPath);
      if (skeletonResponse.ok) {
        placeholder.innerHTML = await skeletonResponse.text();
      }
    }

    // Step 2: Fetch the final, main component.
    const mainResponse = await fetch(mainComponentPath);
    if (!mainResponse.ok) {
      throw new Error(`Failed to load component: ${mainComponentPath}`);
    }
    
    // Step 3: Replace the placeholder's content with the final component.
    placeholder.innerHTML = await mainResponse.text();

  } catch (error) {
    console.error(`Error loading component into #${placeholderId}:`, error);
    placeholder.innerHTML = `<p style="color:red; text-align:center;">Component could not be loaded.</p>`;
  }
}
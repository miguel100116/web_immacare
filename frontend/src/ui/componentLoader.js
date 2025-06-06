// frontend/src/ui/componentLoader.js

/**
 * Loads a skeleton component for an instant UI, then replaces it
 * with the final component once it's fetched.
 * @param {string} placeholderId - The ID of the element to inject into.
 * @param {string} skeletonPath - The path to the skeleton HTML file.
 * @param {string} finalComponentPath - The path to the final, real HTML component.
 */
export async function loadComponent(placeholderId, skeletonPath, finalComponentPath) {
  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) return;

  try {
    // Step 1: Fetch and display the skeleton immediately
    const skeletonResponse = await fetch(skeletonPath);
    if (skeletonResponse.ok) {
      const skeletonHtml = await skeletonResponse.text();
      placeholder.innerHTML = skeletonHtml;
    } else {
      // If skeleton fails, still try to load the main component later
      console.error(`Failed to load skeleton: ${skeletonResponse.statusText}`);
    }

    // Step 2: Fetch the final component in the background
    const finalResponse = await fetch(finalComponentPath);
    if (!finalResponse.ok) {
      throw new Error(`Failed to load final component: ${finalResponse.statusText}`);
    }
    const finalHtml = await finalResponse.text();
    
    // Step 3: Replace the skeleton with the final component
    placeholder.innerHTML = finalHtml;

  } catch (error) {
    console.error(`Error loading component into #${placeholderId}:`, error);
    placeholder.innerHTML = `<p style="color:red; text-align:center;">Component could not be loaded.</p>`;
  }
}
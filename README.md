Browser-Based Zine Layout Engine

A free, memory-safe, browser-based layout engine strictly designed for sequencing 8-page folding photography zines and monographs.

Live Demo: https://onlinezinemaker.netlify.app/

The Philosophy: Why build this?
Most browser-based design tools compress your assets or completely crash your RAM when you try to load twenty uncompressed, 300dpi photographs into a single workspace. On the other end of the spectrum, professional desktop software like InDesign can be bloated and intimidating for quick visual sequencing.

This project was engineered to sit right in the middle: a lightweight, client-side-only tool that lets photographers drag and drop massive, print-ready files to test their narrative flow, pacing, and physical folds, and then export a pristine 300dpi PDF without leaving the browser.

No servers. No forced compression. No feature creep.

Key Features
1. Memory-Safe Engine
Handling raw print-resolution files in a browser environment quickly leads to memory leaks and crashes. This engine implements several safeguards:

Fabric.js Optimization: Stateful caching is disabled (statefullCache = false), and rendering is strictly controlled to prevent the browser from constantly re-drawing massive image data during drag events.

Strict Undo Cap: The history state array is hard-capped at 3 steps. Older states are actively shifted out of memory, preventing the JSON blobs of 300dpi canvases from monopolizing the user's RAM.

2. The 8-Page Fold Logic & Magnetic Snapping
Built specifically for the classic single-sheet folding zine (where one sheet of paper is folded and cut into an 8-page booklet).

Automated Inversion: Because of the physical folding mechanics, the top row of pages (Pages 1-4) must be printed upside down. The tool includes dedicated rotation controls for this physical reality.

Mathematical Grid Snapping: The canvas calculates a precise array of coordinates representing the absolute centers, vertical folds, horizontal folds, and edges of all 8 quadrants. When dragged within a 50px threshold, objects magnetically lock into print-perfect alignment.

3. Non-Destructive Cropping
Rather than destructively deleting pixel data, the crop tool utilizes mathematical masking.

It generates a visual, dashed bounding box over the selected image.

Upon applying the crop, the engine calculates the precise cropX, cropY, and scale offsets relative to the image's original dimensions.

This preserves the full-resolution source file in the background, allowing the user to un-crop or adjust the framing later without quality loss.

4. 3D Flip Preview
A critical step in sequencing is judging the physical page turns. The engine includes a CSS-driven virtual dummy book.

To prevent rendering lag, the engine temporarily generates a compressed, layout-only snapshot of the canvas.

It mathematically maps specific coordinates of that flat snapshot (e.g., coordinates for Page 2, Page 3, etc.) to 8 individually rotating HTML div faces using transform-style: preserve-3d.

This allows users to visually test their narrative pacing and check for layout errors before exporting the final file.

5. Archival Blend Modes
Zines often mix pristine photographs with scanned artifacts, handwritten notes, or textural elements.

The engine exposes the HTML5 Canvas globalCompositeOperation property directly to the UI.

Users can apply standard blend modes (Multiply, Screen, Overlay, Color Burn, etc.) and adjust opacity, seamlessly stitching high-resolution photographs into background textures or archival documents natively in the browser.

6. Print-Ready PDF Export
The final output is optimized strictly for physical print production.

When exporting, the engine temporarily hides all UI utility elements (blue fold guides, orange hardware margins, crop boxes) by targeting their custom isGuide property.

It calculates the exact millimeter-to-pixel conversion (currentWidth / 300 * 25.4) to maintain true 300dpi density.

The pristine snapshot is passed to jsPDF and wrapped in a print-ready PDF container, perfectly sized for A4, A3, or the selected paper dimension.

7. Local Project Management & Custom Typography
The application operates entirely client-side with no database.

State Saving: Users can export the entire Fabric.js canvas state—including all custom properties, text values, and image data—into a raw .json file. Loading this file back restores the exact workspace.

Local Font API: Using the FontFace API, users can upload any .ttf or .otf file from their hard drive. The engine reads the arrayBuffer, injects it into the document's typography stack, and immediately applies it to the selected text objects.

Tech Stack
This is a strictly static, client-side application.

HTML5 / CSS3 (Custom responsive UI, transparent-to-visible scrollbars, CSS 3D transforms)

Vanilla JavaScript (ES6)

Fabric.js (v5.3.1): The core canvas manipulation and rendering engine.

jsPDF: Handles the final millimeter-to-pixel conversion for print-ready PDF generation.

Local Development
Because there is no backend or build step required, running this locally is incredibly simple:

Clone the repository: git clone (https://github.com/Dhawal-Dutta/OnlineZineMaker)

Open the folder in VS Code (or your preferred editor).

Spin up a local server (like the VS Code "Live Server" extension) to bypass browser CORS restrictions on local image processing.

Open index.html.

Contributing:

This tool is considered feature-complete for its specific use case. If you need complex masking, typography kerning, or CMYK color separation, you should be using Photoshop or InDesign. However, pull requests for bug fixes, performance optimizations, or UI accessibility improvements are always welcome!

Designed & Engineered by Dhawal Dutta

M.Des Photography Design, NID Gandhinagar

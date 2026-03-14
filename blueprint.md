# Project Blueprint: AI Palm Reader

## Overview

This project is a web-based application that provides palm readings based on an uploaded image of a user's hand. The application will have a simple and intuitive interface, allowing users to upload an image and receive a generated interpretation of their palm lines.

## Current State

The project has a basic functional structure with image upload, simulated analysis, and initial styling.

## Plan for Current Version (Auto-Detection & Line Visualization)

### 1. **HTML Structure (`index.html`)**
    * Add a unified upload zone that accepts multiple images.
    * Use `<canvas>` elements for overlays on image previews.
    * Integrate MediaPipe Hands SDK via CDN.

### 2. **Styling (`style.css`)**
    * Refine the result output with a cleaner, more structured layout (e.g., cards with icons).
    * Ensure the canvas overlays are positioned correctly over the images.
    * Improve the "Loading" state with more informative steps (e.g., "Detecting hand...", "Identifying lines...").

### 3. **JavaScript Logic (`main.js`)**
    * Use **MediaPipe Hands** to:
        - Detect if the uploaded hand is **Left** or **Right**.
        - Get coordinates for the palm lines (based on hand landmarks).
    * Draw lines on the `<canvas>`:
        - **Life Line:** Curve around the thumb base (landmarks 1, 2, 5, etc.).
        - **Head Line:** Across from the side to the center (landmarks 5, 13, 17 approx).
        - **Heart Line:** Below the finger bases (landmarks 5, 9, 13, 17).
        - **Fate Line:** Vertical through the center (wrist to middle finger base).
    * Automatically assign the detected images to the correct slots (Left/Right).
    * Redesign the `resultDiv` to show clear, digestible insights with better spacing and readability.

### 4. **Git & Deployment**
    * Commit and push the changes to GitHub.
    * Prepare for potential deployment.

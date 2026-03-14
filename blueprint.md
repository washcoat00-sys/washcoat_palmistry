# Project Blueprint: AI Palm Reader

## Overview

This project is a web-based application that provides palm readings based on an uploaded image of a user's hand. The application will have a simple and intuitive interface, allowing users to upload an image and receive a generated interpretation of their palm lines.

## Current State

The project has a basic functional structure with image upload, simulated analysis, and initial styling.

## Plan for Current Version (Dual Palm, Gender, & Age Integration)

### 1. **HTML Structure (`index.html`)**
    * Add Gender selection (Male/Female) and Age input field.
    * Create two distinct upload zones: **Left Palm (Congenital/Early Life)** and **Right Palm (Acquired/Later Life)**.
    * Each zone will have its own drag-and-drop area and preview.

### 2. **Styling (`style.css`)**
    * Design a responsive layout for dual palm uploads (side-by-side on desktop, stacked on mobile).
    * Style the new Gender/Age input fields to match the modern aesthetic.
    * Refine results section to handle comparative analysis (Left vs. Right).

### 3. **JavaScript Logic (`main.js`)**
    * Implement separate file handling and preview logic for Left and Right palms.
    * Incorporate "Congenital vs. Acquired" logic based on Gender and Age:
        - **Congenital (선천운):** Based on the primary hand (Left for Men, Right for Women in traditional contexts, or interpreted as the "blueprint").
        - **Acquired (후천운):** Based on the secondary hand and user efforts.
        - **Age Influence:** Readings will emphasize 30s as a turning point between congenital and acquired traits.
    * Expand analysis text to provide comparative insights between the two hands.

### 4. **Git & Deployment**
    * Commit and push the changes to GitHub.
    * Prepare for potential deployment.

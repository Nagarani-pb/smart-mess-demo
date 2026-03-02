# Smart Mess Management System

This workspace contains:

- **Full-stack version (Node + Express + MongoDB)**: `server.js`, `routes/`, `models/`, `views/`, `public/`
- **Standalone full demo (NO server needed)**: `public/demo-full/`  
  Works by opening HTML files directly in Chrome and stores data in your browser (**localStorage**).

## Option A (Recommended right now): Run the full demo without Node/npm

1. Open this file in **Chrome**:
   - `public/demo-full/index.html`
2. Login using demo cards:
   - **Admin**: `ADMIN123`
   - **Student**: `STU1001` or `STU1002`
3. Student flow:
   - Book tomorrow meals + choose dishes
   - Submit feedback
4. Admin flow:
   - View demand aggregation, dish-wise counts, inventory calculations
   - Do attendance scan and mark no-shows
   - View waste %, cost metrics (mock), popular dishes, rating analytics

> If camera scanning doesn’t work, type the code (many barcode scanners behave like keyboards).

## Option B: Run the full-stack version in VS Code (needs Node + MongoDB)

### 1) Install prerequisites
- Install **Node.js LTS** from `https://nodejs.org` (ensure "Add to PATH" is enabled).
- Install and start **MongoDB** (default `mongodb://127.0.0.1:27017`).

### 2) Install and start

```bash
npm install
npm start
```

Open:
- `http://localhost:3000/health`
- `http://localhost:3000/login`

### 3) Seed demo data (full-stack)
Visit:
- `http://localhost:3000/admin/seed`

Then login using:
- `ADMIN123`, `STU1001`, `STU1002`

## Publish as a real URL (get a link)

If you want a public link (like a website URL), the easiest is to publish **the standalone demo**:

- **Netlify Drop**: create a Netlify site and drag-drop the `public/demo-full` folder.
- **GitHub Pages**: push this project to GitHub and enable Pages for the `public/demo-full` directory.


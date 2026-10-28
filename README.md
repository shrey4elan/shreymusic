# Cinematic 3D Personal Site
React + Vite + React Three Fiber + GSAP ScrollTrigger + Web Audio.

## Run
```
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview    # serve the production build
```

## Make it yours (everything is in `src/config.js`)
- **Name, nickname, bio, tagline, section titles, socials, accent colour**: edit the top fields.
- **Photos**: put files in `public/images/` (e.g. `photo-01.jpg`), then update `photos[].src` and `ratio` (width/height, e.g. `3/4`). Keep each under ~500 KB.
- **Music**: put MP3s in `public/music/`, covers in `public/images/`, then edit `tracks`. The included `.wav` files are tiny synthesized placeholders. Remote audio needs CORS headers for the visualizer to react.
- **3D car**: drop a `.glb` into `public/models/`, set `carModel: '/models/car.glb'`. The front should face -Z and the car be about 4 units long. If it fails to load, the built-in procedural car appears. Use only models you have the licence for (e.g. CC0 from Poly Pizza or Sketchfab).

## Behaviour notes
- Music never autoplays; playback starts on a click/tap.
- Sound toggle mutes audio; Motion toggle (and `prefers-reduced-motion`) stops idle animation.
- Quality adapts: coarse-pointer or ≤4-core devices get a lower pixel ratio, fewer rings and particles.
- No WebGL, or a 3D error, shows a static CSS fallback; the rest of the site still works.

## Theme: Rajasthan Desert Luxury
Palette, radii (`--r-sm/md/lg`), glass tokens and easing live at the bottom of `src/styles.css`. The camel, sun and dunes are inline SVG in `src/Desert.jsx` (no external assets; speed = `walk` duration in CSS). Accent for the 3D scene: `accent` in `src/config.js`.

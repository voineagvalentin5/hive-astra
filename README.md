# Hive Astra

An interactive solar-system workbench by **Codex Hive Labs LLC**. Deep graphite panels, gold accents, and hexagonal motifs match the visual direction of Hive Scribe (`scribe.codex-hive.com`).

**Live site:** https://astra.codex-hive.com/

## Features

- Responsive desktop and mobile layout, with the Hive Astra emblem.
- Interactive orbital view: select the Sun, Mercury, Venus, Earth, the Moon, Mars, Jupiter, Saturn, Uranus or Neptune; drag, zoom, reset, and search.
- Time slider: ±1 year of **simplified** circular-orbit motion (educational, **not** real JPL ephemerides).
- Object inspector, comparison metrics, mission archive links, a learning section, and a sources / attribution dialog.
- Live public feeds: NASA DONKI solar flares, NASA EPIC Earth imagery, NOAA SWPC Kp index, USGS earthquakes, Where the ISS At, and NASA NeoWs close approaches (7-day window on this static host).
- No telemetry values are fabricated when a feed is unavailable. The UI shows a dash and the source status instead.

## Deploy

This repository is a static site on GitHub Pages (`main` branch, site root) with the custom domain `astra.codex-hive.com`. DNS is a CNAME from `astra` to `voineagvalentin5.github.io`, managed separately in GoDaddy.

To preview locally, serve the folder with any static file server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a modern browser. Opening `index.html` as a `file://` URL renders the interface, but remote API calls may not work.

## Data notes

- Orbits: visually exaggerated, approximate circular periods with arbitrarily selected phase offsets, not observations, calibrated ephemerides or true interplanetary geometry. The Moon's mean Earth distance is indicative, not instantaneously calculated.
- Earth EPIC: latest released sunlit-disk image, not real-time 360° cloud coverage.
- ISS: instantaneous reported ground position, **not** a visibility or overhead-pass forecast.
- Solar flare reports: reported NASA DONKI events over seven days, not all sub-threshold flare activity.
- NOAA Kp: observed planetary geomagnetic index; not an auroral-visibility forecast.
- Close-approach count: near-Earth objects within 0.05 AU over the upcoming 7 days (NASA NeoWs), not predicted collisions.
- Attribution: NASA, NOAA, USGS and JPL independently. No affiliation or endorsement.
- Third-party ISS data commercial licensing must be confirmed before commercial production.

## Source links

- https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR (DONKI solar flares; official CCMC API after the 2026 endpoint move)
- https://api.nasa.gov/neo/rest/v1/feed (NASA NeoWs close approaches)
- https://epic.gsfc.nasa.gov/about/api (EPIC)
- https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json (NOAA)
- https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php (USGS)
- https://wheretheiss.at/w/developer (ISS third party)

## Files

- `index.html` — page structure and accessible navigation
- `styles.css` — responsive branded design
- `app.js` — interactive 3D-projected orbital canvas, cards, and telemetry
- `assets/hive-astra-emblem.webp` / `assets/icon.png` — brand emblem and 512px app icon
- `globe.js` / `epic.js` — textured sphere renderer and NASA EPIC sequence
- `assets/textures/` — planet texture maps
- `data/epic/` + `tools/bake_epic.py` + `.github/workflows/epic-cache.yml` — same-origin EPIC cache and its 6-hour refresh
- `CNAME` / `.nojekyll` — GitHub Pages custom domain

## Textured planets and NASA EPIC sequence

- **Textured planets.** `globe.js` draws every body as a rotating, sunlit sphere by sampling real equirectangular texture maps on a 2D canvas (no WebGL or CDN). Saturn has a textured ring. Textures are in `assets/textures/` (about 600 KB, WebP). If they cannot load (for example via `file://`), simple procedural discs are used instead.
- **NASA EPIC sequence (Earth).** `epic.js` loads the latest published day of EPIC natural-color images (about 12 frames, roughly 1h48m apart) and plays them in the Earth inspector, either as the original disk photos or re-projected onto the 3D globe. It is labeled as real NASA EPIC images with the capture date and time in UTC, and is not live.
- **How the projection works.** Each frame's metadata gives the centroid latitude/longitude (the point directly below DSCOVR). The disk is located in the photo, the view is treated as orthographic from that point, and every map pixel on the visible side is looked up in the photo and blended over the NASA Blue Marble base map, fading toward the limb. Areas EPIC did not see keep the base map.
- **Image access.** epic.gsfc.nasa.gov serves images without CORS headers, so the page cannot read their pixels directly. `tools/bake_epic.py` keeps a resized same-origin copy of the latest day in `data/epic/`, refreshed every 6 hours by `.github/workflows/epic-cache.yml`. If that copy is older than the newest EPIC day, the page falls back to api.nasa.gov (`DEMO_KEY`, up to 6 frames), then to the original photos without projection. If EPIC cannot be reached, the panel says so and shows the static base map.

### Texture credits

- Earth: NASA Visible Earth "Blue Marble" (NASA Goddard / Reto Stöckli), public domain.
- Sun, Mercury, Venus (atmosphere), Moon, Mars, Jupiter, Saturn and ring, Uranus, Neptune: [Solar System Scope](https://www.solarsystemscope.com/textures/), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), based on NASA data. Resized to WebP.
- EPIC imagery: NASA EPIC team / NOAA DSCOVR, public domain.

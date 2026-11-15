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
- `CNAME` / `.nojekyll` — GitHub Pages custom domain

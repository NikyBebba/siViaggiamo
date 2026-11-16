# Your Irish Adventure ☘

A playful graduation-trip gift website: **HTML + CSS + vanilla JavaScript**, with an interactive Ireland map, four demo destinations, a one-time introductory reveal, timeline, messages and temporary avatars.

## Run locally

The project has no build step. You can open `index.html` directly, but a local server is recommended:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publish using GitHub Pages

1. Create a public GitHub repository named `your-irish-adventure`.
2. Upload all files and folders **preserving their structure**.
3. In the repository select **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch** → `main` → `/(root)` and save.
5. Visit `https://YOUR-USERNAME.github.io/your-irish-adventure/` when Pages finishes publishing.
6. Generate a QR code pointing to the final published URL only after confirming the URL works on a phone.

No database and no credentials are required.

## Replace placeholder content

Edit only `js/destinations.js` to change the four demo stops:

- `title`, `region`, `lat`, `lng`: geographic position and label.
- `description`, `dedication`: content of the destination bottom sheet.
- `image`: use a local path such as `assets/images/galway.jpg` (initially `null`, which shows a placeholder).
- `day`: can be added later when actual dates are known.
- Add/remove objects to change the number of stops. Order in the array is itinerary order.

For the girls' photos, add images at `assets/images/girl-1.jpg` and `girl-2.jpg` and update the `travelers` `image` values in the same JS file. Their circular shapes already adapt to images.

Edit the final dedication directly in `index.html`, in the `section id="message"`.

## Map implementation

Uses **Leaflet 1.9.4** from a public CDN and OpenStreetMap raster tiles. Connectivity is required; this is not an offline map.

The **dotted line is an illustrative, point-to-point connection**, NOT a road route or directions. For actual road geometry a routing provider or a validated GPX/GeoJSON itinerary would be needed.

The official OpenStreetMap tile servers are provided on a best-effort basis with usage rules: https://operations.osmfoundation.org/policies/tiles/ . The current configuration is intended for a small, low-traffic personal website and keeps attribution visible. If traffic grows or a different cartographic style is wanted, switch to a tile provider with suitable terms.

## Acceptance checklist

- [ ] Intro appears on first click of “Let's go explore” per tab session.
- [ ] After intro, all destinations are visible and map can be zoomed/panned.
- [ ] Each map marker opens the correct bottom sheet.
- [ ] Bottom sheet offers previous/next, external maps and close.
- [ ] Timeline contains the same stops in the same order.
- [ ] Bottom navigation switches among four sections.
- [ ] All photo placeholders can be replaced without editing the CSS.
- [ ] Works on a real smartphone via GitHub Pages.

## Notes

All names, text and positions are demonstration data until confirmed by the gift organisers. Do not publish private information or photos without approval from the people concerned.

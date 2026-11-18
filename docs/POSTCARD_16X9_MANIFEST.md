# Manifesto fotografie cartoline 16:9 — v1.7.2

Riquadro standard: **16:9, larghezza 100% dell'area cartolina, altezza derivata da `aspect-ratio`**. Nessun `max-height` sul contenitore fotografico: in precedenza il limite a 280px faceva restringere la larghezza (498px per il 16:9, 373px per il 4:3), generando cartoline disallineate.

Le copie sono state generate dagli originali approvati già presenti nel repository, senza upscaling e senza sovrascrivere i sorgenti. Le copie WebP esistenti in `assets/images/` e gli originali in `photos/`, `materials/.extracted/` restano invariati.

## Asset generati

| Destinazione | File generato | Sorgente | Crop applicato | Output | Peso | Criterio di inquadratura |
|---|---|---|---|---|---|---|
| Dublino | `assets/images/postcards-16x9/dublino-hapenny-bridge-16x9.webp` | `materials/.extracted/online/dublino-happenny-source.jpg` (5203×2927) | 1px per lato → 5200×2925 (16:9 esatto), poi resize | 1600×900 | 179 KiB | Ha'penny Bridge intera e contesto urbano |
| Cliffs of Moher | `assets/images/postcards-16x9/cliffs-of-moher-panorama-16x9.webp` | `materials/.extracted/online/cliffs-moher-source.jpeg` (2000×1125) | nessuno (già 16:9), resize | 1600×900 | 390 KiB | panorama integrale: orizzonte e profondità preservati |
| Galway | `assets/images/postcards-16x9/galway-quartiere-latino-16x9.webp` | `photos/IMG_0690.JPG` (547×365) | `(0, 0, 547, 308)` — fascia inferiore | 547×308 | 61 KiB | prioritaria l'architettura colorata del Quartiere Latino; nessun ingrandimento |
| Howth | `assets/images/postcards-16x9/howth-east-pier-lighthouse-16x9.webp` | `photos/IMG_0678.jpg` (1450×874) | `(0, 29, 1450, 845)` → 1450×816 | 1450×816 | 139 KiB | nuova foto approvata del faro/East Pier; 29px di cielo e primo piano |

Codifica WebP qualità 84, metodo 6. I rapporti effettivi sono 1.7778 (Dublino/Cliffs), 1.7760 (Galway) e 1.7770 (Howth); le minime differenze sono dovute a dimensioni integer e non producono bande visibili.

## Eccezione: Glendalough

Nessuna copia 16:9 generata. L'asset `assets/images/glendalough-lago-paesaggio.webp` (1412×1051) mostra cuciture interne regolari (colonne ~339, ~699, ~1056 e riga ~701): è un collage, non una fotografia singola. Non è stato ritagliato, per evitare la distruzione del soggetto. Resta temporaneamente a 4:3 con `photo: { aspect: '4 / 3' }` in `js/destinations.js`.

**Asset mancante:** fotografia singola di Glendalough già approvata e sufficientemente risoluta per un ritaglio 16:9. Fino alla sua disponibilità la cartolina Glendalough non rientra nel criterio di geometria identica alle altre quattro.

## Verifica e limitazioni

I test Playwright controllano geometria del contenitore, rapporto dell'asset, caricamento, assenza di `max-height`, visibilità della foto, assenza di auto-scroll e stella fuori dall'immagine su desktop e mobile.

La scelta estetica dell'inquadratura (soggetto riconoscibile, assenza di tagli accidentali) **non può essere validata da questo ambiente**, che non supporta l'ispezione visiva diretta: la revisione finale del Product Owner resta obbligatoria.

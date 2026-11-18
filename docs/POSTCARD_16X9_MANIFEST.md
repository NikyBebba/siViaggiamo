# Manifesto fotografie cartoline 16:9 — v1.7.2 (definitivo)

## Geometria standard

Tutte e cinque le cartoline usano lo stesso riquadro fotografico:

- `width: 100%` dell'area disponibile nella cartolina;
- `aspect-ratio: 16 / 9`, altezza derivata dalla larghezza;
- nessun `max-height` e nessuna altezza fissa sul contenitore foto;
- `object-fit: contain` con immagini già 16:9, quindi nessuna banda vuota;
- stessa geometria in cartolina compatta ed espansa, su desktop e mobile.

Il CSS è già stato consolidato nel branch: `.sheet-img` e `.sheet-compact-thumb` usano `width:100%` + `aspect-ratio:var(--card-aspect,16/9)` e i tre vecchi `max-height` (280px/240px) sono stati rimossi. Non sono stati aggiunti override specifici per destinazione.

## Fotografie definitive

Le cinque immagini sono state scelte e fornite direttamente dal Product Owner. I file originali si trovano nella cartella privata `Photos/` (esclusa da Git) con i nomi dei luoghi indicati dal Product Owner. Non sono state cercate immagini alternative online e non sono stati riutilizzati i vecchi asset delle cartoline.

| Destinazione | File originale (`Photos/`) | File finale (`assets/images/postcards-16x9/`) | Soggetto dichiarato | Originale | Ritaglio 16:9 | Finale | Ratio | Peso WebP |
|---|---|---|---|---|---|---|---|---|
| Dublino | `dublin.png` | `dublino-samuel-beckett-16x9.webp` | Samuel Beckett Bridge al tramonto | 1920 × 724 | `(339, 0, 1626, 724)` → 1287 × 724 | 1287 × 724 | 1.77762 | 84.4 KiB |
| Glendalough | `Glendalough.png` | `glendalough-upper-lake-16x9.webp` | Upper Lake, valle e riflessi sull'acqua | 2048 × 1365 | `(0, 107, 2048, 1259)` → 2048 × 1152, poi resize | 1600 × 900 | 1.77778 | 132.5 KiB |
| Galway | `galway.png` | `galway-latin-quarter-16x9.webp` | Strada colorata e animata del Latin Quarter | 1400 × 788 | nessuno: sorgente già ~16:9 | 1400 × 788 | 1.77665 | 304.9 KiB |
| Cliffs of Moher | `cliifs.png` | `cliffs-of-moher-16x9.webp` | Scogliere verdi sull'Oceano Atlantico | 1500 × 750 | `(84, 0, 1417, 750)` → 1333 × 750 | 1333 × 750 | 1.77733 | 266.2 KiB |
| Howth | `howt.png` | `howth-baily-lighthouse-16x9.webp` | Baily Lighthouse, costa rocciosa e mare | 1900 × 1079 | `(0, 5, 1900, 1074)` → 1900 × 1069, poi resize | 1600 × 900 | 1.77778 | 273.4 KiB |

### Criteri di ritaglio

Le finestre non sono crop centrali automatici: sono state scelte analizzando l'energia dei bordi delle immagini e l'orientamento del soggetto dichiarato.

- **Dublino:** il sorgente è molto panoramico (2.65:1); è stata conservata la fascia centrale con la maggiore densità di dettaglio (offset x = 339).
- **Glendalough:** ritaglio quasi simmetrico (107px sopra, 106px sotto) per mantenere insieme valle e riflessi; poi riduzione a 1600 × 900.
- **Galway:** il sorgente è già 1.77665, scostamento di 0.00113 da 16/9: nessun ritaglio, massima risoluzione disponibile conservata.
- **Cliffs of Moher:** finestra a offset x = 84, scelta per mantenere la maggiore densità di dettaglio delle scogliere.
- **Howth:** solo 5px rimossi sopra e sotto, poi riduzione a 1600 × 900; faro e costa restano integri.

### Conversione e integrità

- WebP qualità 84, metodo 6; conversione da RGB, senza EXIF, ICC o XMP (verificato: nei file risultanti compaiono solo i chunk `RIFF`/`WEBP`).
- Nessun upscaling: ogni output è minore o uguale alla finestra di ritaglio; i resize a 1600 × 900 sono riduzioni.
- Gli originali in `Photos/` non sono stati modificati: gli hash SHA-256 sono stati verificati prima e dopo la generazione.
- I vecchi asset in `assets/images/` e le precedenti copie in `assets/images/postcards-16x9/` sono state conservate, senza sovrascritture.

## Verifica geometrica

Misurazioni eseguite con Playwright su Chromium desktop (1280 × 800) e mobile (390 × 844):

| | Desktop | Mobile |
|---|---|---|
| Foto espansa, tutte le destinazioni | 560 × 315 (1.7778) | 390 × 219,38 (1.7778) |
| Miniatura compatta, tutte le destinazioni | 88 × 49,5 (1.7778) | 74 × 41,63 (1.7778) |

`max-height` risultante: `none`; `scrollTop` dopo l'espansione: `0`; larghezza del contenitore uguale a quella del pannello (560px desktop, 390px mobile). I test verificano inoltre caricamento dell'immagine, piena larghezza, assenza di auto-scroll, visibilità della X e posizione della stella fuori dalla foto.

### Screenshot prodotti

Screenshot desktop (1280 × 800) e mobile (390 × 844), per ogni destinazione in stato compatto ed espanso, più la Home:

`materials/.extracted/screenshots/postcard-final-16x9/`

- `desktop/00-home.png`, `mobile/00-home.png`
- `desktop/compact/01-dublino.png` … `05-howth.png`
- `desktop/expanded/01-dublino.png` … `05-howth.png`
- `mobile/compact/01-dublino.png` … `05-howth.png`
- `mobile/expanded/01-dublino.png` … `05-howth.png`
- contact sheet: `contact-sheet-desktop-compact.png`, `contact-sheet-desktop-expanded.png`, `contact-sheet-mobile-compact.png`, `contact-sheet-mobile-expanded.png`

La cartella `materials/` è esclusa da Git: gli screenshot sono un artefatto locale di QA e non vengono pubblicati.

## Provenienza e limitazioni

La provenienza dichiarata è «file fornito direttamente dal Product Owner». Autore e licenza non sono stati dichiarati e non sono verificabili dai documenti presenti nel repository: si veda `docs/ASSET_CREDITS.md`. La documentazione disponibile **non è sufficiente a dimostrare il diritto di pubblicazione** di queste cinque immagini; serve una conferma del Product Owner prima di pubblicare.

Questo ambiente non supporta l'ispezione visiva diretta: i controlli qui riportati sono oggettivi (dimensioni, rapporti, caricamento, geometria) e **non costituiscono approvazione estetica**. La revisione finale dell'inquadratura spetta al Product Owner.

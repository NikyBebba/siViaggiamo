# Crediti asset — siViaggiamo v1.8 (Graduation Gift)

Questo file registra la provenienza delle immagini usate nel sito. Le fotografie personali restano in `Photos/` (esclusa da Git); in `assets/images/` sono presenti solo le copie approvate e ottimizzate.

## Cartoline definitive 16:9 — file forniti dal Product Owner

Le cinque fotografie delle cartoline sono state **fornite direttamente dal Product Owner** e selezionate da lui. I file originali si trovano in `Photos/` con i nomi dei luoghi. Non sono state scaricate da fonti esterne né associate ad attribuzioni trovate online.

| Destinazione | File originale | WebP finale | Soggetto dichiarato | Originale → finale | Ritaglio | Provenienza | Autore / licenza |
|---|---|---|---|---|---|---|---|
| Dublino | `Photos/dublin.png` | `assets/images/postcards-16x9/dublino-samuel-beckett-16x9.webp` | Samuel Beckett Bridge al tramonto | 1920 × 724 → 1287 × 724 | `(339,0,1626,724)` | File fornito dal Product Owner | Non dichiarati / non verificati |
| Glendalough | `Photos/Glendalough.png` | `assets/images/postcards-16x9/glendalough-upper-lake-16x9.webp` | Upper Lake, valle e riflessi sull'acqua | 2048 × 1365 → 1600 × 900 | `(0,107,2048,1259)` + resize | File fornito dal Product Owner | Non dichiarati / non verificati |
| Galway | `Photos/galway.png` | `assets/images/postcards-16x9/galway-latin-quarter-16x9.webp` | Strada colorata e animata del Latin Quarter | 1400 × 788 → 1400 × 788 | Nessuno (già ~16:9) | File fornito dal Product Owner | Non dichiarati / non verificati |
| Cliffs of Moher | `Photos/cliifs.png` | `assets/images/postcards-16x9/cliffs-of-moher-16x9.webp` | Scogliere verdi sull'Oceano Atlantico | 1500 × 750 → 1333 × 750 | `(84,0,1417,750)` | File fornito dal Product Owner | Non dichiarati / non verificati |
| Howth | `Photos/howt.png` | `assets/images/postcards-16x9/howth-baily-lighthouse-16x9.webp` | Baily Lighthouse, costa rocciosa e mare | 1900 × 1079 → 1600 × 900 | `(0,5,1900,1074)` + resize | File fornito dal Product Owner | Non dichiarati / non verificati |

Tutte le copie pubbliche sono WebP (qualità 84, metodo 6), senza metadati EXIF/ICC/XMP e senza upscaling. Gli originali restano intatti in `Photos/`. Dettagli operativi in `docs/POSTCARD_16X9_MANIFEST.md`.

> **Criticalità di licenza (ancora aperta in v1.8):** per queste cinque immagini autore e licenza non risultano verificati. La provenienza documentale disponibile **non è sufficiente a dimostrare il diritto di pubblicazione**: prima di pubblicare la v1.8 serve una conferma esplicita del Product Owner. Non è stata inventata alcuna attribuzione. Le immagini non sono state pubblicate: il lavoro è stato solo committato localmente.

## Immagini da Wikimedia Commons (ancora usate nella Guida)

Queste due immagini non sono più usate nelle cartoline, ma restano nella Guida di viaggio e nei relativi asset pubblicati.

### Dublino — Ha'penny Bridge

- **File sorgente:** `Ha'penny Bridge & River Liffey, Dublin (507188) (32773411991).jpg`
- **Autore:** Robert Linsdell
- **Fonte:** https://commons.wikimedia.org/wiki/File:Ha%27penny_Bridge_%26_River_Liffey,_Dublin_(507188)_(32773411991).jpg
- **Licenza:** Creative Commons Attribution 2.0 (CC BY 2.0) — https://creativecommons.org/licenses/by/2.0/
- **Attribuzione:** “Ha'penny Bridge & River Liffey, Dublin (507188)” di Robert Linsdell, CC BY 2.0, via Wikimedia Commons
- **Risoluzione originale:** 5203 × 2927 px
- **Download originale:** https://upload.wikimedia.org/wikipedia/commons/3/32/Ha%27penny_Bridge_%26_River_Liffey%2C_Dublin_%28507188%29_%2832773411991%29.jpg
- **Uso nel sito:** `assets/images/dublino-hapenny-bridge.webp` (1600 × 900 px, WebP), usato dalla Guida. Ridimensionamento senza upscaling; nessuna modifica del contenuto.

### Cliffs of Moher — Panorama

- **File sorgente:** `Cliffs Of Moher Panorama Clare Ireland Landscape Photography (221392087).jpeg`
- **Autore:** Giuseppe Milo
- **Fonte:** https://commons.wikimedia.org/wiki/File:Cliffs_Of_Moher_Panorama_Clare_Ireland_Landscape_Photography_(221392087).jpeg
- **Licenza:** Creative Commons Attribution 3.0 (CC BY 3.0) — https://creativecommons.org/licenses/by/3.0/
- **Attribuzione:** “Cliffs Of Moher Panorama Clare Ireland Landscape Photography (221392087)” di Giuseppe Milo, CC BY 3.0, via Wikimedia Commons
- **Risoluzione originale:** 2000 × 1125 px
- **Download originale:** https://upload.wikimedia.org/wikipedia/commons/e/e7/Cliffs_Of_Moher_Panorama_Clare_Ireland_Landscape_Photography_%28221392087%29.jpeg
- **Uso nel sito:** `assets/images/cliffs-of-moher-panorama.webp` (1600 × 900 px, WebP), usato dalla Guida. Ridimensionamento senza upscaling; nessuna modifica del contenuto.

## Foto personali e di destinazione

Le immagini seguenti provengono dalle fotografie di viaggio approvate e non richiedono attribuzione esterna:

- `avatar-martina.webp`, `avatar-lorenza.webp` — da `Photos/foto-martina.JPG` e `Photos/foto-lorenza.jpg`. Copie ottimizzate con correzione EXIF; originali intatti.
- `home-temple-bar.webp` — da `Photos/Tra Amiche davanti al Temple Bar.png` (1536 × 1024). Copia WebP ottimizzata senza metadati EXIF/ICC; originale lasciato intatto in `Photos/`. Usata come fotografia della Home.
- `glendalough-lago-paesaggio.webp`, `galway-quartiere-latino.webp`, `howth-cliff-walk.webp`, `galway-market-insegna.webp`, `howth-east-pier-lighthouse.webp` — asset precedenti, ancora usati dalla Guida; non più usati nelle cartoline.
- `martina-foche-meme.webp` — usata solo nell'easter egg della Guida di Howth.

Dettagli e catalogo completo: `docs/PHOTO_CATALOG.md` e `docs/IMAGE_CATALOG.md`.

> Nota: i sorgenti originali scaricati (`materials/.extracted/online/`) e la cartella `Photos/` sono esclusi da Git. Solo gli asset pubblicati in `assets/images/` fanno parte del repository.

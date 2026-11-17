# Catalogo fotografico — `photos/`

Documento di lavoro. **Nessuna foto è stata inserita nel sito, pubblicata o aggiunta a Git.**

## Sintesi

- Sorgente: 20 file in `photos/` (12,5 MiB), lasciati **intatti** e ora esclusi da Git tramite `.gitignore` (`photos/` e `Photos/`).
- Copie ottimizzate in `photos/.prepared/<categoria>/` (WebP, qualità 84 per foto/easter egg e 92 per screenshot, metodo 6): 20 file, 2,6 MiB totali, **−79,2%** rispetto agli originali.
- **Nessun upscaling**: ogni WebP ha esattamente la risoluzione del file sorgente. I metadati EXIF non sono stati propagati alle copie.
- Contact sheet locale: `photos/contact-sheet-originals-and-webp.png` (originale a sinistra, WebP a destra). Contiene foto personali: **non pubblicare**.
- Identificazione: OCR e classificazione macOS Vision, rilevamento volti, confronto percettivo dHash (256 bit) con i 23 asset già estratti da `materials/pizze.pdf` e catalogati in `docs/IMAGE_CATALOG.md`.
- **16 file** corrispondono percettivamente ad asset già noti del PDF (dHash 0–9/256). **4 file sono nuovi**: `IMG_0674`, `IMG_0678`, `IMG_0679`, `IMG_0688`.
- Nessun duplicato effettivo tra i 20 file originali; le corrispondenze con il PDF sono versioni diverse degli stessi soggetti, conservate entrambe.

## Convenzioni

- `PDF` indica l'asset del catalogo PDF con soggetto equivalente; `nuovo` indica contenuto non presente nella lavagna.
- `dHash` è la distanza percettiva sull'immagine già catalogata (0 = identica al confronto; ≤12 considerata corrispondenza).
- `Qualità` riporta byte originali → byte WebP, riduzione percentuale e indice di nitidezza (varianza dei bordi).

## Fotografie delle destinazioni (`destinations`)

| Nome originale | Nome ottimizzato proposto | Categoria / soggetto | Dimensioni | Qualità | PDF | Privacy | Possibile utilizzo |
|---|---|---|---|---|---|---|---|
| `IMG_0678.jpg` | `01-howth-east-pier-lighthouse.webp` | `destinations` — Faro e East Pier di Howth su scogliere, con testo ‘10:00 – East Pier e faro’. | 1450 × 874 | 362 → 150 KiB (−58.6%), sharp 2023, entropia 7.0 | **nuovo** | pubblico | Cartolina/Guida Howth (nuovo rispetto al PDF). |
| `IMG_0679.jpg` | `02-howth-cliff-walk.webp` | `destinations` — Costiera di Howth, mare e prato, con testo ‘Howth Cliff Walk’. | 1428 × 895 | 485 → 215 KiB (−55.6%), sharp 2518, entropia 7.1 | **nuovo** | pubblico | Cartolina/Guida Howth (nuovo rispetto al PDF). |
| `IMG_0689.JPG` | `03-galway-market-insegna.webp` | `destinations` — Insegna ‘Galway Market – Food & Crafts’. | 638 × 480 | 71 → 64 KiB (−9.6%), sharp 4084, entropia 7.6 | IMG-035 (dHash 0) | pubblico | Cartolina Galway. |
| `IMG_0690.JPG` | `04-galway-quartiere-latino.webp` | `destinations` — Folla con bandiere nel Quartiere Latino di Galway. | 547 × 365 | 89 → 70 KiB (−21.6%), sharp 5797, entropia 7.9 | IMG-033 (dHash 0) | pubblico | Cartolina Galway solo dopo conferma visiva. |
| `IMG_0694.jpg` | `05-glendalough-lago-paesaggio.webp` | `destinations` — Paesaggio lacustre/collinare di Glendalough. | 1412 × 1051 | 1909 → 283 KiB (−85.2%), sharp 1808, entropia 7.6 | IMG-051 (dHash 0) | pubblico | Cartolina Glendalough. |

## Persone (`people`)

_Nessun file in questa categoria: l'unica immagine di persone presenti è il meme, classificato come `easter-egg`._

## Screenshot organizzativi (`screenshots`)

| Nome originale | Nome ottimizzato proposto | Categoria / soggetto | Dimensioni | Qualità | PDF | Privacy | Possibile utilizzo |
|---|---|---|---|---|---|---|---|
| `IMG_0661.jpg` | `transport-01-volo-ryanair-fco-dub.webp` | `screenshots` — Screenshot volo Ryanair FCO → DUB. | 1306 × 449 | 155 → 30 KiB (−80.5%), sharp 2032, entropia 2.1 | IMG-016 (dHash 2) | riservato (documento) | Solo riferimento: non pubblicare. |
| `IMG_0668.jpg` | `transport-02-bus-350-fermate.webp` | `screenshots` — Dettaglio fermate bus 350 verso Cliffs of Moher. | 820 × 1322 | 201 → 81 KiB (−59.6%), sharp 2512, entropia 2.5 | IMG-026 (dHash 0) | solo riferimento | Riferimento Guida trasporti. |
| `IMG_0669.jpg` | `transport-03-bus-350-galway-cliffs.webp` | `screenshots` — Percorso bus 350 Galway → Cliffs of Moher. | 771 × 1281 | 818 → 70 KiB (−91.4%), sharp 2282, entropia 2.3 | IMG-020 (dHash 6) | solo riferimento | Riferimento Guida trasporti. |
| `IMG_0671.jpg` | `transport-04-bus-351-cliffs-doolin.webp` | `screenshots` — Percorso bus 351 Cliffs of Moher → Doolin. | 786 × 1324 | 853 → 74 KiB (−91.4%), sharp 2379, entropia 2.3 | IMG-022 (dHash 2) | solo riferimento | Riferimento Guida trasporti. |
| `IMG_0672.jpg` | `transport-05-bus-350-doolin-galway.webp` | `screenshots` — Percorso bus 350 Doolin → Galway. | 748 × 1408 | 851 → 67 KiB (−92.1%), sharp 2178, entropia 2.2 | IMG-027 (dHash 9) | solo riferimento | Riferimento Guida trasporti. |
| `IMG_0674.jpg` | `guida-01-dublino-itinerario-giornaliero.webp` | `screenshots` — Testo itinerario Dublino: St. Stephen’s Green, Grafton Street, Trinity College, Ha’penny Bridge, Temple Bar, Dublin Castle, Christ Church. | 1425 × 1798 | 367 → 171 KiB (−53.3%), sharp 1766, entropia 2.2 | **nuovo** | solo riferimento | Contenuto per la Guida di Dublino (nuovo rispetto al PDF). |
| `IMG_0688.PNG` | `guida-02-mappa-howth-stazione-alloggio.webp` | `screenshots` — Mappa Howth/Dublino con Howth Station, Porto di Dublino e indicazioni alloggio. | 2160 × 1620 | 1526 → 575 KiB (−62.3%), sharp 1556, entropia 5.2 | **nuovo** | solo riferimento | Riferimento Guida Howth (più estesa di IMG-047). |
| `IMG_0691.jpg` | `guida-03-galway-rafting-scheda.webp` | `screenshots` — Scheda Google di Galway Rafting (Waterside, Woodquay). | 1160 × 708 | 148 → 36 KiB (−75.9%), sharp 2006, entropia 0.8 | IMG-037 (dHash 0) | solo riferimento | Riferimento attività Galway. |
| `IMG_0693.jpg` | `transport-06-treno-galway-dublino.webp` | `screenshots` — Screenshot treno Irish Rail Galway → Dublino (9/05). | 1586 × 955 | 280 → 65 KiB (−76.7%), sharp 1648, entropia 1.6 | IMG-049 (dHash 3) | solo riferimento | Riferimento Guida trasporti. |
| `IMG_0695.jpg` | `guida-04-glendalough-attivita.webp` | `screenshots` — Elenco attività a Glendalough: Upper Lake, Spinc Walk, Poulanass Waterfall, Lower Lake. | 1480 × 909 | 458 → 120 KiB (−73.8%), sharp 2354, entropia 2.0 | IMG-053 (dHash 1) | solo riferimento | Contenuto Guida Glendalough. |
| `IMG_0696.jpg` | `transport-07-bus-st-kevins-glendalough.webp` | `screenshots` — Informazioni bus St. Kevin’s Dublino → Glendalough. | 1202 × 850 | 266 → 68 KiB (−74.3%), sharp 2630, entropia 1.0 | IMG-055 (dHash 0) | solo riferimento | Riferimento Guida trasporti. |
| `IMG_6902.JPG` | `guida-05-hotel-russell-court-prenotazione.webp` | `screenshots` — Prenotazione Russell Court Hotel, Dublino (codice PIN presente). | 997 × 234 | 121 → 26 KiB (−78.6%), sharp 4178, entropia 3.3 | IMG-018 (dHash 2) | riservato (documento) | Riservato: non pubblicare. |
| `IMG_6903.jpg` | `transport-08-treno-dublino-galway.webp` | `screenshots` — Screenshot Irish Rail Dublino Heuston → Galway Ceannt. | 1179 × 1152 | 202 → 45 KiB (−77.6%), sharp 1582, entropia 1.3 | IMG-041 (dHash 2) | solo riferimento | Riferimento Guida trasporti. |

## Easter egg (`easter-egg`)

| Nome originale | Nome ottimizzato proposto | Categoria / soggetto | Dimensioni | Qualità | PDF | Privacy | Possibile utilizzo |
|---|---|---|---|---|---|---|---|
| `E0B385C2-E462-446B-836A-E0EE4896F5B0.PNG` | `martina-foche-meme.webp` | `easter-egg` — Meme: le due ragazze raffigurate come foche su un prato vicino all’acqua. | 1536 × 1024 | 3660 → 435 KiB (−88.1%), sharp 4346, entropia 7.6 | IMG-061 (dHash 0) | riservato (personale) | Sorpresa nascosta nella Guida di Howth, solo dopo consenso. |

## Varie / da chiarire (`misc`)

| Nome originale | Nome ottimizzato proposto | Categoria / soggetto | Dimensioni | Qualità | PDF | Privacy | Possibile utilizzo |
|---|---|---|---|---|---|---|---|
| `IMG_0692.JPG` | `01-scatto-vegetazione-non-identificato.webp` | `misc` — Piccolo scatto di vegetazione/terreno, soggetto non riconoscibile. | 275 × 183 | 25 → 25 KiB (−1.6%), sharp 5396, entropia 7.5 | IMG-039 (dHash 3) | pubblico | Non consigliato: qualità insufficiente. |

## Foto speciale — easter egg

`E0B385C2-E462-446B-836A-E0EE4896F5B0.PNG` (1536 × 1024) → `martina-foche-meme.webp` (1536 × 1024).

È la fotografia meme delle due ragazze trasformate in foche su un prato vicino all’acqua. Corrisponde percettivamente (dHash 0) ad `IMG-061` del catalogo PDF, già riclassificato come easter-egg. Il rilevamento volti trova 2 volti e la classificazione Vision indica ‘people + animale rettile + erba/zona umida’, coerente con la descrizione fornita.

**Non pubblicare né inserire nel sito.** Possibile utilizzo futuro: sorpresa nascosta nella Guida di Howth, solo con consenso esplicito.

## Identificazioni incerte

- `IMG_0690.JPG` → `04-galway-quartiere-latino.webp`: attribuita a Galway per adiacenza all’annotazione ‘QUARTIERE LATINO’ nel PDF (`IMG-033`), ma il soggetto (folla con bandiere) andrebbe confermato visivamente.
- `IMG_0692.JPG` → `01-scatto-vegetazione-non-identificato.webp`: 275 × 183, soggetto non riconoscibile; qualità insufficiente, non consigliato per il sito.
- `IMG_0688.PNG` → `guida-02-mappa-howth-stazione-alloggio.webp`: mappa Howth con UI di ricerca; è simile ad `IMG-047` ma più estesa e con testo diverso. Da non confondere con un duplicato.
- Il meme è identificato con alta confidenza grazie all’indicazione dell’utente e alla classificazione automatica; la resa visiva finale andrebbe comunque controllata a occhio nella contact sheet.

## Stato del repository

- Modificati: `.gitignore` (regole `materials/`, `photos/`, `Photos/`), `docs/IMAGE_CATALOG.md` (puntatore a questo file e riclassifica di `IMG-061`), nuovo `docs/PHOTO_CATALOG.md`.
- HTML, CSS, JavaScript, configurazione GitHub Pages e cartoline: **non modificati**.
- Nessun push, merge o deploy eseguito.

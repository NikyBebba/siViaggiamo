# Catalogo immagini estratte da `materials/pizze.pdf`

Documento di lavoro. **Nessuna immagine è stata inserita nel sito** e nessun asset è stato pubblicato.

Le fotografie originali in `photos/` e le copie WebP preparate sono inventariate in `docs/PHOTO_CATALOG.md`.

## Sintesi

- Fonte: `materials/pizze.pdf` (1 pagina, 6224 × 4124 pt, creato con Nebo/MyScript).
- Metodo: estrazione diretta degli XObject immagine tramite PyMuPDF 2.1; nessuna fotografia è stata ritoccata o rigenerata. L’unico file PNG con maschera di trasparenza (smask) è stato ricomposto senza alterare i pixel.
- **23 immagini estratte**, 0 duplicati effettivi (SHA-256 dei pixel e dHash a 256 bit: nessuna collisione).
- 9 categorie previste, 7 con contenuto. `dublin` e `cliffs-of-moher` sono vuote: la lavagna contiene solo mappe/istruzioni per quelle tappe, non foto dedicate.
- Contact sheet numerata (negoziazione visiva): `materials/.extracted/contact-sheet.png` — **file locale, non pubblicare**.
- Gli originali inviolati sono in `materials/.extracted/originals/`; le copie catalogate per categoria in `materials/.extracted/catalog/`. Tutto sotto `materials/`, escluso da Git.

## Convenzioni

- `IMG-xxx` è l’identificativo derivato dall’xref del PDF (es. `IMG-035` = xref 35).
- `Confidenza` indica quanto è sicura l’attribuzione di categoria: `alta` = testo/etichetta nella stessa immagine o adiacenza diretta; `media` = posizionamento sulla lavagna; `bassa` = soggetto non identificabile.
- `Privacy`: `pubblico` = immagine di luogo/oggetto; `solo riferimento` = screenshot di pianificazione; `riservato` = fotografie personali o documenti di viaggio da non pubblicare.
- La qualità riporta risoluzione sorgente, varianza dei bordi (indice di nitidezza), entropia e dpi effettivi sulla lavagna (pixel ÷ dimensione in pollici del riquadro).

## Travelers (privato) (`travelers`)

| ID | File locale | Descrizione | Dimensioni | Formato | Qualità | Confidenza | Privacy | Provenienza |
|---|---|---|---|---|---|---|---|---|
| IMG-057 | `.extracted/catalog/travelers/IMG-057_ritratto-due-persone-alpha.png` | Ritaglio fotografico con trasparenza di due persone (occhiali da sole). PRIVATO: conservare solo in locale, mai pubblicare. | 2048 × 1536 | PNG | ≥1000 px, sharp 1112, entropia 6.4 bit, ~107 dpi su lavagna | alta | riservato (personale) | p.1, xref 57, `Im23`, FlateDecode, bbox 4797,530–6175,1563 |
| IMG-061 | `.extracted/catalog/travelers/IMG-061_ritratto-due-persone-variante.jpeg` | Meme: le due ragazze raffigurate come foche su un prato vicino all’acqua (stesso soggetto di IMG-057). Easter-egg: mai pubblicare. Non duplicato pixel-per-pixel di IMG-057; conservare entrambe. | 1536 × 1024 | JPEG | ≥1000 px, sharp 4372, entropia 7.6 bit, ~774 dpi su lavagna | alta | riservato (personale) | p.1, xref 61, `Im24`, DCTDecode, bbox 5341,2681–5484,2776 |

## Dublino (`dublin`)

_Nessun asset estratto con attribuzione sufficientemente sicura._

## Glendalough (`glendalough`)

| ID | File locale | Descrizione | Dimensioni | Formato | Qualità | Confidenza | Privacy | Provenienza |
|---|---|---|---|---|---|---|---|---|
| IMG-051 | `.extracted/catalog/glendalough/IMG-051_glendalough-paesaggio.jpeg` | Paesaggio lacustre/collinare posizionato tra le note '06/05 GLENDALOUGH'. Buon candidato per la cartolina Glendalough; attribuzione da posizione sulla lavagna. | 1412 × 1051 | JPEG | ≥1000 px, sharp 1845, entropia 7.6 bit, ~192 dpi su lavagna | alta | pubblico | p.1, xref 51, `Im20`, DCTDecode, bbox 2147,2409–2675,2802 |
| IMG-053 | `.extracted/catalog/glendalough/IMG-053_glendalough-attivita.jpeg` | Screenshot dell’elenco attività a Glendalough (Upper Lake, Spinc, Poulanass). Testo informativo, non fotografia. | 1480 × 909 | JPEG | ≥1000 px, sharp 2360, entropia 2.5 bit, ~243 dpi su lavagna | alta | solo riferimento | p.1, xref 53, `Im21`, DCTDecode, bbox 2678,2626–3118,2896 |

## Galway (`galway`)

| ID | File locale | Descrizione | Dimensioni | Formato | Qualità | Confidenza | Privacy | Provenienza |
|---|---|---|---|---|---|---|---|---|
| IMG-033 | `.extracted/catalog/galway/IMG-033_quartiere-latino-galway.jpeg` | Scatto di folla con bandiere nel Quartiere Latino di Galway (verosimile). Identificazione basata sulla posizione accanto ad annotazione 'QUARTIERE LATINO'. | 547 × 365 | JPEG | piccolo, sharp 5446, entropia 7.9 bit, ~127 dpi su lavagna | media | pubblico | p.1, xref 33, `Im11`, DCTDecode, bbox 3721,3627–4033,3834 |
| IMG-035 | `.extracted/catalog/galway/IMG-035_galway-market-insegna.jpeg` | Foto dell’insegna 'Galway Market – Food & Crafts'. Buon candidato per la cartolina Galway. | 638 × 480 | JPEG | piccolo, sharp 3754, entropia 7.6 bit, ~163 dpi su lavagna | alta | pubblico | p.1, xref 35, `Im12`, DCTDecode, bbox 3366,3622–3648,3834 |
| IMG-037 | `.extracted/catalog/galway/IMG-037_galway-rafting.jpeg` | Screenshot scheda Google di Galway Rafting (Waterside, Woodquay). Contatti commerciali; usare solo come riferimento. | 1160 × 708 | JPEG | ≥1000 px, sharp 1985, entropia 1.1 bit, ~249 dpi su lavagna | alta | solo riferimento | p.1, xref 37, `Im13`, DCTDecode, bbox 3369,3870–3704,4074 |

## Cliffs of Moher (`cliffs-of-moher`)

_Nessun asset estratto con attribuzione sufficientemente sicura._

## Howth (`howth`)

| ID | File locale | Descrizione | Dimensioni | Formato | Qualità | Confidenza | Privacy | Provenienza |
|---|---|---|---|---|---|---|---|---|
| IMG-045 | `.extracted/catalog/howth/IMG-045_howth-faro-costa.jpeg` | Foto del faro di Howth e della costa, con annotazioni sulle tappe. Buon candidato visivo per Howth; contiene testo sovrapposto. | 1424 × 635 | JPEG | ≥1000 px, sharp 2206, entropia 5.9 bit, ~480 dpi su lavagna | alta | pubblico | p.1, xref 45, `Im17`, DCTDecode, bbox 5128,2681–5341,2776 |
| IMG-047 | `.extracted/catalog/howth/IMG-047_mappa-howth.jpeg` | Mappa della zona di Howth, Porto di Dublino e baia. Mappa di dettaglio, utile come riferimento. | 1533 × 777 | JPEG | ≥1000 px, sharp 1246, entropia 5.7 bit, ~455 dpi su lavagna | alta | pubblico | p.1, xref 47, `Im18`, DCTDecode, bbox 5148,2528–5390,2651 |

## Trasporti (`transport`)

| ID | File locale | Descrizione | Dimensioni | Formato | Qualità | Confidenza | Privacy | Provenienza |
|---|---|---|---|---|---|---|---|---|
| IMG-016 | `.extracted/catalog/transport/IMG-016_volo-ryanair-fco-dub.jpeg` | Screenshot volo Ryanair FCO → DUB, 5/05 e 10/05/2027. Contiene date e prezzi: non pubblicare. | 1306 × 449 | JPEG | ≥1000 px, sharp 2018, entropia 2.5 bit, ~127 dpi su lavagna | alta | riservato (documento) | p.1, xref 16, `Im3`, DCTDecode, bbox 4125,1775–4863,2029 |
| IMG-020 | `.extracted/catalog/transport/IMG-020_bus-350-galway-cliffs.jpeg` | Indicazioni Google Maps: bus 350 da Galway alle Cliffs of Moher. Percorso, non foto del luogo. | 771 × 1281 | JPEG | piccolo, sharp 2310, entropia 2.2 bit, ~312 dpi su lavagna | alta | solo riferimento | p.1, xref 20, `Im5`, DCTDecode, bbox 4145,2602–4323,2898 |
| IMG-022 | `.extracted/catalog/transport/IMG-022_bus-351-cliffs-doolin.jpeg` | Indicazioni Google Maps: bus 351 Local Link dalle Cliffs a Doolin. Percorso, non foto del luogo. | 786 × 1324 | JPEG | piccolo, sharp 2411, entropia 2.2 bit, ~269 dpi su lavagna | alta | solo riferimento | p.1, xref 22, `Im6`, DCTDecode, bbox 3670,2821–3880,3176 |
| IMG-026 | `.extracted/catalog/transport/IMG-026_bus-350-fermate.jpeg` | Dettaglio fermate e orari del bus 350 verso le Cliffs of Moher. Schermata lunga e stretta; uso solo come riferimento. | 820 × 1322 | JPEG | piccolo, sharp 2517, entropia 2.7 bit, ~358 dpi su lavagna | media | solo riferimento | p.1, xref 26, `Im7`, DCTDecode, bbox 4323,2617–4488,2883 |
| IMG-027 | `.extracted/catalog/transport/IMG-027_bus-350-doolin-galway.jpeg` | Indicazioni Google Maps: bus 350 da Doolin a Galway. Percorso, non foto del luogo. | 748 × 1408 | JPEG | piccolo, sharp 2208, entropia 2.1 bit, ~376 dpi su lavagna | alta | solo riferimento | p.1, xref 27, `Im8`, DCTDecode, bbox 4034,2963–4178,3233 |
| IMG-029 | `.extracted/catalog/transport/IMG-029_orari-treno-galway.jpeg` | Screenshot orari treno Dublino → Galway (09:25 / 11:30). Striscia sottile, poco riutilizzabile. | 1072 × 254 | JPEG | ≥1000 px, sharp 1740, entropia 1.2 bit, ~393 dpi su lavagna | media | solo riferimento | p.1, xref 29, `Im9`, DCTDecode, bbox 3579,2203–3775,2249 |
| IMG-031 | `.extracted/catalog/transport/IMG-031_tariffe-irish-rail.jpeg` | Screenshot tariffe Irish Rail Dublino → Galway con note studenti. Testo informativo, non fotografia. | 1475 × 1117 | JPEG | ≥1000 px, sharp 2141, entropia 1.6 bit, ~519 dpi su lavagna | alta | solo riferimento | p.1, xref 31, `Im10`, DCTDecode, bbox 3799,2149–4004,2304 |
| IMG-041 | `.extracted/catalog/transport/IMG-041_treno-dublino-galway.jpeg` | Screenshot Irish Rail: treni Dublin Heuston → Galway Ceannt. Orari indicativi, da riconfermare. | 1179 × 1152 | JPEG | ≥1000 px, sharp 1578, entropia 1.6 bit, ~600 dpi su lavagna | alta | solo riferimento | p.1, xref 41, `Im15`, DCTDecode, bbox 4252,2382–4394,2520 |
| IMG-043 | `.extracted/catalog/transport/IMG-043_dart-howth.jpeg` | Istruzioni DART da Dublin Pearse a Howth Station. Riferimento per la tappa Howth. | 1107 × 696 | JPEG | ≥1000 px, sharp 2528, entropia 1.5 bit, ~349 dpi su lavagna | alta | solo riferimento | p.1, xref 43, `Im16`, DCTDecode, bbox 4835,2554–5064,2697 |
| IMG-049 | `.extracted/catalog/transport/IMG-049_treno-galway-dublino.jpeg` | Screenshot treno Irish Rail Galway Ceannt → Dublin Heuston, 9/05. Orario domenicale pubblicato, da riconfermare. | 1586 × 955 | JPEG | ≥1000 px, sharp 1654, entropia 1.9 bit, ~624 dpi su lavagna | alta | solo riferimento | p.1, xref 49, `Im19`, DCTDecode, bbox 5250,2382–5433,2492 |
| IMG-055 | `.extracted/catalog/transport/IMG-055_bus-glendalough.jpeg` | Screenshot informazioni bus St. Kevin’s Dublin → Glendalough. Prezzi e orari, non fotografia. | 1202 × 850 | JPEG | ≥1000 px, sharp 2628, entropia 1.7 bit, ~160 dpi su lavagna | alta | solo riferimento | p.1, xref 55, `Im22`, DCTDecode, bbox 1566,2409–2106,2791 |

## Alloggi (`accommodation`)

| ID | File locale | Descrizione | Dimensioni | Formato | Qualità | Confidenza | Privacy | Provenienza |
|---|---|---|---|---|---|---|---|---|
| IMG-018 | `.extracted/catalog/accommodation/IMG-018_hotel-russell-court.jpeg` | Screenshot prenotazione Russell Court Hotel, Dublino, 5–6 maggio. Contiene codice PIN e recapiti: non pubblicare. | 997 × 234 | JPEG | piccolo, sharp 4161, entropia 3.9 bit, ~131 dpi su lavagna | alta | riservato (documento) | p.1, xref 18, `Im4`, DCTDecode, bbox 2624,1968–3172,2096 |

## Varie / riferimenti (`misc`)

| ID | File locale | Descrizione | Dimensioni | Formato | Qualità | Confidenza | Privacy | Provenienza |
|---|---|---|---|---|---|---|---|---|
| IMG-014 | `.extracted/catalog/misc/IMG-014_mappa-irlanda.jpeg` | Mappa dell’Irlanda con città e territori (Connemara, Wicklow, Killarney). Riferimento geografico; non una foto di tappa. | 1401 × 1224 | JPEG | ≥1000 px, sharp 799, entropia 5.2 bit, ~167 dpi su lavagna | alta | pubblico | p.1, xref 14, `Im2`, DCTDecode, bbox 2186,664–2790,1192 |
| IMG-039 | `.extracted/catalog/misc/IMG-039_scatto-vegetazione.jpeg` | Piccolo scatto di vegetazione/terreno, soggetto non identificabile. Ritagliato vicino alle note su Galway, ma non attribuibile con certezza. | 275 × 183 | JPEG | piccolo, sharp 5042, entropia 7.5 bit, ~64 dpi su lavagna | bassa | pubblico | p.1, xref 39, `Im14`, DCTDecode, bbox 3706,3870–4013,4074 |

## Duplicati

Nessun duplicato effettivo: tutti i 23 hash SHA-256 dei byte originali e dei pixel decompressi sono distinti, e non risultano coppie con distanza dHash ≤ 25/256.
`IMG-057` e `IMG-061` mostrano gli stessi soggetti con distanza feature-print 0,84 (contro > 1,0 per tutte le altre coppie): sono due varianti della stessa sessione fotografica, ma non sono lo stesso file (una ha trasparenza, l’altra è un JPEG con crop diverso). **Sono state conservate entrambe**.

## Asset consigliati per il sito (previo consenso)

Solo asset `pubblico`, privi di dati personali e con soggetto identificato:

- `IMG-051` — paesaggio lacustre/collinare, candidato per la cartolina Glendalough (1412 × 1051, nitidezza 1845).
- `IMG-035` — insegna Galway Market, candidato per la tappa Galway (638 × 480, nitidezza 3754).
- `IMG-045` — faro/costa di Howth, candidato per Howth (1424 × 635, nitidezza 2206; contiene testo sovrapposto da valutare).
- `IMG-014` — mappa dell’Irlanda come riferimento grafico (1401 × 1224, piuttosto morbida: usare come dettaglio, non a tutta larghezza).
- `IMG-047` — mappa di Howth e baia di Dublino, utile come approfondimento (1533 × 777).
- `IMG-033` — folla nel Quartiere Latino: solo dopo conferma visiva che non compaiano le persone coinvolte.

## Asset di qualità insufficiente

- `IMG-039` — 275 × 183 px, ~64 dpi effettivi sulla lavagna, soggetto non riconoscibile: non utilizzare.
- `IMG-029` — striscia 1072 × 254 (~393 dpi ma solo 46 px di altezza sul layout): valida come riferimento, non come immagine editoriale.
- `IMG-016` — banner 1306 × 449 con testo molto piccolo: leggibile come screenshot, non adatto a riduzioni.
- `IMG-014` — nitidezza 799 (la più bassa tra le mappe): evitare ingrandimenti oltre le dimensioni sorgente.

## Dubbi da chiarire

1. **Consenso**: `IMG-057` e `IMG-061` sono fotografie personali; `IMG-018` contiene un codice PIN e `IMG-016` i dettagli del volo. Confermare di non volerli mai pubblicare (restano esclusi da Git).
2. **Cliffs of Moher**: non esiste una foto della scogliera nella lavagna, solo percorsi bus (`IMG-020`, `IMG-022`, `IMG-026`, `IMG-027`). Servono immagini dedicate se la cartolina deve avere una foto.
3. **Dublino**: nessuna foto della città; `IMG-035`/`IMG-047` sono Galway/Howth e `IMG-018` è un documento riservato. Valutare una foto di Dublino separatamente.
4. **IMG-033**: attribuita a Galway per adiacenza al testo 'QUARTIERE LATINO', ma il soggetto (folla con bandiere) andrebbe confermato a occhio prima dell’uso.
5. **IMG-039**: piccolo scatto vicino alle note su Galway Rafting ma privo di soggetto riconoscibile; da scartare o da identificare con l’originale sorgente.
6. **Data del PDF**: i metadati indicano creazione 17 novembre 2026; l’itinerario è 5–10 maggio 2027. Verificare che non esista una versione più recente della lavagna con foto mancanti.

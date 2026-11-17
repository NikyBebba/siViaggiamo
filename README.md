# siViaggiamo ☘ — il regalo di Martina

Mini sito di viaggio per la laurea di Martina, realizzato con **HTML, CSS e JavaScript puro**. Design giocoso ispirato a un diario di viaggio (*Playful Travel Scrapbook*), mappa interattiva dell'Irlanda, **v1.7 Ireland Edition**: cinque destinazioni reali, sei giornate di programma, cartoline-dedica con foto autorizzate, **Guida di viaggio** con link ufficiali, easter egg e due avatar fotografici. Compatibile con GitHub Pages (nessun backend, nessun database, nessun framework).

Viaggio: **Irlanda, 5–10 maggio 2027** — Martina e Lorenza.

## Esperienza di scoperta

1. Martina apre il sito e dalla Home usa il pulsante principale, che si adatta allo stato: **Scopri la sorpresa** (mai iniziato), **Continua il viaggio** (in corso) o **Esplora il viaggio** (completato/esplorazione libera).
2. Sulla mappa compare un invito alla scoperta guidata con un solo comando di avanzamento alla volta: **Scopri la prima tappa** e poi **Scopri la prossima tappa** / **Termina la scoperta**.
3. A ogni scelta, la guida si fa da parte, la mappa compie un movimento verso la destinazione successiva e il percorso illustrato si arricchisce progressivamente.
4. **Solo al termine del movimento** si apre dal basso la cartolina della tappa (compatta/espandibile), con foto, descrizione, dedica e azioni disponibili. Il viaggio **non avanza mai automaticamente**: decide sempre Martina.
5. Al termine compare un piccolo messaggio celebrativo e tutte le tappe diventano liberamente esplorabili. È possibile ripetere l’esperienza con **Rivivi la sorpresa**.

Il percorso di scoperta ha **cinque destinazioni**: Dublino, Glendalough, Galway, Cliffs of Moher e Howth. Dublino viene svelata **una sola volta**, pur essendo rivisitata il 9 maggio. Le **sei giornate** (5–10 maggio) sono raccontate nella sezione Tappe e sono distinte dalle destinazioni della mappa: hotel, attrazioni e attività non diventano tappe principali.

La progressione è ricordata nella sessione del browser (`sessionStorage`). I salvataggi della v1.6 (quattro tappe) vengono **scartati in modo sicuro** e non possono generare cartoline errate o stati impossibili: la v1.7 usa `v: 2` e una firma sugli ID delle destinazioni. Navigazione tra sezioni, refresh e ripresa sono supportati in modo prevedibile (nessun account, nessun database). Il pannello di scoperta è visibile **solo** nella sezione Mappa.

## Avvio locale

Apri `index.html` nel browser oppure, dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

Poi visita `http://localhost:8000`.

## Pubblicazione su GitHub Pages

Repository: https://github.com/NikyBebba/siViaggiamo

Carica il contenuto della cartella nella **radice del repository**, non in una sottocartella aggiuntiva. In GitHub seleziona **Settings → Pages → Deploy from a branch → main → /(root)**.

Sito previsto: https://nikybebba.github.io/siViaggiamo/

Dopo il caricamento, ricarica la pagina senza cache per vedere i nuovi file. La configurazione GitHub Pages non è stata modificata.

## Sezione Guida (v1.7)

La navigazione principale include **Inizio · Mappa · Tappe · Guida · Dedica**. La sezione **Guida** («La guida di Martina») raccoglie informazioni reali e verificabili, organizzate per categorie:

- **Da visitare**, **Come muoversi**, **Food & Drink**, **Consigli utili**
- filtri per categoria e città, ricerca testuale leggera e stati vuoti chiari
- preferiti locali salvati in `localStorage` (solo su questo dispositivo, con ID stabili e pulizia automatica di dati non più presenti)
- collegamenti ufficiali: Transport for Ireland (Journey Planner), Leap Card, Dublin Bus, Irish Rail, St. Kevin’s Bus Service, insieme ai siti delle attrazioni principali
- collegamenti interni: dalla cartolina di una tappa **«Cosa fare qui»** apre la Guida filtrata per quella destinazione; dalla Guida **«Vedi sulla mappa»** apre il luogo appropriato quando disponibili coordinate/destinazione; dalle **Giornate** si apre la Guida della destinazione corrispondente
- i punti di interesse facoltativi (POI) **non** vengono aggiunti ai pin dell’itinerario regalo
- nessun prezzo, costo, tariffa o confronto economico; orari e collegamenti sono **indicazioni di programma**, non prenotazioni confermate

### Easter egg

Nella sola **Guida di Howth** compare una sorpresa fotografica intitolata **«Avvistamento raro a Howth 🦭»**, con il pulsante **«Scopri chi sono»**. La foto si rivela solo su richiesta (anche da tastiera), si richiude con Escape e non diventa mai una nuova tappa né un'immagine principale. Fuori dal contesto Howth l'easter egg resta nascosto.

### Biglietto regalo

Nella Guida è presente un voucher regalo simbolico (non un biglietto aereo/ferroviario reale) con anteprima, testo di auguri provvisorio e pulsante **«Scarica il tuo biglietto»**.

- Percorso previsto: `assets/downloads/biglietto-martina.pdf`
- Se il PDF non è presente, viene mostrato **«Biglietto in preparazione»** e il download resta disabilitato (nessun link fittizio).
- Per pubblicare il biglietto definitivo: aggiungere/sostituire il file PDF in quel percorso (stesso nome consigliato).

## Personalizzazione

- **Dati di viaggio e tappe:** `js/destinations.js` (unica sorgente): `travelers[].name`/`image`/`imagePosition`/`alt`, `destinations` (ordine, `id`, `title`, `region`, `lat`/`lng`, `description`, `dedication`, `color`, `icon`, `image`, eventuale `day`) e `days` (sei giornate con `date`, `title`, `place`, `destinationId`, `description`, `activities`, `travel`). `image: null` mostra un segnaposto/fallback.
- **Contenuti Guida:** `js/guide-data.js` (dati separati dal rendering): categorie, elementi (ID univoco, categoria, titolo, città/destinazione associata, descrizione, immagine opzionale, URL/etichetta link, coordinate opzionali, note pratiche) e configurazione del biglietto (`ticket`). Non inventare prenotazioni, mezzi acquistati, orari confermati, prezzi o informazioni non comunicate.
- **Dedica finale:** `index.html`, sezione `id="message"`. Il testo attuale è dichiaratamente **provvisorio — da personalizzare**.
- **Crediti immagini online:** `docs/ASSET_CREDITS.md`. Le foto personali restano in `Photos/` (esclusa da Git); in `assets/images/` sono presenti solo gli asset approvati e ottimizzati. Gli originali non sono stati modificati.

**Importante:** la linea tratteggiata sulla mappa collega i luoghi nell’ordine del file: **non è una strada calcolata** e non rappresenta un percorso stradale confermato.

## Mappa e compatibilità

- Leaflet 1.9.4 e tessere OpenStreetMap con attribuzione (connessione Internet necessaria).
- Risorse Leaflet caricate con versione fissata; il codice ricalcola le dimensioni della mappa quando la vista diventa visibile/si ridimensiona per mantenere le tile allineate.
- Le mappe OSM rispettano la policy https://operations.osmfoundation.org/policies/tiles/.
- Animazioni e transizioni rispettano `prefers-reduced-motion`.
- Avatar: copie WebP con correzione EXIF, forma circolare, `object-fit: cover` e `object-position` calibrato; testo alternativo e bordo scrapbook.

## Test

```bash
npx playwright test --project=chromium-desktop
npx playwright test --project=chromium-mobile
```

Suite: `tests/stability.spec.js`, `tests/tour-sheet-regression.spec.js` (aggiornate a cinque tappe) e `tests/ireland-v17.spec.js` (contenuti reali, sei giornate, easter egg, migrazione sessione, preferiti, asset, assenza errori JS). Il server di test è `tests/server.py` (threaded, per evitare reset delle richieste con più browser paralleli).

Esito dell'ultima esecuzione: **20 test desktop e 20 test mobile superati**.

## Privacy

Le cartelle `Photos/` e `materials/` restano escluse da Git tramite `.gitignore`. Non aggiungere mai screenshot di voli, prenotazioni, PIN, documenti organizzativi o materiale non approvato. Verificare sempre i file in `git status` e `git diff --cached` prima di un commit.

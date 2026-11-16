# siViaggiamo ☘ — il regalo di Martina

Mini sito di viaggio per la laurea di Martina, realizzato con **HTML, CSS e JavaScript puro**. Design giocoso ispirato a un diario di viaggio (*Playful Travel Scrapbook*), mappa interattiva dell'Irlanda, quattro tappe dimostrative, cartoline-dedica, **Guida di viaggio** con biglietto regalo e due avatar provvisori. Compatibile con GitHub Pages (nessun backend).

## Esperienza di scoperta

1. Martina apre il sito e dalla Home usa il pulsante principale, che si adatta allo stato: **Scopri la sorpresa** (mai iniziato), **Continua il viaggio** (in corso) o **Esplora il viaggio** (completato/esplorazione libera).
2. Sulla mappa compare un invito alla scoperta guidata con un solo comando di avanzamento alla volta: **Scopri la prima tappa** e poi **Scopri la prossima tappa** / **Termina la scoperta**.
3. A ogni scelta, la guida si fa da parte, la mappa compie un movimento verso la destinazione successiva e il percorso illustrato si arricchisce progressivamente.
4. **Solo al termine del movimento** si apre dal basso la cartolina della tappa (compatta/espandibile), con foto/segnaposto, descrizione, dedica e azioni disponibili. Il viaggio **non avanza mai automaticamente**: decide sempre Martina.
5. Al termine compare un piccolo messaggio celebrativo e tutte le tappe diventano liberamente esplorabili. È possibile ripetere l’esperienza con **Rivivi la sorpresa**.

Durante la scoperta la sezione **Tappe** funziona come diario: le destinazioni non ancora svelate restano “misteriose”; dopo il completamento tutte le cartoline sono consultabili e collegate alla mappa. La progressione è ricordata nella sessione del browser (`sessionStorage`, con gestione sicura di dati non validi/precedenti): navigazione tra sezioni, refresh e ripresa sono supportati in modo prevedibile (nessun account, nessun database). Il pannello di scoperta è visibile **solo** nella sezione Mappa.

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

Dopo il caricamento, ricarica la pagina senza cache per vedere i nuovi file.

## Sezione Guida (v1.6)

La navigazione principale include **Inizio · Mappa · Tappe · Guida · Dedica**. La sezione **Guida** («La guida di Martina») è un diario di viaggio digitale con contenuti dimostrativi/segnaposto organizzati per categorie:

- **Da visitare**, **Come muoversi**, **Food & Drink**, **Consigli utili**
- filtri per categoria e città, ricerca testuale leggera e stati vuoti chiari
- preferiti locali salvati in `localStorage` (solo su questo dispositivo, con ID stabili e pulizia automatica di dati non più presenti)
- collegamenti: dalla cartolina di una tappa **«Cosa fare qui»** apre la Guida filtrata per quella destinazione; dalla Guida **«Vedi sulla mappa»** apre il luogo appropriato quando disponibili coordinate/destinazione
- i punti di interesse facoltativi (POI) **non** vengono aggiunti ai pin dell’itinerario regalo

### Biglietto regalo

Nella Guida è presente un voucher regalo simbolico (non un biglietto aereo/ferroviario reale) con anteprima, testo di auguri provvisorio e pulsante **«Scarica il tuo biglietto»**.

- Percorso previsto: `assets/downloads/biglietto-martina.pdf`
- Se il PDF non è presente, viene mostrato **«Biglietto in preparazione»** e il download resta disabilitato (nessun link fittizio).
- Per pubblicare il biglietto definitivo: aggiungere/sostituire il file PDF in quel percorso (stesso nome consigliato).

## Personalizzazione

- **Dati di viaggio e tappe:** `js/destinations.js` (unica sorgente): `travelers[].name`/`image`, `destinations` (ordine, `id`, `title`, `region`, `lat`/`lng`, `description`, `dedication`, `color`, `icon`, `image`, eventuale `day`). `image: null` mostra un segnaposto/fallback.
- **Contenuti Guida:** `js/guide-data.js` (dati separati dal rendering): categorie, elementi (ID univoco, categoria, titolo, città/destinazione associata, descrizione, immagine opzionale, URL/etichetta link, coordinate opzionali, note pratiche) e configurazione del biglietto (`ticket`: titolo, sottotitolo, messaggio, nota, `pdfPath`). I contenuti iniziali sono **dimostrativi/segnaposto**: non inventare prenotazioni, mezzi acquistati, orari, prezzi o informazioni non comunicate.
- **Dedica finale:** `index.html`, sezione `id="message"`.

**Importante:** Dublino, Galway, Cliffs of Moher e Killarney sono tappe *dimostrative*. Non rappresentano un itinerario confermato. La linea tratteggiata collega i luoghi nell’ordine del file: **non è una strada calcolata**.

## Mappa e compatibilità

- Leaflet 1.9.4 e tessere OpenStreetMap con attribuzione (connessione Internet necessaria).
- Risorse Leaflet caricate con versione fissata; il codice ricalcola le dimensioni della mappa quando la vista diventa visibile/si ridimensiona per mantenere le tile allineate.
- Le mappe OSM rispettano la policy https://operations.osmfoundation.org/policies/tiles/.
- Animazioni e transizioni rispettano `prefers-reduced-motion`.

Per fotografie e dediche reali, raccogliere il consenso delle persone interessate prima della pubblicazione pubblica.

## Test rapidi

- [ ] Tutte le pagine in italiano; nome **siViaggiamo** e festeggiata **Martina**.
- [ ] Navigazione a cinque elementi (Inizio · Mappa · Tappe · Guida · Dedica) leggibile/usabile su mobile, senza overflow.
- [ ] Tour: scoperta manuale, un solo controllo di avanzamento alla volta, cartolina solo a fine movimento, nessuna regressione; pannello guida visibile **solo** in Mappa.
- [ ] Home: pulsante dinamico corretto (mai iniziato / in corso / completato), aggiornamento immediato e ripresa progressione (incluso refresh, secondo persistenza di sessione).
- [ ] Guida: caricamento, filtri per categoria/città, ricerca testuale, stati vuoti chiari, link esterni funzionanti.
- [ ] Preferiti locali: salvataggio in `localStorage`, ID stabili, gestione sicura di dati obsoleti/non presenti, nota «solo su questo dispositivo».
- [ ] Biglietto: con `assets/downloads/biglietto-martina.pdf` presente il download funziona; se assente mostra **«Biglietto in preparazione»** e il download è disabilitato (nessun link fittizio).
- [ ] Collegamenti: **Mappa → Guida** («Cosa fare qui») e **Guida → Mappa** («Vedi sulla mappa», solo con coordinate/destinazione appropriate) senza aggiungere pin POI all’itinerario.
- [ ] Mappa stabile (Leaflet/OSM), responsive mobile/desktop, nessun errore JavaScript in console. Verifiche browser reali vanno eseguite e riportate quando effettuate.

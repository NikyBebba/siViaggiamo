# siViaggiamo ☘ — il regalo di Martina

Mini sito di viaggio per la laurea di Martina, realizzato con **HTML, CSS e JavaScript puro**. Design giocoso ispirato a un diario di viaggio (*Playful Travel Scrapbook*), mappa interattiva dell'Irlanda, quattro tappe dimostrative, cartoline-dedica e due avatar provvisori.

## Esperienza di scoperta

1. Martina apre il sito e preme **Scopri la sorpresa**.
2. Sulla mappa compare un unico invito: **«Martina, pronta a partire?»** con il pulsante **Scopri la prima tappa**.
3. A ogni scelta, la guida si fa da parte, la mappa compie un movimento verso la destinazione successiva e il percorso illustrato si arricchisce progressivamente.
4. **Solo al termine del movimento** si apre dal basso la cartolina della tappa, con foto/segnaposto, descrizione, dedica e un solo comando per continuare (**Scopri la prossima tappa** / **Termina la scoperta**).
5. Il viaggio **non avanza mai automaticamente**: decide sempre Martina.
6. Al termine compare un piccolo messaggio celebrativo (una sola volta per completamento) e tutte le tappe diventano liberamente esplorabili. È possibile ripetere l’esperienza con **Rivivi la sorpresa**.

Durante la scoperta la sezione **Tappe** funziona come diario: le destinazioni non ancora svelate restano “misteriose”; dopo il completamento tutte le cartoline sono consultabili e collegate alla mappa. Lo stato di completamento è ricordato solo nella sessione del browser (nessun account, nessun database).

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

## Personalizzazione

Modifica `js/destinations.js` (unica sorgente dei dati di viaggio):

- `travelers[].name` e `travelers[].image`: nomi e foto/avatar delle due viaggiatrici; con `image: null` restano i cerchi provvisori.
- `destinations`: ordine delle tappe, `title`, `region`, `lat`/`lng`, `description`, `dedication`, `color`, `icon`, `image`, eventuale `day` (opzionale).
- `image: null` nelle tappe mostra un segnaposto curato **Foto in arrivo**; se un’immagine non si carica viene applicato un fallback grafico.
- La dedica finale è in `index.html`, nella sezione `id="message"`.

**Importante:** Dublino, Galway, Cliffs of Moher e Killarney sono tappe *dimostrative*. Non rappresentano un itinerario confermato. La linea tratteggiata collega i luoghi nell’ordine del file: **non è una strada calcolata**.

## Mappa e compatibilità

- Leaflet 1.9.4 e tessere OpenStreetMap con attribuzione (connessione Internet necessaria).
- Risorse Leaflet caricate con versione fissata; il codice ricalcola le dimensioni della mappa quando la vista diventa visibile/si ridimensiona per mantenere le tile allineate.
- Le mappe OSM rispettano la policy https://operations.osmfoundation.org/policies/tiles/.
- Animazioni e transizioni rispettano `prefers-reduced-motion`.

Per fotografie e dediche reali, raccogliere il consenso delle persone interessate prima della pubblicazione pubblica.

## Test rapidi

- [ ] Tutte le pagine sono in italiano; nome **siViaggiamo** e festeggiata **Martina**.
- [ ] Dopo **Scopri la sorpresa**, la guida resta ferma finché Martina non preme **Scopri la prima tappa**.
- [ ] Ogni avanzamento sposta la mappa sulla tappa successiva e apre la cartolina **solo a fine movimento**, senza avanzamenti temporizzati.
- [ ] È presente un solo controllo di avanzamento alla volta (guida o cartolina), senza duplicazioni.
- [ ] Il percorso/marker si aggiornano progressivamente; alla fine tutti i pin e la linea illustrativa sono visibili.
- [ ] Messaggio celebrativo finale mostrato una sola volta per completamento; **Rivivi la sorpresa** ricomincia dall’inizio.
- [ ] Timeline/diario coerente con la mappa (tappe misteriose prima dello sblocco, tutte consultabili dopo).
- [ ] Mappa senza tasselli separati/vuoti su smartphone e desktop, zoom/pan fluidi, nessun errore in console/rete.
- [ ] Navigazione accessibile (focus, tastiera, aree touch) e layout corretto su mobile/desktop.

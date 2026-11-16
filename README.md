# siViaggiamo ☘ — il regalo di Martina

Mini sito di viaggio per la laurea di Martina, realizzato con **HTML, CSS e JavaScript puro**. Design giocoso ispirato a un diario di viaggio, mappa interattiva dell'Irlanda, quattro tappe dimostrative, dediche e due avatar provvisori.

## Sorpresa guidata, a ritmo di Martina

1. Martina apre il sito tramite QR code e preme **Scopri la sorpresa**.
2. Sulla mappa compare la guida con il pulsante **Scopri la prima tappa**.
3. A ogni clic, la mappa **si sposta e zooma verso la tappa successiva**, mostra il nuovo pin e apre la scheda della destinazione.
4. Il viaggio **non avanza mai automaticamente**. Martina può leggere, chiudere la scheda o premere **Prossima tappa** quando vuole.
5. Alla fine si sblocca tutta la mappa e può esplorarla liberamente. È possibile ripetere la presentazione con **Rivivi la sorpresa**.

Il completamento della prima scoperta viene ricordato soltanto per la sessione del browser. Non ci sono account né database.

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

Modifica `js/destinations.js`:

- `travelers[].name` e `travelers[].image`: nomi e foto delle due ragazze; con `image: null` restano due cerchi con icone.
- `destinations`: ordine delle tappe, nomi, coordinate, descrizioni, dediche, colori e immagini.
- `image: null` nelle tappe significa che si mostra il segnaposto **Foto in arrivo**.
- La dedica finale è in `index.html`, nella sezione `id="message"`.

**Importante:** Dublino, Galway, Cliffs of Moher e Killarney sono tappe *dimostrative*. Non rappresentano un itinerario confermato. La linea tratteggiata collega i luoghi nell'ordine del file: **non è una strada calcolata**.

## Mappa e compatibilità

Usa Leaflet 1.9.4 e tessere OpenStreetMap, con attribuzione. È necessaria una connessione internet. Il codice forza il ricalcolo delle dimensioni quando la vista mappa viene mostrata, per evitare tessere disallineate. Le mappe OSM rispettano la policy https://operations.osmfoundation.org/policies/tiles/ .

Per fotografie e dediche reali, raccogliere il consenso delle persone interessate prima della pubblicazione pubblica.

## Test rapidi

- [ ] Tutte le pagine sono in italiano; nome **siViaggiamo** e festeggiata **Martina**.
- [ ] Dopo **Scopri la sorpresa**, la guida resta ferma finché Martina non preme **Scopri la prima tappa**.
- [ ] Ogni clic sposta la mappa sulla tappa successiva, senza avanzamenti temporizzati.
- [ ] Scheda, pulsanti, chiusura e riapertura della guida funzionano.
- [ ] Alla fine sono visibili tutti i pin e la linea tratteggiata.
- [ ] **Rivivi la sorpresa** ricomincia dall'inizio.
- [ ] La mappa si carica senza tasselli separati su smartphone e desktop.
- [ ] La navigazione in basso resta accessibile.

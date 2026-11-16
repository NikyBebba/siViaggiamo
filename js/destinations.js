// DATI DIMOSTRATIVI — sostituire le tappe con le destinazioni reali quando confermate.
// Le coordinate sono espresse come latitudine e longitudine (Leaflet).
window.TRIP = {
  name: "siViaggiamo",
  celebrant: "Martina",
  travelers: [
    { name: "Martina", image: null }, // esempio: "assets/images/martina.jpg"
    { name: "Seconda viaggiatrice", image: null } // esempio: "assets/images/amica.jpg"
  ],
  destinations: [
    { id: "dublino", title: "Dublino", region: "Contea di Dublino", lat: 53.3498, lng: -6.2603, day: null, icon: "✈", color: "#295642", image: null, description: "Una prima tappa tra stradine vivaci, angoli caratteristici e tante cose da scoprire.", dedication: "Qui comincia il nostro viaggio. Sei pronta alla prima sorpresa irlandese?" },
    { id: "galway", title: "Galway", region: "Contea di Galway", lat: 53.2707, lng: -9.0568, day: null, icon: "♫", color: "#d5a078", image: null, description: "Case colorate, musica per le strade e momenti da ricordare.", dedication: "Una città perfetta per perderci tra vicoli, risate e nuove scoperte." },
    { id: "cliffs", title: "Cliffs of Moher", region: "Contea di Clare", lat: 52.9715, lng: -9.4309, day: null, icon: "≈", color: "#295642", image: null, description: "Scogliere spettacolari e panorami sull’oceano Atlantico.", dedication: "Per quei momenti che lasciano senza parole, nel senso più bello." },
    { id: "killarney", title: "Killarney", region: "Contea di Kerry", lat: 52.0599, lng: -9.5044, day: null, icon: "♣", color: "#d5a078", image: null, description: "Laghi, paesaggi verdi e un finale tutto da scoprire.", dedication: "Finisce il percorso sulla mappa, ma i ricordi iniziano proprio qui." }
  ]
};
// La linea tratteggiata è un collegamento grafico, NON un percorso stradale calcolato.

// DEMO CONTENT: replace names, coordinates, photos and dedications when confirmed.
// Coordinates follow the Leaflet format [latitude, longitude].
window.TRIP = {
  name: "Your Irish Adventure",
  travelers: [
    { name: "Traveller one", image: null }, // e.g. "assets/images/girl-1.jpg"
    { name: "Traveller two", image: null }  // e.g. "assets/images/girl-2.jpg"
  ],
  destinations: [
    { id: "dublin", title: "Dublin", region: "County Dublin", lat: 53.3498, lng: -6.2603, day: null, icon: "✈", color: "#295642", image: null, description: "An exciting first stop, full of colourful streets, cosy corners and little adventures.", dedication: "The story begins here. Ready for your first Irish surprise?" },
    { id: "galway", title: "Galway", region: "County Galway", lat: 53.2707, lng: -9.0568, day: null, icon: "♫", color: "#d5a078", image: null, description: "Bright streets, cheerful music and spontaneous moments worth remembering.", dedication: "A city for wandering, laughing and finding your new favourite place." },
    { id: "cliffs", title: "Cliffs of Moher", region: "County Clare", lat: 52.9715, lng: -9.4309, day: null, icon: "≈", color: "#295642", image: null, description: "A little ocean magic and a breathtaking view along the wild Atlantic coast.", dedication: "For the moments that leave you speechless (in the best way)." },
    { id: "killarney", title: "Killarney", region: "County Kerry", lat: 52.0599, lng: -9.5044, day: null, icon: "♣", color: "#d5a078", image: null, description: "Lakes, green landscapes and a perfect final chapter to this Irish adventure.", dedication: "The end of the route, but just the beginning of the memories." }
  ]
};
// IMPORTANT: the dotted path connects destinations geographically in sequence.
// It is NOT a calculated driving route and must not be presented as one.

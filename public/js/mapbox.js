
export const displayMap = (locations) => {
  mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhbnQ2MjYiLCJhIjoiY2xsenl0M3R0MW50czNwcGp6aGg5azJjOCJ9._8QH8pbZCvDUTfhfOTkg2g';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/grant626/clm03ais801o701p7369o1pzw',
    scrollZoom: false
    // center: [-118.113491, 34.111745],
    // zoom: 8,
    // interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    //Create Marker
    const el = document.createElement('div');
    el.className = 'marker';

    //Add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
    .setLngLat(loc.coordinates)
    .addTo(map);

    //Add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p> ${loc.day}: ${loc.description} </p>`)
      .addTo(map);


    //Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 100,
      left: 100,
      right: 100
    }
  });
};



const BASE_URL = 'https://api.openrouteservice.org';

export async function geocode(apiKey, text) {
  const url = `${BASE_URL}/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(text)}&size=5`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Geocoding failed (${res.status})`);
  }
  const data = await res.json();
  return (data.features || []).map(f => ({
    name: f.properties.label,
    coordinates: f.geometry.coordinates,
  }));
}

export async function getRoute(apiKey, coordinates) {
  const url = `${BASE_URL}/v2/directions/cycling-regular/geojson`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates,
      elevation: true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Routing failed (${res.status})`);
  }
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error('No route found between these locations');

  const routeCoords = feature.geometry.coordinates;
  const { distance, duration } = feature.properties.summary;

  let ascent = 0;
  let descent = 0;
  if (feature.properties.segments) {
    for (const seg of feature.properties.segments) {
      ascent += seg.ascent || 0;
      descent += seg.descent || 0;
    }
  }

  return { coordinates: routeCoords, distance, duration, ascent, descent };
}

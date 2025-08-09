'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25,41],
  iconAnchor: [12,41]
})

export default function Map({ markers }: { markers: { id: number, title: string, lat: number, lng: number }[] }) {
  const center = markers.length ? [markers[0].lat, markers[0].lng] as [number, number] : [43.6532, -79.3832]
  return (
    <MapContainer center={center} zoom={12} className="h-full w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {markers.map(m => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
          <Popup>{m.title}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}




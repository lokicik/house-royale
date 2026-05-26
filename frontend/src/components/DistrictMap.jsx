import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

const ISTANBUL_CENTER = [41.0082, 28.9784]

const ILCE_COORDS = {
  'Adalar':         [40.8713, 29.0939],
  'Arnavutköy':     [41.1856, 28.7397],
  'Ataşehir':       [40.9833, 29.1167],
  'Avcılar':        [40.9789, 28.7211],
  'Bağcılar':       [41.0364, 28.8561],
  'Bahçelievler':   [40.9997, 28.8565],
  'Bakırköy':       [40.9819, 28.8742],
  'Başakşehir':     [41.0920, 28.8012],
  'Bayrampaşa':     [41.0453, 28.9122],
  'Beşiktaş':       [41.0422, 29.0061],
  'Beykoz':         [41.1283, 29.0958],
  'Beylikdüzü':     [40.9814, 28.6408],
  'Beyoğlu':        [41.0369, 28.9769],
  'Büyükçekmece':   [41.0214, 28.5831],
  'Çatalca':        [41.1436, 28.4614],
  'Çekmeköy':       [41.0433, 29.1814],
  'Esenler':        [41.0431, 28.8764],
  'Esenyurt':       [41.0297, 28.6753],
  'Eyüpsultan':     [41.0478, 28.9339],
  'Fatih':          [41.0186, 28.9397],
  'Gaziosmanpaşa':  [41.0667, 28.9100],
  'Güngören':       [41.0200, 28.8744],
  'Kadıköy':        [40.9817, 29.0800],
  'Kağıthane':      [41.0769, 28.9714],
  'Kartal':         [40.9014, 29.1856],
  'Küçükçekmece':   [41.0017, 28.7758],
  'Maltepe':        [40.9350, 29.1303],
  'Pendik':         [40.8769, 29.2567],
  'Sancaktepe':     [41.0028, 29.2308],
  'Sarıyer':        [41.1669, 29.0533],
  'Silivri':        [41.0733, 28.2464],
  'Sultanbeyli':    [40.9631, 29.2644],
  'Sultangazi':     [41.1053, 28.8706],
  'Şile':           [41.1775, 29.6117],
  'Şişli':          [41.0603, 28.9872],
  'Tuzla':          [40.8167, 29.3000],
  'Ümraniye':       [41.0167, 29.1167],
  'Üsküdar':        [41.0228, 29.0158],
  'Zeytinburnu':    [41.0017, 28.9017],
}

export default function DistrictMap({ ilce, mahalle }) {
  const coords = ILCE_COORDS[ilce] ?? ISTANBUL_CENTER
  const zoom = ILCE_COORDS[ilce] ? 13 : 11

  return (
    <MapContainer
      center={coords}
      zoom={zoom}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      attributionControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker
        center={coords}
        radius={10}
        pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.35, weight: 2 }}
      >
        <Popup>{mahalle ? `${mahalle}, ${ilce}` : ilce}</Popup>
      </CircleMarker>
    </MapContainer>
  )
}

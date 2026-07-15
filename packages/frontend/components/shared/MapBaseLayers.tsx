'use client';

import { TileLayer } from 'react-leaflet';

interface MapBaseLayersProps {
  maxZoom?: number;
}

export default function MapBaseLayers({ maxZoom = 22 }: MapBaseLayersProps) {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxNativeZoom={19}
      maxZoom={maxZoom}
    />
  );
}

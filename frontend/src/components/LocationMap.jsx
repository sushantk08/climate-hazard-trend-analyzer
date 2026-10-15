import { useEffect } from "react";
import {
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [18.5204, 73.8567];

const locationMarkerIcon = L.divIcon({
    className: "",
    html: `
        <span style="
            display: block;
            width: 18px;
            height: 18px;
            background: #2563eb;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 1px 5px rgba(0, 0, 0, 0.45);
        "></span>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});


function RecenterMap({ center }) {
    const map = useMap();
    const [latitude, longitude] = center;

    useEffect(() => {
        map.setView([latitude, longitude], map.getZoom());
    }, [map, latitude, longitude]);

    return null;
}


function MapClickHandler({ onCoordinatesSelect }) {
    useMapEvents({
        click(event) {
            onCoordinatesSelect({
                latitude: Number(event.latlng.lat.toFixed(6)),
                longitude: Number(event.latlng.lng.toFixed(6)),
            });
        },
    });

    return null;
}

export default function LocationMap({
    latitude,
    longitude,
    onCoordinatesSelect,
}) {
    const lat = Number(latitude);
    const lon = Number(longitude);

    const hasValidCoordinates =
        latitude !== "" &&
        longitude !== "" &&
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180;

    const center = hasValidCoordinates
        ? [lat, lon]
        : DEFAULT_CENTER;

    return (
        <section className="location-map-section">
            <p>
                Click anywhere on the map to select a location.
                The coordinates can then be used for heatwave analysis.
            </p>

            <MapContainer
                center={center}
                zoom={7}
                scrollWheelZoom={true}
                style={{
                    height: "360px",
                    width: "100%",
                    borderRadius: "12px",
                }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <RecenterMap center={center} />

                {hasValidCoordinates && (
                    <Marker
                        position={center}
                        icon={locationMarkerIcon}
                    />
                )}

                <MapClickHandler
                    onCoordinatesSelect={onCoordinatesSelect}
                />
            </MapContainer>
        </section>
    );
}

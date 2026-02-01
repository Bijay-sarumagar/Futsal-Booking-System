import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, MapPin, Star, ArrowRight, Zap, Shield, Clock, Users, Sparkles } from "lucide-react";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { futsalImages, heroImage } from "./data";
import { FutsalItem, getFutsals } from "../lib/api";
import "../../styles/player-home.css";

const defaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function PlayerHome() {
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [futsals, setFutsals] = useState<FutsalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFutsals() {
      try {
        setLoading(true);
        setError("");
        const data = await getFutsals();
        setFutsals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load futsals");
      } finally {
        setLoading(false);
      }
    }

    loadFutsals();
  }, []);

  const cards = useMemo(() => {
    return futsals.map((f, index) => {
      const district = f.location.includes(",") ? f.location.split(",").pop()!.trim() : "Kathmandu";
      return {
        id: String(f.id),
        name: f.futsal_name,
        location: f.location,
        district,
        latitude: f.latitude,
        longitude: f.longitude,
        price: 1500,
        rating: 4.5,
        reviews: 0,
        image: f.image || futsalImages[index % futsalImages.length],
        type: "indoor" as const,
        amenities: ["Parking", "Changing Room", "Floodlights"],
        status: f.approval_status,
      };
    });
  }, [futsals]);

  const districts = ["All", "Kathmandu", "Lalitpur", "Bhaktapur", "Kaski", "Chitwan", "Morang"];
  const filtered = cards.filter(
    (f) =>
      f.status === "approved" &&
      (selectedDistrict === "All" || f.district === selectedDistrict) &&
      (f.name.toLowerCase().includes(search.toLowerCase()) || f.location.toLowerCase().includes(search.toLowerCase()))
  );

  const mapPoints = useMemo(() => {
    return filtered
      .map((f) => {
        const lat = Number(f.latitude);
        const lng = Number(f.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }
        return { id: f.id, name: f.name, location: f.location, district: f.district, lat, lng };
      })
      .filter(
        (
          point,
        ): point is { id: string; name: string; location: string; district: string; lat: number; lng: number } =>
          point !== null,
      );
  }, [filtered]);

  const formatDistrictBadge = (district: string) => {
    const cleaned = district
      .replace(/\b\d{5}\b/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[,-]\s*$/, "")
      .trim();
    return cleaned || "Area";
  };

  const mapCenter = useMemo<[number, number]>(() => {
    if (!mapPoints.length) return [27.7172, 85.3240];

    const districtCounts = new Map<string, number>();
    mapPoints.forEach((point) => {
      districtCounts.set(point.district, (districtCounts.get(point.district) || 0) + 1);
    });

    const majorityDistrict = Array.from(districtCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
    const focusPoints = majorityDistrict
      ? mapPoints.filter((point) => point.district === majorityDistrict)
      : mapPoints;

    const avgLat = focusPoints.reduce((sum, p) => sum + p.lat, 0) / focusPoints.length;
    const avgLng = focusPoints.reduce((sum, p) => sum + p.lng, 0) / focusPoints.length;
    return [avgLat, avgLng];
  }, [mapPoints]);

  return (
    <div className="ph-page">
      <section className="ph-hero">
        <img src={heroImage} alt="Nepal" className="ph-hero__image" />
        <div className="ph-hero__overlay" aria-hidden />
        <div className="ph-hero__inner">
          <span className="ph-kicker">Trusted by players across Nepal</span>
          <h1 className="ph-title">Book Futsal Courts Across Nepal</h1>
          <p className="ph-subtitle">Find, compare, and book the best futsal courts near you in seconds.</p>

          <div className="ph-search-row">
            <div className="ph-search-wrap">
              <Search className="ph-search-icon" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or location..."
                className="ph-input"
              />
            </div>
            <button type="button" className="ph-btn-primary">
              <Search className="w-4 h-4" aria-hidden />
              Search
            </button>
          </div>
        </div>
      </section>

      <section className="ph-feature-strip">
        {[
          { icon: Zap, label: "Instant Booking", desc: "Book in seconds" },
          { icon: MapPin, label: "Location Based", desc: "Find nearby courts" },
          { icon: Shield, label: "Verified Courts", desc: "Quality guaranteed" },
          { icon: Clock, label: "Real-time Slots", desc: "Live availability" },
        ].map((f) => (
          <article key={f.label} className="ph-feature-card">
            <span className="ph-feature-icon-wrap">
              <f.icon className="ph-feature-icon" aria-hidden />
            </span>
            <div>
              <h3 className="ph-feature-title">{f.label}</h3>
              <p className="ph-feature-desc">{f.desc}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="ph-section">
        <div className="ph-section-head">
          <div>
            <h2 className="ph-section-title">Popular Futsals Near You</h2>
            <p className="ph-section-sub">Discover top-rated futsal courts</p>
          </div>
          <Link to="/search" className="ph-inline-link">
            View all <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>

        <div className="ph-chip-row">
          {districts.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDistrict(d)}
              className={`ph-chip ${selectedDistrict === d ? "ph-chip--active" : ""}`}
            >
              {d}
            </button>
          ))}
        </div>

        {loading ? <p className="ph-info">Loading futsals...</p> : null}
        {error ? <p className="ph-error">{error}</p> : null}

        <div className="ph-grid">
          {filtered.map((f) => (
            <Link to={`/futsal/${f.id}`} key={f.id} className="ph-card">
              <div className="ph-card-media">
                <img src={f.image} alt={f.name} className="ph-card-image" />
                <span className="ph-card-badge">{f.type === "indoor" ? "Indoor" : "Outdoor"}</span>
              </div>

              <div className="ph-card-body">
                <h3 className="ph-card-title">{f.name}</h3>
                <p className="ph-card-location">
                  <MapPin className="w-3.5 h-3.5" aria-hidden />
                  {f.location}
                </p>

                <div className="ph-card-meta">
                  <div className="ph-rating">
                    <Star className="ph-star" aria-hidden />
                    <span>{f.rating}</span>
                    <small>({f.reviews})</small>
                  </div>
                  <div className="ph-tags">
                    {f.amenities.slice(0, 2).map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="ph-section ph-map-section">
        <h2 className="ph-section-title">Explore on Map</h2>
        <div className="ph-map-wrap">
          {mapPoints.length ? (
            <>
              <MapContainer center={mapCenter} zoom={12} className="ph-map-canvas" scrollWheelZoom attributionControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mapPoints.map((point) => (
                  <Marker key={point.id} position={[point.lat, point.lng]} icon={defaultMarkerIcon}>
                    <Popup className="ph-map-popup--card" autoPanPadding={[18, 18]}>
                      <div className="ph-map-popup-card">
                        <div className="ph-map-popup-card__top">
                          <strong className="ph-map-popup-card__title">{point.name}</strong>
                          <span className="ph-map-popup-card__badge">{formatDistrictBadge(point.district)}</span>
                        </div>
                        <p className="ph-map-popup-card__location">{point.location}</p>
                        <Link to={`/futsal/${point.id}`} className="ph-map-popup-card__cta">
                          View futsal <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <p className="ph-map-attribution">
                Map data &copy;{" "}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                  OpenStreetMap
                </a>{" "}
                contributors
              </p>
            </>
          ) : (
            <div className="ph-map-content">
              <MapPin className="ph-map-icon" aria-hidden />
              <p className="ph-map-title">Map will appear once futsals have coordinates</p>
              <p className="ph-map-sub">Showing {filtered.length} futsals for this filter.</p>
            </div>
          )}
        </div>
      </section>

      <section className="ph-ai-section">
        <div className="ph-ai-inner">
          <div className="ph-ai-head">
            <span className="ph-ai-chip">
              <Sparkles className="w-4 h-4" aria-hidden />
              Coming Soon
            </span>
            <h2 className="ph-ai-title">AI-Powered Features</h2>
            <p className="ph-ai-sub">Smart features to enhance your futsal experience</p>
          </div>

          <div className="ph-ai-grid">
            {[
              { icon: Zap, title: "Smart Slot Suggestions", desc: "AI analyzes your booking patterns and suggests the best available slots." },
              { icon: Users, title: "Find Opponents", desc: "Match with other teams looking for a game at the same time and location." },
              { icon: Sparkles, title: "Dynamic Pricing", desc: "AI-optimized pricing based on demand, weather, and time of day." },
              { icon: Shield, title: "No-Show Prediction", desc: "Predict cancellations and offer slots to waitlisted players." },
              { icon: Clock, title: "Personalized Alerts", desc: "Get notified when your preferred slots become available." },
              { icon: Star, title: "Tournament Recs", desc: "AI-curated tournament and match recommendations based on your skill level." },
            ].map((f) => (
              <article key={f.title} className="ph-ai-card">
                <f.icon className="ph-ai-icon" aria-hidden />
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, MapPin, Star, Filter, ArrowRight, Zap, Shield, Clock, Users, Sparkles } from "lucide-react";
import { futsalImages, heroImage } from "./data";
import { FutsalItem, getFutsals } from "../lib/api";

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

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[420px] overflow-hidden">
        <img src={heroImage} alt="Nepal" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
          <h1 className="text-white text-[2.5rem] max-w-xl" style={{ fontWeight: 800, lineHeight: 1.1 }}>
            Book Futsal Courts Across Nepal
          </h1>
          <p className="text-gray-200 mt-3 text-[1.125rem] max-w-md">
            Find, compare, and book the best futsal courts near you in seconds.
          </p>
          {/* Search Bar */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or location..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-foreground shadow-lg"
              />
            </div>
            <button className="px-6 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 justify-center shadow-lg">
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: "Instant Booking", desc: "Book in seconds" },
            { icon: MapPin, label: "Location Based", desc: "Find nearby courts" },
            { icon: Shield, label: "Verified Courts", desc: "Quality guaranteed" },
            { icon: Clock, label: "Real-time Slots", desc: "Live availability" },
          ].map((f) => (
            <div key={f.label} className="bg-white rounded-xl p-4 shadow-md border border-border flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[0.875rem]" style={{ fontWeight: 600 }}>{f.label}</p>
                <p className="text-[0.75rem] text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* District Filter + Futsals */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2>Popular Futsals Near You</h2>
            <p className="text-muted-foreground text-[0.875rem]">Discover top-rated futsal courts</p>
          </div>
          <Link to="/search" className="text-emerald-600 text-[0.875rem] flex items-center gap-1 hover:underline" style={{ fontWeight: 500 }}>
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* District Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {districts.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDistrict(d)}
              className={`px-4 py-2 rounded-full text-[0.875rem] whitespace-nowrap transition-colors ${
                selectedDistrict === d ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-gray-200"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? <p className="text-muted-foreground mb-4">Loading futsals...</p> : null}
        {error ? <p className="text-red-600 mb-4">{error}</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f) => (
            <Link to={`/futsal/${f.id}`} key={f.id} className="group bg-white rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-shadow">
              <div className="relative h-48 overflow-hidden">
                <img src={f.image} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 rounded-md text-[0.75rem]" style={{ fontWeight: 600 }}>
                  {f.type === "indoor" ? "🏠 Indoor" : "🌿 Outdoor"}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-[1rem]">{f.name}</h3>
                <div className="flex items-center gap-1 text-muted-foreground text-[0.8125rem] mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {f.location}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-[0.875rem]" style={{ fontWeight: 600 }}>{f.rating}</span>
                    <span className="text-muted-foreground text-[0.8125rem]">({f.reviews})</span>
                  </div>
                  <div className="flex gap-1">
                    {f.amenities.slice(0, 3).map((a) => (
                      <span key={a} className="px-2 py-0.5 bg-gray-100 rounded text-[0.6875rem] text-muted-foreground">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <h2 className="mb-4">Explore on Map</h2>
        <div className="rounded-xl border border-border bg-gray-100 h-80 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\"><rect width=\"40\" height=\"40\" fill=\"none\" stroke=\"%23ccc\" stroke-width=\"0.5\"/></svg>') repeat" }} />
          <div className="text-center z-10">
            <MapPin className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <p className="text-muted-foreground" style={{ fontWeight: 500 }}>Interactive Map View</p>
            <p className="text-[0.8125rem] text-muted-foreground">Showing {filtered.length} futsals nearby</p>
            {/* Simulated pins */}
            <div className="flex gap-4 mt-4 justify-center">
              {filtered.slice(0, 3).map((f) => (
                <div key={f.id} className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow text-[0.8125rem]">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  {f.name.split(" ")[0]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Preview */}
      <section className="bg-gradient-to-r from-emerald-600 to-teal-600 py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-white text-[0.8125rem] mb-3">
              <Sparkles className="w-4 h-4" /> Coming Soon
            </div>
            <h2 className="text-white text-[1.75rem]" style={{ fontWeight: 700 }}>AI-Powered Features</h2>
            <p className="text-emerald-100 mt-2">Smart features to enhance your futsal experience</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: "Smart Slot Suggestions", desc: "AI analyzes your booking patterns and suggests the best available slots." },
              { icon: Users, title: "Find Opponents", desc: "Match with other teams looking for a game at the same time and location." },
              { icon: Sparkles, title: "Dynamic Pricing", desc: "AI-optimized pricing based on demand, weather, and time of day." },
              { icon: Shield, title: "No-Show Prediction", desc: "Predict cancellations and offer slots to waitlisted players." },
              { icon: Clock, title: "Personalized Alerts", desc: "Get notified when your preferred slots become available." },
              { icon: Star, title: "Tournament Recs", desc: "AI-curated tournament and match recommendations based on your skill level." },
            ].map((f) => (
              <div key={f.title} className="bg-white/10 backdrop-blur rounded-xl p-5 text-white">
                <f.icon className="w-8 h-8 mb-3 text-emerald-200" />
                <p className="text-[0.9375rem]" style={{ fontWeight: 600 }}>{f.title}</p>
                <p className="text-[0.8125rem] text-emerald-100 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

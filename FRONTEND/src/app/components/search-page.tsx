import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, MapPin, Star, SlidersHorizontal, X } from "lucide-react";
import { futsalImages } from "./data";
import { getFutsals, type FutsalItem } from "../lib/api";

export function SearchPage() {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "indoor" | "outdoor">("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState("rating");
  const [futsals, setFutsals] = useState<FutsalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFutsals() {
      try {
        setLoading(true);
        const data = await getFutsals();
        setFutsals(data);
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
        image: futsalImages[index % futsalImages.length],
        type: "indoor" as const,
        amenities: ["Parking", "Changing Room", "Floodlights"],
        status: f.approval_status,
      };
    });
  }, [futsals]);

  const filtered = cards
    .filter((f) => f.status === "approved")
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.location.toLowerCase().includes(search.toLowerCase()))
    .filter((f) => typeFilter === "all" || f.type === typeFilter)
    .filter((f) => f.price >= priceRange[0] && f.price <= priceRange[1])
    .filter((f) => f.rating >= ratingFilter)
    .sort((a, b) => sortBy === "rating" ? b.rating - a.rating : sortBy === "price-low" ? a.price - b.price : b.price - a.price);

  return (
    <div className="w-full py-6 md:py-8">
      <h1 className="mb-1">Find Futsal Courts</h1>
      <p className="text-muted-foreground mb-7">Search and filter futsals across Nepal</p>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, location..." className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-input-background" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-3 border border-border rounded-xl bg-card flex items-center gap-2 hover:bg-muted transition-colors">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-[148px] px-4 py-3 border border-border rounded-xl bg-card">
          <option value="rating">Top Rated</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4>Filters</h4>
            <button onClick={() => setShowFilters(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[0.8125rem] text-muted-foreground mb-2 block">Court Type</label>
              <div className="flex gap-2">
                {(["all", "indoor", "outdoor"] as const).map((t) => (
                  <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-[0.8125rem] capitalize transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[0.8125rem] text-muted-foreground mb-2 block">Max Price: Rs. {priceRange[1]}</label>
              <input type="range" min={500} max={2000} step={100} value={priceRange[1]} onChange={(e) => setPriceRange([0, +e.target.value])} className="w-full accent-primary" />
            </div>
            <div>
              <label className="text-[0.8125rem] text-muted-foreground mb-2 block">Min Rating</label>
              <div className="flex gap-1">
                {[0, 3, 3.5, 4, 4.5].map((r) => (
                  <button key={r} onClick={() => setRatingFilter(r)} className={`px-3 py-1.5 rounded-lg text-[0.8125rem] transition-colors ${ratingFilter === r ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"}`}>
                    {r === 0 ? "Any" : `${r}+`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? <p className="text-muted-foreground text-[0.875rem] mb-4">Loading futsals...</p> : null}

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((f) => (
          <Link to={`/futsal/${f.id}`} key={f.id} className="group bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
            <div className="relative h-48 overflow-hidden">
              <img src={f.image} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-3 left-3 px-2 py-1 bg-card/90 rounded-md text-[0.75rem]" style={{ fontWeight: 600 }}>
                {f.type === "indoor" ? "🏠 Indoor" : "🌿 Outdoor"}
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-[1rem]">{f.name}</h3>
              <div className="flex items-center gap-1 text-muted-foreground text-[0.8125rem] mt-1">
                <MapPin className="w-3.5 h-3.5" /> {f.location}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span style={{ fontWeight: 600 }}>{f.rating}</span>
                  <span className="text-muted-foreground text-[0.8125rem]">({f.reviews})</span>
                </div>
                <div className="flex gap-1">
                  {f.amenities.slice(0, 2).map((a) => (
                    <span key={a} className="px-2 py-0.5 bg-muted rounded text-[0.6875rem] text-muted-foreground">{a}</span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p style={{ fontWeight: 500 }}>No futsals found</p>
          <p className="text-[0.875rem]">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}

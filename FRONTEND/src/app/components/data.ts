export const futsalImages = [
  "https://images.unsplash.com/photo-1641352848874-c96659e03144?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXRzYWwlMjBpbmRvb3IlMjBzb2NjZXIlMjBjb3VydHxlbnwxfHx8fDE3NzQ3NjgxMzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1763517626645-ddd7b396417f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXRzYWwlMjBnYW1lJTIwcGxheWVycyUyMGFjdGlvbnxlbnwxfHx8fDE3NzQ3NjgxMzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1771909720952-3f6aea71ab4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRvb3IlMjBzcG9ydHMlMjBmYWNpbGl0eXxlbnwxfHx8fDE3NzQ3NjgxMzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1728520512146-ab57cd1279c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBmaWVsZCUyMHR1cmYlMjBncmVlbnxlbnwxfHx8fDE3NzQ3NjgxMzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1762445964939-123200d655ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBhcmVuYSUyMG5pZ2h0JTIwbGlnaHRzfGVufDF8fHx8MTc3NDc2ODEzMnww&ixlib=rb-4.1.0&q=80&w=1080",
];

export const heroImage = "https://images.unsplash.com/photo-1692713463181-91416a14f8af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXBhbCUyMGthdGhtYW5kdSUyMGNpdHklMjBhZXJpYWx8ZW58MXx8fHwxNzc0NzY4MTMyfDA&ixlib=rb-4.1.0&q=80&w=1080";

export interface Futsal {
  id: string;
  name: string;
  location: string;
  district: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  type: "indoor" | "outdoor";
  amenities: string[];
  lat: number;
  lng: number;
  owner: string;
  status: "approved" | "pending";
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  price: number;
}

export interface Booking {
  id: string;
  futsalName: string;
  date: string;
  time: string;
  playerName: string;
  playerPhone: string;
  status: "confirmed" | "pending" | "cancelled";
  amount: number;
  paymentMethod: "online" | "offline";
}

export interface Review {
  id: string;
  playerName: string;
  rating: number;
  comment: string;
  date: string;
  avatar: string;
}

export const futsals: Futsal[] = [
  { id: "1", name: "Kathmandu Futsal Arena", location: "Baneshwor, Kathmandu", district: "Kathmandu", price: 1500, rating: 4.7, reviews: 128, image: futsalImages[0], type: "indoor", amenities: ["Parking", "Changing Room", "Cafeteria", "First Aid"], lat: 27.6915, lng: 85.3420, owner: "Ram Shrestha", status: "approved" },
  { id: "2", name: "Pokhara Sports Hub", location: "Lakeside, Pokhara", district: "Kaski", price: 1200, rating: 4.5, reviews: 89, image: futsalImages[1], type: "outdoor", amenities: ["Parking", "Drinking Water", "Floodlights"], lat: 28.2096, lng: 83.9856, owner: "Sita Gurung", status: "approved" },
  { id: "3", name: "Lalitpur Futsal Zone", location: "Pulchowk, Lalitpur", district: "Lalitpur", price: 1800, rating: 4.8, reviews: 205, image: futsalImages[2], type: "indoor", amenities: ["Parking", "Changing Room", "Cafeteria", "Shower", "WiFi"], lat: 27.6788, lng: 85.3188, owner: "Bikash Tamang", status: "approved" },
  { id: "4", name: "Bhaktapur Kick Arena", location: "Suryabinayak, Bhaktapur", district: "Bhaktapur", price: 1000, rating: 4.2, reviews: 56, image: futsalImages[3], type: "outdoor", amenities: ["Parking", "Drinking Water"], lat: 27.6710, lng: 85.4298, owner: "Anish Maharjan", status: "approved" },
  { id: "5", name: "Chitwan Futsal Park", location: "Bharatpur, Chitwan", district: "Chitwan", price: 900, rating: 4.3, reviews: 67, image: futsalImages[4], type: "indoor", amenities: ["Parking", "Changing Room", "First Aid"], lat: 27.6833, lng: 84.4333, owner: "Deepak Thapa", status: "pending" },
  { id: "6", name: "Biratnagar Sports Arena", location: "Main Road, Biratnagar", district: "Morang", price: 800, rating: 4.0, reviews: 34, image: futsalImages[0], type: "outdoor", amenities: ["Parking", "Floodlights"], lat: 26.4525, lng: 87.2718, owner: "Sunil Rai", status: "pending" },
];

export const generateTimeSlots = (date: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let h = 6; h <= 21; h++) {
    const available = Math.random() > 0.3;
    slots.push({
      id: `${date}-${h}`,
      time: `${h.toString().padStart(2, "0")}:00 - ${(h + 1).toString().padStart(2, "0")}:00`,
      available,
      price: h >= 17 && h <= 20 ? 1800 : 1500,
    });
  }
  return slots;
};

export const mockBookings: Booking[] = [
  { id: "B001", futsalName: "Kathmandu Futsal Arena", date: "2026-03-30", time: "18:00 - 19:00", playerName: "Aarav Sharma", playerPhone: "9841234567", status: "confirmed", amount: 1800, paymentMethod: "online" },
  { id: "B002", futsalName: "Kathmandu Futsal Arena", date: "2026-03-30", time: "19:00 - 20:00", playerName: "Priya Thapa", playerPhone: "9851234567", status: "pending", amount: 1800, paymentMethod: "offline" },
  { id: "B003", futsalName: "Kathmandu Futsal Arena", date: "2026-03-31", time: "07:00 - 08:00", playerName: "Rohan KC", playerPhone: "9861234567", status: "confirmed", amount: 1500, paymentMethod: "online" },
  { id: "B004", futsalName: "Kathmandu Futsal Arena", date: "2026-03-29", time: "10:00 - 11:00", playerName: "Sneha Bista", playerPhone: "9871234567", status: "cancelled", amount: 1500, paymentMethod: "online" },
  { id: "B005", futsalName: "Kathmandu Futsal Arena", date: "2026-04-01", time: "17:00 - 18:00", playerName: "Kiran Lama", playerPhone: "9801234567", status: "confirmed", amount: 1800, paymentMethod: "offline" },
];

export const mockReviews: Review[] = [
  { id: "R1", playerName: "Aarav Sharma", rating: 5, comment: "Best futsal in Kathmandu! Great turf and facilities.", date: "2026-03-25", avatar: "AS" },
  { id: "R2", playerName: "Priya Thapa", rating: 4, comment: "Good court but parking is limited during peak hours.", date: "2026-03-22", avatar: "PT" },
  { id: "R3", playerName: "Rohan KC", rating: 5, comment: "Love the indoor setup. Perfect for rainy season games!", date: "2026-03-20", avatar: "RK" },
  { id: "R4", playerName: "Sneha Bista", rating: 4, comment: "Clean facilities and friendly staff. Will come again.", date: "2026-03-18", avatar: "SB" },
  { id: "R5", playerName: "Kiran Lama", rating: 3, comment: "Decent place but could improve the changing rooms.", date: "2026-03-15", avatar: "KL" },
];

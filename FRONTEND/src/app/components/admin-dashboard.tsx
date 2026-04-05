import { Users, MapPin, Calendar, DollarSign, TrendingUp, ArrowUpRight, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const platformStats = [
  { label: "Total Users", value: "2,847", change: "+15%", icon: Users },
  { label: "Active Futsals", value: "42", change: "+6", icon: MapPin },
  { label: "Total Bookings", value: "8,392", change: "+22%", icon: Calendar },
  { label: "Platform Revenue", value: "Rs. 4.2L", change: "+18%", icon: DollarSign },
];

const monthlyGrowth = [
  { month: "Oct", users: 1800, bookings: 5200 }, { month: "Nov", users: 2000, bookings: 6100 },
  { month: "Dec", users: 2200, bookings: 6800 }, { month: "Jan", users: 2400, bookings: 7200 },
  { month: "Feb", users: 2600, bookings: 7800 }, { month: "Mar", users: 2847, bookings: 8392 },
];

const revenueByDistrict = [
  { district: "Kathmandu", revenue: 180000 }, { district: "Lalitpur", revenue: 120000 },
  { district: "Bhaktapur", revenue: 65000 }, { district: "Kaski", revenue: 45000 },
  { district: "Chitwan", revenue: 35000 }, { district: "Morang", revenue: 22000 },
];

const pendingOwners = [
  { name: "Deepak Thapa", futsal: "Chitwan Futsal Park", district: "Chitwan", date: "Mar 27" },
  { name: "Sunil Rai", futsal: "Biratnagar Sports Arena", district: "Morang", date: "Mar 28" },
];

const recentActivity = [
  { text: "New futsal registered: Chitwan Futsal Park", time: "2 hours ago", type: "info" },
  { text: "Booking dispute reported at Pokhara Sports Hub", time: "5 hours ago", type: "warning" },
  { text: "Owner approved: Anish Maharjan (Bhaktapur)", time: "1 day ago", type: "success" },
  { text: "Payment issue resolved for booking #B389", time: "1 day ago", type: "success" },
  { text: "New review flagged for moderation", time: "2 days ago", type: "warning" },
];

export function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview • FutsalHub</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted">Export Data</button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[0.875rem] hover:bg-emerald-700">Settings</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {platformStats.map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-emerald-600 text-[0.8125rem] flex items-center">
                {s.change} <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[1.5rem]" style={{ fontWeight: 700 }}>{s.value}</p>
            <p className="text-[0.8125rem] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="mb-4">Platform Growth</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" fill="#10b98133" stroke="#10b981" strokeWidth={2} />
              <Area type="monotone" dataKey="bookings" fill="#3b82f633" stroke="#3b82f6" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="mb-4">Revenue by District</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByDistrict} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="district" type="category" tick={{ fontSize: 12 }} width={80} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" /> Pending Approvals
            </h3>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[0.8125rem]">{pendingOwners.length}</span>
          </div>
          <div className="space-y-3">
            {pendingOwners.map((o, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p style={{ fontWeight: 500 }}>{o.futsal}</p>
                  <p className="text-[0.8125rem] text-muted-foreground">{o.name} • {o.district} • Applied {o.date}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[0.8125rem] hover:bg-emerald-700">Approve</button>
                  <button className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-[0.8125rem] hover:bg-red-50">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${a.type === "warning" ? "bg-yellow-500" : a.type === "success" ? "bg-emerald-500" : "bg-blue-500"}`} />
                <div>
                  <p className="text-[0.875rem]">{a.text}</p>
                  <p className="text-[0.75rem] text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

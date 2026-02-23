import { useEffect, useMemo, useState } from "react";
import { Search, Users, UserCheck, UserX } from "lucide-react";
import { getUsersForAdmin, setUserStatusForAdmin, type AdminUserItem } from "../lib/api";
import { toast } from "sonner";

type UiStatus = "active" | "inactive";
type UiAdminUser = Omit<AdminUserItem, "status"> & { status: UiStatus };

export function AdminUsers() {
  const [users, setUsers] = useState<UiAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "player" | "owner">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const data = await getUsersForAdmin();
      setUsers(
        data.map((item) => ({
          ...item,
          status: item.status === "active" ? "active" : "inactive",
        })),
      );
    } catch {
      setUsers([]);
      setLoadError("Users could not be loaded right now. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filtered = useMemo(() => {
    return users
      .filter((user) => roleFilter === "all" || user.role === roleFilter)
      .filter((user) => statusFilter === "all" || user.status === statusFilter)
      .filter((user) => {
        const text = `${user.username} ${user.first_name} ${user.last_name} ${user.email}`.toLowerCase();
        return text.includes(query.toLowerCase());
      });
  }, [users, query, roleFilter, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((item) => item.status === "active").length,
      inactive: users.filter((item) => item.status === "inactive").length,
      owners: users.filter((item) => item.role === "owner").length,
    };
  }, [users]);

  async function handleStatusChange(userId: number, nextStatus: UiStatus) {
    try {
      setSavingUserId(userId);
      await setUserStatusForAdmin(userId, nextStatus);
      setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, status: nextStatus } : item)));
      toast.success("User status updated");
    } catch {
      toast.error("Failed to update user status");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      <div className="mb-6">
        <h1>User Management</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">View all platform users and monitor account status.</p>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-medium hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Users</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-primary">Active</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums text-primary">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-destructive">Inactive</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums text-destructive">{summary.inactive}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Owners</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{summary.owners}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search username, name, or email"
              className="w-full pl-10 pr-4 py-2.5 min-h-11 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "player", "owner"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-2 min-h-10 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  roleFilter === role ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="min-w-[190px]">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              className="w-full px-3 py-2.5 min-h-11 rounded-lg border border-border bg-input-background text-sm capitalize text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-muted/60 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-t border-border">
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading users…</td>
              </tr>
            ) : null}

            {filtered.map((user) => {
              const fullName = `${user.first_name} ${user.last_name}`.trim() || user.username;
              return (
                <tr key={user.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt={fullName}
                          className="w-9 h-9 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold border border-border">
                          {fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{fullName}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                      user.role === "owner"
                        ? "bg-amber-50 text-amber-900 border-amber-200"
                        : "bg-sky-50 text-sky-900 border-sky-200"
                    }`}>
                      <Users className="w-3.5 h-3.5" />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <div className="inline-flex items-center gap-2">
                      {user.status === "active" ? <UserCheck className="w-3.5 h-3.5 text-primary" /> : <UserX className="w-3.5 h-3.5 text-destructive" />}
                      <select
                        value={user.status}
                        onChange={(event) => handleStatusChange(user.id, event.target.value as UiStatus)}
                        disabled={savingUserId === user.id}
                        className="px-2.5 py-1.5 rounded-md border border-border bg-input-background text-xs font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.created_at.slice(0, 10)}</td>
                </tr>
              );
            })}

            {!loading && filtered.length === 0 ? (
              <tr className="border-t border-border">
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users match the selected filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

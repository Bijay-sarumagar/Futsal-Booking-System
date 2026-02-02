import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CalendarDays, Camera, ChevronRight, Lock, Mail, Phone, Save, Shield, XCircle } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { changePassword, getMyBookings, updateMe } from "../lib/api";
import { toast } from "sonner";

export function ProfilePage() {
  const { user, setUserProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [emailForm, setEmailForm] = useState({
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  if (!user) {
    return <div className="max-w-4xl mx-auto px-4 py-6 text-muted-foreground">Loading profile...</div>;
  }

  const backRoute = user.role === "owner" ? "/owner" : user.role === "admin" ? "/super-admin" : "/player/home";
  const bookingsRoute = user.role === "owner" ? "/owner/bookings" : user.role === "admin" ? "/admin-dashboard-preview" : "/my-bookings";

  useEffect(() => {
    async function loadBookingSummary() {
      if (!user || user.role !== "player") {
        setBookingCount(null);
        return;
      }
      try {
        const bookings = await getMyBookings();
        setBookingCount(bookings.length);
        const today = new Date().toISOString().slice(0, 10);
        setUpcomingCount(bookings.filter((booking) => booking.booking_status !== "cancelled" && booking.slot_details.slot_date >= today).length);
      } catch {
        setBookingCount(null);
        setUpcomingCount(null);
      }
    }

    void loadBookingSummary();
  }, [user]);

  const fullName = useMemo(() => {
    const composed = `${form.first_name} ${form.last_name}`.trim();
    return composed || user.username;
  }, [form.first_name, form.last_name, user.username]);

  const profileInitial = useMemo(() => {
    return (form.first_name?.[0] || user.username?.[0] || "U").toUpperCase();
  }, [form.first_name, user.username]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      const updated = await updateMe({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        profile_picture: profileFile,
      });
      setUserProfile(updated);
      setProfileFile(null);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const saveEmail = async () => {
    if (!emailForm.email.trim()) {
      toast.error("Email is required");
      return;
    }

    try {
      setEmailSaving(true);
      const updated = await updateMe({ email: emailForm.email.trim() });
      setUserProfile(updated);
      setForm((prev) => ({ ...prev, email: updated.email }));
      setEmailForm({ email: updated.email || "" });
      toast.success("Email updated successfully");
      setShowEmailModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update email");
    } finally {
      setEmailSaving(false);
    }
  };

  const savePassword = async () => {
    if (!passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error("Fill all password fields");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New password and confirm password do not match");
      return;
    }

    try {
      setPasswordSaving(true);
      await changePassword(passwordForm);
      toast.success("Password changed successfully");
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
      setShowPasswordModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const imageSrc = profileFile ? URL.createObjectURL(profileFile) : user.profile_picture || "";

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(backRoute)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="mb-1">My Profile</h1>
        <p className="text-muted-foreground mb-7">Manage your account details and profile photo.</p>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
          <aside className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-muted flex items-center justify-center mx-auto border border-border">
              {imageSrc ? (
                <img src={imageSrc} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 text-primary font-bold text-3xl flex items-center justify-center">
                  {profileInitial}
                </div>
              )}
            </div>

            <div className="text-center mt-4">
              <h3 className="text-lg leading-tight">{fullName}</h3>
              <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground mt-1">{user.role}</p>
            </div>

            <label className="mt-5 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border hover:bg-muted cursor-pointer text-[0.875rem]">
              <Camera className="w-4 h-4" /> Change Picture
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="mt-5 space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{user.email || "No email"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{form.phone || "No phone"}</span>
              </div>
              {user.role === "player" ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="w-4 h-4" />
                  <span>{bookingCount ?? "-"} total bookings</span>
                </div>
              ) : null}
            </div>
          </aside>

          <section className="space-y-5">
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">Update details that are available in your account.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">First name</label>
                  <input value={form.first_name} onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border" />
                </div>
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">Last name</label>
                  <input value={form.last_name} onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border" />
                </div>
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border" />
                </div>
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">Username</label>
                  <input value={user.username} readOnly className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-muted-foreground" />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={saveProfile} disabled={saving} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2 transition-colors">
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg">Booking History</h3>
                <button
                  type="button"
                  onClick={() => navigate(bookingsRoute)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 to-card">
                  <p className="text-xs uppercase tracking-[0.05em] text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-semibold mt-1 text-primary">{bookingCount ?? "-"}</p>
                </div>
                <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <p className="text-xs uppercase tracking-[0.05em] text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-semibold mt-1 text-blue-700">{upcomingCount ?? "-"}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg mb-4">Account Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Role & Access</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role} account</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-[0.04em]">
                    {user.status}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/35 transition-colors"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Lock className="w-4 h-4 text-primary" /> Security & Password
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailForm({ email: user.email || "" });
                    setShowEmailModal(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/35 transition-colors"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Mail className="w-4 h-4 text-primary" /> Change Email
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showEmailModal ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3>Change Email</h3>
              <button type="button" onClick={() => setShowEmailModal(false)} className="text-red-600 hover:text-red-700" title="Close">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[0.75rem] text-muted-foreground">New Email</label>
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border"
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShowEmailModal(false)} className="px-4 py-2 border border-border rounded-xl hover:bg-muted">Cancel</button>
              <button type="button" onClick={saveEmail} disabled={emailSaving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {emailSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPasswordModal ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3>Security & Password</h3>
              <button type="button" onClick={() => setShowPasswordModal(false)} className="text-red-600 hover:text-red-700" title="Close">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[0.75rem] text-muted-foreground">Current Password</label>
                <input type="password" value={passwordForm.old_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, old_password: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border" />
              </div>
              <div>
                <label className="text-[0.75rem] text-muted-foreground">New Password</label>
                <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border" />
              </div>
              <div>
                <label className="text-[0.75rem] text-muted-foreground">Confirm Password</label>
                <input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 border border-border rounded-xl hover:bg-muted">Cancel</button>
              <button type="button" onClick={savePassword} disabled={passwordSaving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {passwordSaving ? "Saving..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

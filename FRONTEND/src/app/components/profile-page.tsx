import { useState } from "react";
import { Camera, Save, UserCircle2 } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { updateMe } from "../lib/api";

export function ProfilePage() {
  const { user, setUserProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
  });

  if (!user) {
    return <div className="max-w-4xl mx-auto px-4 py-6 text-muted-foreground">Loading profile...</div>;
  }

  const saveProfile = async () => {
    try {
      setSaving(true);
      const updated = await updateMe({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        bio: form.bio,
        profile_picture: profileFile,
      });
      setUserProfile(updated);
      setProfileFile(null);
    } finally {
      setSaving(false);
    }
  };

  const imageSrc = profileFile ? URL.createObjectURL(profileFile) : user.profile_picture || "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1>My Profile</h1>
      <p className="text-muted-foreground mb-6">Customize your profile information and picture.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-muted flex items-center justify-center mx-auto">
            {imageSrc ? (
              <img src={imageSrc} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-16 h-16 text-muted-foreground" />
            )}
          </div>
          <label className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted cursor-pointer text-[0.875rem]">
            <Camera className="w-4 h-4" /> Change Picture
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div className="lg:col-span-2 bg-white border border-border rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.75rem] text-muted-foreground mb-1">First name</label>
              <input value={form.first_name} onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border" />
            </div>
            <div>
              <label className="block text-[0.75rem] text-muted-foreground mb-1">Last name</label>
              <input value={form.last_name} onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border" />
            </div>
            <div>
              <label className="block text-[0.75rem] text-muted-foreground mb-1">Email</label>
              <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border" />
            </div>
            <div>
              <label className="block text-[0.75rem] text-muted-foreground mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[0.75rem] text-muted-foreground mb-1">Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} rows={4} className="w-full px-3 py-2 rounded-lg border border-border" />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={saveProfile} disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

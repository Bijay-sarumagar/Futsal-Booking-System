import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { LoginPage } from "./components/login";
import { RegisterPage } from "./components/register";
import { HomeRedirect } from "./components/home-redirect";
import { PlayerHome } from "./components/player-home";
import { FutsalDetail } from "./components/futsal-detail";
import { SearchPage } from "./components/search-page";
import { MyBookings } from "./components/my-bookings";
import { ProfilePage } from "./components/profile-page";
import { OwnerDashboard } from "./components/owner-dashboard";
import { OwnerBookings } from "./components/owner-bookings";
import { OwnerSlots } from "./components/owner-slots";
import { OwnerFutsals } from "./components/owner-futsals";
import { OwnerFutsalDetail } from "./components/owner-futsal-detail";
import { AdminDashboard } from "./components/admin-dashboard";
import { AdminOwners } from "./components/admin-owners";
import { AdminFutsals } from "./components/admin-futsals";
import { SuperAdminPage } from "./components/super-admin-page";
import { RequireAdmin, RequireAuth, RequireOwner, RequirePlayer } from "./auth/guards";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  {
    Component: RequireAuth,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: HomeRedirect },
          { path: "profile", Component: ProfilePage },
          {
            Component: RequirePlayer,
            children: [
              { path: "player/home", Component: PlayerHome },
              { path: "search", Component: SearchPage },
              { path: "futsal/:id", Component: FutsalDetail },
              { path: "my-bookings", Component: MyBookings },
            ],
          },
          {
            Component: RequireOwner,
            children: [
              { path: "owner", Component: OwnerDashboard },
              { path: "owner/futsals", Component: OwnerFutsals },
              { path: "owner/futsals/:id", Component: OwnerFutsalDetail },
              { path: "owner/bookings", Component: OwnerBookings },
              { path: "owner/slots", Component: OwnerSlots },
            ],
          },
          {
            Component: RequireAdmin,
            children: [
              { path: "admin", Component: SuperAdminPage },
              { path: "super-admin", Component: SuperAdminPage },
              { path: "super-admin/owners", Component: AdminOwners },
              { path: "super-admin/futsals", Component: AdminFutsals },
              { path: "admin-dashboard-preview", Component: AdminDashboard },
            ],
          },
        ],
      },
    ],
  },
]);

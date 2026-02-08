import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { LoginPage } from "./components/login";
import { RegisterPage } from "./components/register";
import { HomeRedirect } from "./components/home-redirect";
import { PlayerHome } from "./components/player-home";
import { FutsalDetail } from "./components/futsal-detail";
import { SearchPage } from "./components/search-page";
import { MyBookings } from "./components/my-bookings";
import { PlayerOpponentFinder } from "./components/player-opponent-finder";
import { PlayerChatbotPage } from "./components/player-chatbot-page";
import { ProfilePage } from "./components/profile-page";
import { OwnerDashboard } from "./components/owner-dashboard";
import { OwnerBookings } from "./components/owner-bookings";
import { OwnerSlots } from "./components/owner-slots";
import { OwnerFutsals } from "./components/owner-futsals";
import { OwnerFutsalDetail } from "./components/owner-futsal-detail";
import { OwnerLayout } from "./components/owner-layout";
import { OwnerPaymentHistory } from "./components/owner-payment-history";
import { AdminDashboard } from "./components/admin-dashboard";
import { AdminOwners } from "./components/admin-owners";
import { AdminFutsals } from "./components/admin-futsals";
import { AdminOwnerDetailPage } from "./components/admin-owner-detail-page";
import { AdminFutsalDetailPage } from "./components/admin-futsal-detail-page";
import { AdminUsers } from "./components/admin-users";
import { SuperAdminPage } from "./components/super-admin-page";
import { SuperAdminLayout } from "./components/super-admin-layout";
import { PaymentSuccessPage } from "./components/payment-success";
import { PaymentFailurePage } from "./components/payment-failure";
import { EsewaStartPage } from "./components/payment-esewa-start";
import { RequireAdmin, RequireAuth, RequireOwner, RequirePlayer } from "./auth/guards";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/payments/esewa-start", Component: EsewaStartPage },
  {
    Component: RequireAuth,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: HomeRedirect },
          { path: "profile", Component: ProfilePage },
          { path: "payments/success", Component: PaymentSuccessPage },
          { path: "payments/failure", Component: PaymentFailurePage },
          {
            Component: RequirePlayer,
            children: [
              { path: "player/home", Component: PlayerHome },
              { path: "search", Component: SearchPage },
              { path: "futsal/:id", Component: FutsalDetail },
              { path: "my-bookings", Component: MyBookings },
              { path: "find-opponents", Component: PlayerOpponentFinder },
              { path: "player/chatbot", Component: PlayerChatbotPage },
            ],
          },
          {
            Component: RequireOwner,
            children: [
              {
                Component: OwnerLayout,
                children: [
                  { path: "owner", Component: OwnerDashboard },
                  { path: "owner/futsals", Component: OwnerFutsals },
                  { path: "owner/futsals/:id", Component: OwnerFutsalDetail },
                  { path: "owner/bookings", Component: OwnerBookings },
                  { path: "owner/slots", Component: OwnerSlots },
                  { path: "owner/payments", Component: OwnerPaymentHistory },
                ],
              },
            ],
          },
          {
            Component: RequireAdmin,
            children: [
              {
                Component: SuperAdminLayout,
                children: [
                  { path: "admin", Component: SuperAdminPage },
                  { path: "admin/owners", Component: AdminOwners },
                  { path: "admin/owners/:ownerId", Component: AdminOwnerDetailPage },
                  { path: "admin/futsals", Component: AdminFutsals },
                  { path: "admin/futsals/:id", Component: AdminFutsalDetailPage },
                  { path: "admin/users", Component: AdminUsers },
                  { path: "super-admin", Component: SuperAdminPage },
                  { path: "super-admin/owners", Component: AdminOwners },
                  { path: "super-admin/owners/:ownerId", Component: AdminOwnerDetailPage },
                  { path: "super-admin/futsals", Component: AdminFutsals },
                  { path: "super-admin/futsals/:id", Component: AdminFutsalDetailPage },
                  { path: "super-admin/users", Component: AdminUsers },
                ],
              },
              { path: "admin-dashboard-preview", Component: AdminDashboard },
            ],
          },
        ],
      },
    ],
  },
]);

import authRoutes from "../modules/auth/auth.route.js";
import userRoutes from "../modules/user/user.route.js";
import roomRoutes from "../modules/room/room.route.js";
import bookingRoutes from "../modules/booking/booking.route.js";
import paymentRoutes from "../modules/payment/payment.route.js";
import loyaltyRoutes from "../modules/loyalty/loyalty.route.js";
import tierRoutes from "../modules/tier/tier.route.js";
import analyticsRoutes from "../modules/analytics/analytics.route.js";

export function mountRoutes(app) {
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/rooms", roomRoutes);
  app.use("/api/v1/bookings", bookingRoutes);
  app.use("/api/v1/payments", paymentRoutes);
  app.use("/api/v1/loyalty", loyaltyRoutes);
  app.use("/api/v1/tiers", tierRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);
}

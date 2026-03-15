import authRoutes from "../modules/auth/auth.route.js";
import userRoutes from "../modules/user/user.route.js";
import roomTypeRoutes from "../modules/room/types/roomType.route.js";
import roomPricingRoutes from "../modules/room/pricing/roomPricing.route.js";
import roomAvailabilityRoutes from "../modules/room/availability/roomAvailability.route.js";

export function mountRoutes(app) {
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/rooms", roomTypeRoutes);
  app.use("/api/v1/rooms/pricing", roomPricingRoutes);
  app.use("/api/v1/rooms/availability", roomAvailabilityRoutes);
}

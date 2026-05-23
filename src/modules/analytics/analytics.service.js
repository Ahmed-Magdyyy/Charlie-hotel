import { BookingModel } from "../booking/booking.model.js";
import { PaymentModel } from "../payment/payment.model.js";
import { RoomAvailabilityModel } from "../room/availability/roomAvailability.model.js";
import { RoomTypeModel } from "../room/types/roomType.model.js";
import { bookingStatus } from "../../shared/constants/enums.js";

// Statuses that count as "real" bookings (aligned with revenue)
// Derived from enums — everything except cancelled and expired
const EXCLUDED_STATUSES = [bookingStatus.CANCELLED, bookingStatus.EXPIRED];
const REAL_BOOKING_STATUSES = Object.values(bookingStatus).filter(
  (s) => !EXCLUDED_STATUSES.includes(s),
);

// ─── Helpers ────────────────────────────────────────────────

/**
 * Build start/end of a UTC day.
 */
function dayBounds(dateStr) {
  const start = new Date(dateStr + "T00:00:00.000Z");
  const end = new Date(dateStr + "T23:59:59.999Z");
  return { start, end };
}

/**
 * Get the start of a UTC day from a Date object.
 */
function startOfDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Given a period (startDate, endDate), compute the "previous" period of equal length.
 * E.g. for May 1–31, previous = Apr 1–30.
 */
function getPreviousPeriod(startDate, endDate) {
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1); // 1ms before current start
  const prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  return { prevStart, prevEnd };
}

/**
 * Calculate percentage change. Returns null if previous is 0.
 */
function percentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

/**
 * Get total active room count (sum of totalRoomCount across active room types).
 */
async function getTotalActiveRoomCount() {
  const result = await RoomTypeModel.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: "$totalRoomCount" } } },
  ]);
  return result[0]?.total || 0;
}

/**
 * Get sum of bookedRooms for a specific date from RoomAvailability.
 */
async function getBookedRoomsForDate(date) {
  const dayStart = startOfDay(date);
  const result = await RoomAvailabilityModel.aggregate([
    { $match: { date: dayStart } },
    { $group: { _id: null, total: { $sum: "$bookedRooms" } } },
  ]);
  return result[0]?.total || 0;
}

// ─── KPI Cards ──────────────────────────────────────────────

async function getKpiCards(startDate, endDate, today, isLifetime) {
  // For lifetime: no previous period comparison for bookings/revenue
  const hasPeriod = !isLifetime;
  const { prevStart, prevEnd } = hasPeriod
    ? getPreviousPeriod(startDate, endDate)
    : { prevStart: null, prevEnd: null };
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // Run all queries in parallel
  const [
    currentBookings,
    previousBookings,
    currentRevenue,
    previousRevenue,
    activeGuests,
    yesterdayActiveGuests,
    totalRooms,
    todayOccupied,
    yesterdayOccupied,
  ] = await Promise.all([
    // Card 1: Total Bookings (current period or lifetime)
    BookingModel.countDocuments({
      ...(hasPeriod && { createdAt: { $gte: startDate, $lte: endDate } }),
      status: { $in: REAL_BOOKING_STATUSES },
    }),

    // Card 1: Total Bookings (previous period) — skip for lifetime
    hasPeriod
      ? BookingModel.countDocuments({
          createdAt: { $gte: prevStart, $lte: prevEnd },
          status: { $in: REAL_BOOKING_STATUSES },
        })
      : Promise.resolve(null),

    // Card 2: Revenue (current period or lifetime) — sum of paid payments
    PaymentModel.aggregate([
      {
        $match: {
          status: "paid",
          ...(hasPeriod && { paidAt: { $gte: startDate, $lte: endDate } }),
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Card 2: Revenue (previous period) — skip for lifetime
    hasPeriod
      ? PaymentModel.aggregate([
          {
            $match: {
              status: "paid",
              paidAt: { $gte: prevStart, $lte: prevEnd },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
      : Promise.resolve([]),

    // Card 3: Active Guests (today) — bookings with checked_in status
    BookingModel.countDocuments({
      status: "checked_in",
    }),

    // Card 3: Active Guests comparison — we look at bookings that were
    // checked_in yesterday. We approximate by counting bookings that had
    // checkIn <= yesterday AND checkOut > yesterday AND status is checked_in
    // or checked_out (they would have been checked_in yesterday).
    BookingModel.countDocuments({
      checkIn: { $lte: startOfDay(yesterday) },
      checkOut: { $gt: startOfDay(yesterday) },
      status: { $in: ["checked_in", "checked_out"] },
    }),

    // Card 4: Total rooms
    getTotalActiveRoomCount(),

    // Card 4: Occupied rooms today
    getBookedRoomsForDate(today),

    // Card 4: Occupied rooms yesterday
    getBookedRoomsForDate(yesterday),
  ]);

  const currentRevenueTotal = currentRevenue[0]?.total || 0;
  const previousRevenueTotal = previousRevenue[0]?.total || 0;

  return {
    totalBookings: {
      value: currentBookings,
      previousValue: previousBookings,
      changePercent: hasPeriod ? percentChange(currentBookings, previousBookings) : null,
    },
    revenue: {
      value: currentRevenueTotal,
      previousValue: previousRevenueTotal,
      changePercent: hasPeriod ? percentChange(currentRevenueTotal, previousRevenueTotal) : null,
      currency: "SAR",
    },
    activeGuests: {
      value: activeGuests,
      previousValue: yesterdayActiveGuests,
      changeAbsolute: activeGuests - yesterdayActiveGuests,
    },
    roomOccupancy: {
      occupied: todayOccupied,
      total: totalRooms,
      previousOccupied: yesterdayOccupied,
      changeAbsolute: todayOccupied - yesterdayOccupied,
    },
  };
}

// ─── Monthly Revenue Chart ──────────────────────────────────

const MONTH_LABELS = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

async function getMonthlyRevenue(today) {
  // Go back 6 months from the current month
  const endMonth = today.getUTCMonth(); // 0-indexed
  const endYear = today.getUTCFullYear();

  // Calculate start: 5 months before current month (total 6 months including current)
  let startMonth = endMonth - 5;
  let startYear = endYear;
  if (startMonth < 0) {
    startMonth += 12;
    startYear -= 1;
  }

  const rangeStart = new Date(Date.UTC(startYear, startMonth, 1));
  // End of current month
  const rangeEnd = new Date(Date.UTC(endYear, endMonth + 1, 0, 23, 59, 59, 999));

  const pipeline = [
    {
      $match: {
        status: "paid",
        paidAt: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$paidAt" },
          month: { $month: "$paidAt" },
        },
        total: { $sum: "$amount" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ];

  const results = await PaymentModel.aggregate(pipeline);

  // Build a complete array for all 6 months (fill zeros for missing months)
  const revenueMap = new Map(
    results.map((r) => [`${r._id.year}-${r._id.month}`, r.total]),
  );

  const months = [];
  let curYear = startYear;
  let curMonth = startMonth;

  for (let i = 0; i < 6; i++) {
    const key = `${curYear}-${curMonth + 1}`;
    months.push({
      month: curMonth + 1,
      year: curYear,
      label: MONTH_LABELS[curMonth + 1],
      total: revenueMap.get(key) || 0,
    });

    curMonth++;
    if (curMonth >= 12) {
      curMonth = 0;
      curYear++;
    }
  }

  return months;
}

// ─── Weekly Occupancy Chart ─────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function getWeeklyOccupancy(today) {
  // Find Monday of the current week
  const dayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);

  const weekStart = startOfDay(monday);
  const sunday = new Date(weekStart);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const weekEnd = sunday;

  // Get total rooms and all availability records for the week in parallel
  const [totalRooms, records] = await Promise.all([
    getTotalActiveRoomCount(),
    RoomAvailabilityModel.aggregate([
      {
        $match: {
          date: { $gte: weekStart, $lte: weekEnd },
        },
      },
      {
        $group: {
          _id: "$date",
          totalBooked: { $sum: "$bookedRooms" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]),
  ]);

  // Build a map of date -> booked rooms
  const bookedMap = new Map(
    records.map((r) => [r._id.toISOString().slice(0, 10), r.totalBooked]),
  );

  // Build 7-day array
  const days = [];
  const current = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const dateStr = current.toISOString().slice(0, 10);
    const bookedRooms = bookedMap.get(dateStr) || 0;
    const percentage =
      totalRooms > 0
        ? Math.round((bookedRooms / totalRooms) * 1000) / 10
        : 0;

    days.push({
      dayOfWeek: DAY_LABELS[i],
      date: dateStr,
      bookedRooms,
      percentage,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return { totalRooms, days };
}

// ─── Today's Summary ────────────────────────────────────────

async function getTodaySummary(today) {
  const todayStart = startOfDay(today);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const [todayCheckouts, todayCheckins, pendingPayments, newReservations] =
    await Promise.all([
      // Today's Checkouts: bookings checking out today
      BookingModel.countDocuments({
        checkOut: { $gte: todayStart, $lt: tomorrowStart },
        status: { $in: ["checked_in", "checked_out"] },
      }),

      // Today's Checkins: bookings checking in today
      BookingModel.countDocuments({
        checkIn: { $gte: todayStart, $lt: tomorrowStart },
        status: { $in: ["confirmed", "checked_in"] },
      }),

      // Pending Payments: active bookings awaiting payment
      BookingModel.countDocuments({
        paymentStatus: "pending",
        status: { $nin: ["expired", "cancelled"] },
      }),

      // New Reservations: bookings created today (excluding expired)
      BookingModel.countDocuments({
        createdAt: { $gte: todayStart, $lt: tomorrowStart },
        status: { $nin: ["expired"] },
      }),
    ]);

  return {
    todayCheckouts,
    todayCheckins,
    pendingPayments,
    newReservations,
  };
}

// ─── Recent Bookings ────────────────────────────────────────

async function getRecentBookings(limit) {
  const bookings = await BookingModel.find({
    status: { $nin: ["expired"] },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: "roomType", select: "name" })
    .lean();

  return bookings.map((b) => ({
    bookingNumber: b.bookingNumber,
    guest: `${b.guestDetails?.firstName || ""} ${b.guestDetails?.lastName || ""}`.trim(),
    roomType: b.roomType?.name?.en || b.roomType?.name?.ar || "—",
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
    paymentStatus: b.paymentStatus,
    total: b.priceBreakdown?.finalTotal || 0,
  }));
}

// ─── Main Orchestrator ──────────────────────────────────────

export async function getDashboardService(query) {
  const now = new Date();
  const today = startOfDay(now);

  // If no dates provided → lifetime (no date filter on KPI)
  const isLifetime = !query.startDate && !query.endDate;

  const startDate = query.startDate
    ? new Date(query.startDate + "T00:00:00.000Z")
    : null;

  const endDate = query.endDate
    ? new Date(query.endDate + "T23:59:59.999Z")
    : query.startDate
      ? new Date( // If only startDate given, default endDate to today
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            23, 59, 59, 999,
          ),
        )
      : null;

  const recentBookingsLimit = Math.min(
    Math.max(Number(query.recentBookingsLimit) || 10, 1),
    50,
  );

  // Build period metadata for the response
  const period = isLifetime
    ? { type: "lifetime", startDate: null, endDate: null }
    : {
        type: "custom",
        startDate: (startDate || new Date(0)).toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      };

  // Run all 5 sections concurrently
  const [kpiCards, monthlyRevenue, weeklyOccupancy, todaySummary, recentBookings] =
    await Promise.all([
      getKpiCards(startDate, endDate, today, isLifetime),
      getMonthlyRevenue(today),
      getWeeklyOccupancy(today),
      getTodaySummary(today),
      getRecentBookings(recentBookingsLimit),
    ]);

  return {
    period,
    kpiCards,
    monthlyRevenue,
    weeklyOccupancy,
    todaySummary,
    recentBookings,
  };
}

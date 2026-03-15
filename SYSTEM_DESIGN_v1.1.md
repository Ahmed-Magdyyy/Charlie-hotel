# Charlie Hotel — System Design & Source of Truth

> **Version**: 1.1  
> **Last Updated**: 2026-03-01  
> **Status**: Draft — Reviewed & Patched  
> **Stack**: Node.js · Express.js · MongoDB · Modular Monolith

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Module Map](#3-module-map)
4. [Database Design](#4-database-design)
5. [User Roles & Permissions (RBAC)](#5-user-roles--permissions-rbac)
6. [Auth Module](#6-auth-module)
7. [Room Management Module](#7-room-management-module)
8. [Booking Module](#8-booking-module)
9. [Pricing Engine](#9-pricing-engine)
10. [Loyalty Module](#10-loyalty-module)
11. [Payment Module](#11-payment-module)
12. [Reports Module](#12-reports-module)
13. [Website / Marketing Module](#13-website--marketing-module)
14. [Notification Module](#14-notification-module)
15. [File Upload Module](#15-file-upload-module)
16. [Internationalization (i18n)](#16-internationalization-i18n)
17. [API Conventions](#17-api-conventions)
18. [Folder Structure](#18-folder-structure)
19. [Environment & Configuration](#19-environment--configuration)
20. [Glossary](#20-glossary)

---

## 1. Project Overview

**Charlie Hotel** is a hotel-room booking system for a single property (~40 rooms) located in Jeddah, Saudi Arabia.

### What It Is

- A **manual-inventory** booking system — staff upload rooms, set availability & pricing. It is **NOT** a real-time OTA sync.
- A marketing website with an integrated booking flow.
- An internal dashboard for admins & staff.
- A client-facing portal with loyalty/points.

### What It Is NOT

- A multi-property PMS.
- A channel manager or OTA aggregator.
- A real-time availability sync system.

### Core Surfaces

| Surface           | URL Pattern             | Audience           |
| ----------------- | ----------------------- | ------------------ |
| Marketing Website | `charlie.com/`          | Public             |
| Booking Platform  | `charlie.com/jeddah`    | Guests / Clients   |
| Admin Dashboard   | `charlie.com/dashboard` | Admin / Staff      |
| Client Portal     | `charlie.com/portal`    | Registered Clients |

---

## 2. Architecture

### Pattern: Modular Monolith

A single Node.js + Express.js application, organized into self-contained **modules**. Each module owns its:

| Layer      | File                   | Responsibility                       |
| ---------- | ---------------------- | ------------------------------------ |
| Route      | `module.route.js`      | HTTP routing, middleware binding     |
| Controller | `module.controller.js` | Request parsing, response formatting |
| Service    | `module.service.js`    | Business logic                       |
| Model      | `module.model.js`      | Mongoose schema & model              |
| Validator  | `module.validator.js`  | Joi / express-validator schemas      |
| Repository | `module.repository.js` | _(Optional)_ Data-access abstraction |

### Cross-Cutting Concerns

| Concern        | Implementation                                |
| -------------- | --------------------------------------------- |
| Authentication | JWT (access + refresh tokens)                 |
| Authorization  | RBAC middleware with permission matrix        |
| Error Handling | Centralized `errorHandler` middleware         |
| Logging        | Winston / Pino structured logger              |
| Rate Limiting  | `express-rate-limit`                          |
| File Upload    | Multer → cloud storage (S3 / Cloudinary)      |
| i18n           | `Accept-Language` header, `ar` / `en` support |
| Validation     | Joi schemas per route                         |

---

## 3. Module Map

```
src/
├── modules/
│   ├── auth/           # Authentication & token management
│   ├── user/           # User CRUD, profile, roles
│   ├── permission/     # RBAC matrix & permission management
│   ├── room/           # Room types & room instances
│   ├── room-pricing/   # Daily pricing engine
│   ├── booking/        # Reservation lifecycle
│   ├── loyalty/        # Points ledger & redemptions
│   ├── payment/        # Payment processing & transactions
│   ├── notification/   # Email / SMS dispatch
│   ├── upload/         # File / image management
│   └── website/        # CMS-like content (pages, SEO)
├── shared/
│   ├── middleware/      # auth, rbac, errorHandler, i18n
│   ├── utils/           # helpers, constants, enums
│   ├── config/          # env, db connection
│   └── errors/          # custom error classes
└── app.js               # Express app bootstrap
```

---

## 4. Database Design

### 4.1 `users` Collection

Stores **all** user types: Admin, Staff, Client.

```js
{
  _id: ObjectId,
  email: String,               // unique, nullable (if phone-only signup)
  phone: String,               // unique, nullable (if email-only signup)
  passwordHash: String,
  firstName: String,           // { en, ar } — or plain string
  lastName: String,
  role: String,                // enum: "admin" | "staff" | "client"
  staffRole: String,           // only for staff — e.g. "reception", "operations", "housekeeping"
  permissions: [String],       // array of permission keys (staff only)
  loyaltyPoints: Number,       // default 0 (clients only)
  isActive: Boolean,           // soft disable
  preferredLanguage: String,   // "en" | "ar"
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `{ email: 1 }` unique sparse, `{ phone: 1 }` unique sparse, `{ role: 1 }`

---

### 4.2 `room_types` Collection

Defines the **template** for a category of rooms. Admin creates these.

```js
{
  _id: ObjectId,
  name: { en: String, ar: String },           // e.g. "Deluxe Sea View Suite"
  description: { en: String, ar: String },
  maxGuests: Number,                          // max occupancy
  basePrice: Number,                          // default fallback price per night (SAR)
  beds: [
    {
      type: String,    // enum: "king" | "queen" | "single" | "double" | "sofa_bed" | "bunk"
      count: Number
    }
  ],
  amenities: [String],  // ["air_conditioning", "private_bathroom", "refrigerator",
                         //  "kettle", "wifi", "tv", "safe", "minibar", "balcony", ...]
  views: [String],       // ["pool_view", "sea_view", "city_view", "garden_view", "open_view"]
  images: [
    {
      url: String,
      alt: { en: String, ar: String },
      order: Number       // display order
    }
  ],
  reservationOptions: [
    {
      type: String,       // enum: "room_only" | "breakfast" | "half_board" | "full_board"
      label: { en: String, ar: String },
      priceModifier: Number   // additional SAR per night on top of room rate
    }
  ],
  cancellationPolicies: [
    {
      type: String,           // enum: "free_cancellation" | "non_refundable"
      label: { en: String, ar: String },
      deadline: Number,       // days before check-in (null for non_refundable)
      priceModifier: Number   // discount/surcharge per night (e.g. -20 for non_refundable discount)
    }
  ],
  paymentOptions: [
    {
      type: String,           // enum: "pay_now" | "pay_at_hotel"
      label: { en: String, ar: String },
      priceModifier: Number   // e.g. pay_now might give -10 SAR discount per night
    }
  ],
  totalRoomCount: Number,     // how many physical rooms of this type exist (e.g. 5)
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Soft-Delete Rule**: Setting `isActive: false` hides the room type from all public-facing search and listing endpoints. It does **not** affect existing bookings. Any `confirmed`, `checked_in`, or future booking for a deactivated room type must still be visible and manageable in the admin dashboard. Staff should see a `[Deactivated Room Type]` label on those bookings to flag the situation. all carry a `priceModifier` (positive = surcharge, negative = discount) that stacks on top of the daily room rate to compute the final price.

---

### 4.3 `room_pricing` Collection

Stores **daily** pricing overrides for each room type. If no entry exists for a date, the `basePrice` from `room_types` is used.

```js
{
  _id: ObjectId,
  roomType: ObjectId,       // ref → room_types
  date: Date,               // a single calendar date (store as YYYY-MM-DD midnight UTC)
  price: Number,            // price in SAR for that night
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `{ roomType: 1, date: 1 }` unique compound

**Bulk Update**: Admin can select a room type + date range + price → the API will upsert one document per date in the range.

---

### 4.4 `room_availability` Collection

Tracks how many rooms of a given type are bookable per date. This is the **inventory ledger**.

```js
{
  _id: ObjectId,
  roomType: ObjectId,       // ref → room_types
  date: Date,               // single calendar date
  totalRooms: Number,       // total rooms available that day (set by staff, defaults to room_types.totalRoomCount)
  bookedRooms: Number,      // incremented when a booking is confirmed
  isBlocked: Boolean,       // admin can block a date entirely
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `{ roomType: 1, date: 1 }` unique compound

**Derived**: `availableRooms = totalRooms - bookedRooms`

**Atomic Update Strategy**: `bookedRooms` must be incremented atomically when a booking is confirmed to prevent overselling. Use MongoDB's `findOneAndUpdate` with a conditional check:

```js
// Only increment if availableRooms would remain >= 0
await RoomAvailability.findOneAndUpdate(
  {
    roomType: roomTypeId,
    date: date,
    isBlocked: false,
    $expr: { $gt: [{ $subtract: ["$totalRooms", "$bookedRooms"] }, 0] }
  },
  { $inc: { bookedRooms: 1 } },
  { new: true, session }  // always inside a MongoDB session/transaction
);
// If null is returned → room is no longer available → abort booking with 409 Conflict
```

**Concurrency / Race Condition Rule**: The booking creation flow (Step 5 in Section 8) MUST run inside a **MongoDB multi-document transaction** covering both the `bookings` insert and all `room_availability` increments for the date range. If any date fails the availability check, the entire transaction is aborted and a `409 Conflict` is returned to the client.

1. Filter: Only room types where **every night** in the search range has `availableRooms > 0` AND `maxGuests >= guestCount`.
2. Sort: By `basePrice` ascending (cheapest first) as the default.
3. Slice: Take the top N results per `maxRoomDisplayCount`.

> **Admin Note**: In a future iteration, admin can manually pin or reorder which room types surface first. For now, price-ascending is the rule.

---

### 4.5 `bookings` Collection

A booking is a **reservation** made by a client for one or more nights.

```js
{
  _id: ObjectId,
  bookingRef: String,             // human-readable reference (e.g. "CH-20260301-A7K2")
  client: ObjectId,               // ref → users (role: client)
  roomType: ObjectId,             // ref → room_types
  checkIn: Date,                  // check-in date (date only, no time)
  checkOut: Date,                 // check-out date
  nights: Number,                 // derived: checkOut - checkIn
  guestCount: Number,
  guestDetails: {
    fullName: String,
    email: String,
    phone: String,
    specialRequests: String
  },
  reservationOption: {
    type: String,                 // "room_only" | "breakfast" | "half_board" | "full_board"
    priceModifier: Number         // snapshot at booking time
  },
  cancellationPolicy: {
    type: String,                 // "free_cancellation" | "non_refundable"
    deadline: Date,               // computed absolute date
    priceModifier: Number         // snapshot
  },
  paymentOption: {
    type: String,                 // "pay_now" | "pay_at_hotel"
    priceModifier: Number         // snapshot
  },
  priceBreakdown: {
    nightlyRates: [               // one entry per night
      { date: Date, baseRate: Number, modifiers: Number, total: Number }
    ],
    subtotal: Number,             // sum of nightlyRates.total
    loyaltyDiscount: Number,      // points-based discount (SAR value)
    taxes: Number,                // VAT etc.
    grandTotal: Number            // subtotal - loyaltyDiscount + taxes
  },
  loyaltyPointsUsed: Number,     // points redeemed
  loyaltyPointsEarned: Number,   // points earned from this booking
  status: String,                 // enum — see below
  paymentStatus: String,          // enum: "pending" | "paid" | "partially_paid" | "refunded" | "failed"
  statusHistory: [
    { status: String, changedBy: ObjectId, changedAt: Date, reason: String }
  ],
  createdBy: ObjectId,            // user who created (client self or staff on behalf)
  expiresAt: Date,                // only set for pay_now bookings in "pending" status
  createdAt: Date,
  updatedAt: Date
}
```

**Booking Statuses**:

| Status        | Description                               |
| ------------- | ----------------------------------------- |
| `pending`     | Created, awaiting payment or confirmation |
| `confirmed`   | Payment received or approved by staff     |
| `checked_in`  | Guest arrived                             |
| `checked_out` | Guest departed                            |
| `cancelled`   | Cancelled by client or staff              |
| `no_show`     | Guest didn't arrive                       |
| `expired`     | Pending booking not paid within expiry window — auto-cancelled by system |

---

### 4.6 `loyalty_ledger` Collection

Immutable log of all points transactions.

```js
{
  _id: ObjectId,
  client: ObjectId,              // ref → users
  type: String,                  // enum: "earn" | "redeem" | "adjust" | "expire"
  points: Number,                // positive for earn/adjust-add, negative for redeem/adjust-subtract
  balance: Number,               // running balance after this transaction
  booking: ObjectId,             // ref → bookings (nullable)
  description: { en: String, ar: String },
  createdBy: ObjectId,           // admin/system who triggered
  createdAt: Date
}
```

**Indexes**: `{ client: 1, createdAt: -1 }`

**Rule**: `users.loyaltyPoints` is always the authoritative balance. The ledger is for audit/history.

---

### 4.7 `payments` Collection

```js
{
  _id: ObjectId,
  booking: ObjectId,             // ref → bookings
  client: ObjectId,              // ref → users
  amount: Number,                // SAR
  currency: String,              // "SAR"
  method: String,                // enum: "credit_card" | "debit_card" | "mada" | "apple_pay" | "bank_transfer" | "pay_at_hotel" | "paid_offline"
  gateway: String,               // payment provider name (e.g. "moyasar", "tap", "hyperpay")
  gatewayTransactionId: String,  // external reference
  status: String,                // enum: "pending" | "completed" | "failed" | "refunded"
  refundAmount: Number,          // if partially/fully refunded
  metadata: Object,              // gateway-specific response data
  createdAt: Date,
  updatedAt: Date
}
```

---

### 4.8 `system_settings` Collection

Global configuration (singleton document or keyed docs).

```js
{
  _id: ObjectId,
  key: String,                   // unique setting key
  value: Mixed,
  updatedBy: ObjectId,
  updatedAt: Date
}
```

**Example Settings**:

| Key                   | Default | Description                                 |
| --------------------- | ------- | ------------------------------------------- |
| `maxRoomDisplayCount`          | `3`     | Max rooms shown to client per search        |
| `loyaltyPointsPerSAR`          | `1`     | Points earned per SAR spent                 |
| `loyaltyPointValue`            | `0.5`   | SAR value of 1 loyalty point when redeeming |
| `vatRate`                      | `0.15`  | 15% VAT                                     |
| `defaultCurrency`              | `"SAR"` | System currency                             |
| `bookingRefPrefix`             | `"CH"`  | Booking reference prefix                    |
| `pendingBookingExpiryMinutes`  | `15`    | Minutes before a pending pay_now booking expires |

---

## 5. User Roles & Permissions (RBAC)

### Role Hierarchy

```
admin → full access (hardcoded, not permission-based)
staff → custom permissions per user
client → fixed guest capabilities
```

### Permission Keys

Permissions are **granular actions** assigned to staff users.

```js
const PERMISSIONS = {
  // Bookings
  BOOKING_VIEW: "booking:view",
  BOOKING_CREATE: "booking:create",
  BOOKING_EDIT: "booking:edit",
  BOOKING_CANCEL: "booking:cancel",
  BOOKING_CHECKIN: "booking:check_in",
  BOOKING_CHECKOUT: "booking:check_out",

  // Rooms
  ROOM_VIEW: "room:view",
  ROOM_CREATE: "room:create",
  ROOM_EDIT: "room:edit",
  ROOM_DELETE: "room:delete",
  ROOM_PRICING: "room:pricing",
  ROOM_AVAILABILITY: "room:availability",

  // Users
  USER_VIEW: "user:view",
  USER_CREATE: "user:create",
  USER_EDIT: "user:edit",
  USER_DELETE: "user:delete",
  USER_PERMISSIONS: "user:permissions",

  // Loyalty
  LOYALTY_VIEW: "loyalty:view",
  LOYALTY_ADJUST: "loyalty:adjust",

  // Payments
  PAYMENT_VIEW: "payment:view",
  PAYMENT_REFUND: "payment:refund",

  // Reports
  REPORT_VIEW: "report:view",

  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_EDIT: "settings:edit",

  // Uploads
  UPLOAD_CREATE: "upload:create",
  UPLOAD_DELETE: "upload:delete",
};
```

### How It Works

1. Admin creates a staff user and assigns specific permission keys.
2. Every protected route has a `requirePermission("booking:view")` middleware.
3. Admin bypasses all permission checks (hardcoded).
4. Clients have a fixed set of capabilities (book, view own bookings, manage own profile, view/redeem points).

---

## 6. Auth Module

### Endpoints

| Method | Path                        | Access        | Description                          |
| ------ | --------------------------- | ------------- | ------------------------------------ |
| `POST` | `/api/auth/register`        | Public        | Client registration (email or phone) |
| `POST` | `/api/auth/login`           | Public        | Login (email/phone + password)       |
| `POST` | `/api/auth/refresh`         | Public        | Refresh access token                 |
| `POST` | `/api/auth/logout`          | Authenticated | Invalidate refresh token             |
| `POST` | `/api/auth/forgot-password` | Public        | Send reset link/code                 |
| `POST` | `/api/auth/reset-password`  | Public        | Reset password with token            |

### Token Strategy

- **Access Token**: JWT, 15-minute expiry, stored in memory (client-side).
- **Refresh Token**: JWT, 7-day expiry, stored in httpOnly cookie + DB.
- Payload: `{ userId, role, permissions[] }`

### Registration Flow

1. Client submits email or phone + password + name.
2. Server creates user with `role: "client"`, `isActive: true`.
3. Auto-authorized — no email verification required (per spec).
4. Returns access + refresh tokens.

---

## 7. Room Management Module

### 7.1 Room Types CRUD

| Method   | Path                   | Access                | Description                |
| -------- | ---------------------- | --------------------- | -------------------------- |
| `POST`   | `/api/rooms/types`     | Admin / `room:create` | Create room type           |
| `GET`    | `/api/rooms/types`     | Public                | List all active room types |
| `GET`    | `/api/rooms/types/:id` | Public                | Get room type details      |
| `PUT`    | `/api/rooms/types/:id` | Admin / `room:edit`   | Update room type           |
| `DELETE` | `/api/rooms/types/:id` | Admin / `room:delete` | Soft-delete room type      |

### What Admin Configures Per Room Type

| Field                 | Example                                                               |
| --------------------- | --------------------------------------------------------------------- |
| Name (en/ar)          | "Deluxe Pool View Room" / "غرفة ديلوكس بإطلالة المسبح"                |
| Description (en/ar)   | Rich text description                                                 |
| Max Guests            | 3                                                                     |
| Beds                  | 1× King, 1× Sofa Bed                                                  |
| Amenities             | Air conditioning, Private bathroom, Refrigerator, Kettle, WiFi        |
| Views                 | Pool View                                                             |
| Images                | Multiple, ordered, with alt text                                      |
| Base Price            | 500 SAR/night                                                         |
| Total Room Count      | 5 rooms of this type                                                  |
| Reservation Options   | Room Only (+0), Breakfast (+80), Half Board (+150), Full Board (+250) |
| Cancellation Policies | Free Cancel until 3 days before (+20), Non-Refundable (-30)           |
| Payment Options       | Pay Now (-15), Pay at Hotel (+0)                                      |

### 7.2 Room Pricing

| Method | Path                             | Access                 | Description                          |
| ------ | -------------------------------- | ---------------------- | ------------------------------------ |
| `GET`  | `/api/rooms/pricing/:roomTypeId` | Admin / `room:pricing` | Get pricing calendar for a room type |
| `PUT`  | `/api/rooms/pricing/:roomTypeId` | Admin / `room:pricing` | Bulk set/update daily prices         |

#### Bulk Pricing Update — Request Body

```json
{
  "roomTypeId": "...",
  "startDate": "2026-04-01",
  "endDate": "2026-04-30",
  "price": 650
}
```

This upserts one `room_pricing` document per date in the range.

#### Price Resolution Logic

```
For a given roomType + date:
  1. Check room_pricing for (roomType, date)
  2. If found → use that price
  3. If not found → use room_types.basePrice
```

### 7.3 Room Availability

| Method | Path                                  | Access                      | Description                                   |
| ------ | ------------------------------------- | --------------------------- | --------------------------------------------- |
| `GET`  | `/api/rooms/availability/:roomTypeId` | Admin / `room:availability` | Get availability calendar                     |
| `PUT`  | `/api/rooms/availability/:roomTypeId` | Admin / `room:availability` | Bulk set availability / block dates           |
| `GET`  | `/api/rooms/availability/search`      | Public                      | Search available rooms (used by booking flow) |

#### Availability Logic

```
For a given roomType + date:
  available = totalRooms - bookedRooms
  if (isBlocked) available = 0
```

A room type is available for a check-in/check-out range only if **every night** in the range has `available > 0`.

---

## 8. Booking Module

### Client-Facing Flow (How Guests Book)

```
Step 1: SEARCH
  Client enters: checkIn, checkOut, guestCount
  → GET /api/bookings/search?checkIn=...&checkOut=...&guests=...

Step 2: RESULTS
  Server returns available room types (max 2–3 per system setting)
  Each result includes:
    - Room type info (name, description, images, beds, amenities, views)
    - Nightly rates for the date range
    - Reservation options with computed prices
    - Cancellation policies with computed prices
    - Payment options with computed prices

Step 3: SELECT
  Client selects a room type + reservation option + cancellation policy + payment option
  Client enters guest details

Step 4: PRICE CONFIRMATION
  → POST /api/bookings/calculate
  Server returns final price breakdown (no booking created yet)

Step 5: BOOK
  → POST /api/bookings
  Server creates booking with status "pending", decrements availability
  If paymentOption is "pay_now" → redirect to payment
  If paymentOption is "pay_at_hotel" → status becomes "confirmed"

Step 6: PAYMENT (if pay_now)
  → POST /api/payments
  On success → booking status becomes "confirmed"
  On failure → booking stays "pending" (with timeout/expiry logic)
```

### Endpoints

| Method  | Path                       | Access                 | Description                               |
| ------- | -------------------------- | ---------------------- | ----------------------------------------- |
| `GET`   | `/api/bookings/search`     | Public                 | Search available rooms for dates + guests |
| `POST`  | `/api/bookings/calculate`  | Public                 | Calculate price breakdown without booking |
| `POST`  | `/api/bookings`            | Client                 | Create a booking                          |
| `GET`   | `/api/bookings`            | Staff / Admin          | List all bookings (with filters)          |
| `GET`   | `/api/bookings/my`         | Client                 | List own bookings                         |
| `GET`   | `/api/bookings/:id`        | Owner / Staff / Admin  | Get booking details                       |
| `PATCH` | `/api/bookings/:id/status` | Staff / Admin          | Update booking status                     |
| `PATCH` | `/api/bookings/:id/cancel` | Client / Staff / Admin | Cancel booking                            |

### Search Response Shape

```json
{
  "results": [
    {
      "roomType": {
        "_id": "...",
        "name": { "en": "Deluxe Pool View", "ar": "..." },
        "description": { "en": "...", "ar": "..." },
        "maxGuests": 3,
        "beds": [{ "type": "king", "count": 1 }, { "type": "sofa_bed", "count": 1 }],
        "amenities": ["air_conditioning", "private_bathroom", "refrigerator", "kettle"],
        "views": ["pool_view"],
        "images": [{ "url": "...", "alt": {...}, "order": 1 }]
      },
      "nightlyRates": [
        { "date": "2026-04-01", "price": 650 },
        { "date": "2026-04-02", "price": 650 },
        { "date": "2026-04-03", "price": 700 }
      ],
      "totalBasePrice": 2000,
      "availableRooms": 2,
      "reservationOptions": [
        { "type": "room_only", "label": {...}, "pricePerNight": 0, "totalModifier": 0 },
        { "type": "breakfast", "label": {...}, "pricePerNight": 80, "totalModifier": 240 },
        { "type": "half_board", "label": {...}, "pricePerNight": 150, "totalModifier": 450 },
        { "type": "full_board", "label": {...}, "pricePerNight": 250, "totalModifier": 750 }
      ],
      "cancellationPolicies": [
        { "type": "free_cancellation", "label": {...}, "deadline": "2026-03-29", "pricePerNight": 20, "totalModifier": 60 },
        { "type": "non_refundable", "label": {...}, "pricePerNight": -30, "totalModifier": -90 }
      ],
      "paymentOptions": [
        { "type": "pay_now", "label": {...}, "pricePerNight": -15, "totalModifier": -45 },
        { "type": "pay_at_hotel", "label": {...}, "pricePerNight": 0, "totalModifier": 0 }
      ]
    }
  ],
  "searchParams": {
    "checkIn": "2026-04-01",
    "checkOut": "2026-04-04",
    "guests": 2,
    "nights": 3
  }
}
```

### Final Price Calculation

```
finalPricePerNight[i] =
    nightlyRate[i]
  + reservationOption.priceModifier
  + cancellationPolicy.priceModifier
  + paymentOption.priceModifier

subtotal = SUM(finalPricePerNight[0..n])
loyaltyDiscount = pointsUsed × pointValue
taxes = (subtotal - loyaltyDiscount) × vatRate
grandTotal = subtotal - loyaltyDiscount + taxes
```

---

### 8A. Booking Expiry (Pending Timeout)

When a booking is created with `paymentOption: "pay_now"`, it is created with `status: "pending"`. If the client abandons the payment flow, the booking must expire automatically.

**Rules:**

| Setting               | Value     | Configurable? |
| --------------------- | --------- | ------------- |
| Pending expiry window | 15 minutes | Yes — `pendingBookingExpiryMinutes` in `system_settings` |

**Expiry Mechanism:**

- Store `expiresAt: Date` on every `pending` booking (`createdAt + expiryWindow`).
- A background job (Node.js `setInterval` or a cron via `node-cron`) runs every 5 minutes and queries:
  ```js
  Booking.find({ status: "pending", expiresAt: { $lt: new Date() } })
  ```
- For each expired booking:
  1. Set `status: "expired"` (add `expired` to the booking status enum).
  2. **Decrement** `bookedRooms` on every `room_availability` document for each night in the booking range (inside a transaction).
  3. Log a `statusHistory` entry with `changedBy: system`.
  4. No notification is sent unless the client is logged in (optional: send a "your booking expired" email).

**Note**: `pay_at_hotel` bookings skip expiry — they become `confirmed` immediately and do not have an `expiresAt`.

---

### 8B. Staff Manual Booking (Walk-in / Phone Reservation)

Staff must be able to create bookings on behalf of guests — for walk-ins, phone calls, or offline reservations.

**Access**: Staff with `booking:create` permission. Admin always.

**Endpoint:**

| Method | Path                    | Access                   | Description                    |
| ------ | ----------------------- | ------------------------ | ------------------------------ |
| `POST` | `/api/bookings/manual`  | Admin / `booking:create` | Create booking on behalf of guest |

**Differences from client self-booking:**

| Aspect              | Client Self-Book              | Staff Manual Book                     |
| ------------------- | ----------------------------- | ------------------------------------- |
| `createdBy`         | The client's own `userId`     | The staff member's `userId`           |
| Payment             | Online payment or pay-at-hotel | Can mark as "pay_at_hotel" or "paid_offline" |
| Guest details       | Taken from logged-in profile  | Staff enters manually (name, phone, email) |
| Client account      | Must be logged in             | Guest may not have an account — `clientId` can be null; `guestDetails` is required |
| Loyalty points      | Can redeem                    | Staff can optionally apply points if client account exists |

**New payment option for manual bookings**: `paid_offline` — used when cash or POS payment was collected in person. When this is selected, `paymentStatus` is set to `"paid"` and `status` to `"confirmed"` immediately.

---

### 8C. Pay at Hotel — Confirmation & Payment Tracking

When a guest selects `pay_at_hotel`, the booking is immediately `confirmed` but `paymentStatus` remains `"pending"`.

**Staff must close the payment loop:**

1. At check-in or check-out, staff marks the payment as received.
2. This is done via the dashboard or the PATCH status endpoint.
3. `paymentStatus` transitions to `"paid"` and a `payments` document is created with `method: "pay_at_hotel"` and `gateway: "offline"`.

**If the guest doesn't pay:**
- Staff can mark the booking as `no_show` or flag the payment as `"failed"`.
- Admin can then decide to pursue or write off.

This flow must be clearly surfaced in the staff dashboard: **any confirmed booking with `paymentStatus: "pending"` and `paymentOption: "pay_at_hotel"` should be highlighted as "Awaiting Payment".**

---

## 9. Pricing Engine

The pricing engine is a **shared service** used by the booking module.

### Inputs

| Input                   | Source                  |
| ----------------------- | ----------------------- |
| `roomTypeId`            | Client selection        |
| `checkIn` / `checkOut`  | Client search           |
| `reservationOption`     | Client selection        |
| `cancellationPolicy`    | Client selection        |
| `paymentOption`         | Client selection        |
| `loyaltyPointsToRedeem` | Client input (optional) |

### Algorithm

```
1. Fetch room_type
2. For each night in [checkIn, checkOut):
     a. Look up room_pricing(roomType, date) → price, or fallback to basePrice
     b. Add reservationOption.priceModifier
     c. Add cancellationPolicy.priceModifier
     d. Add paymentOption.priceModifier
     e. → nightlyTotal
3. subtotal = SUM(nightlyTotals)
4. loyaltyDiscount = min(pointsToRedeem × pointValue, subtotal)
5. taxableAmount = subtotal - loyaltyDiscount
6. taxes = taxableAmount × vatRate
7. grandTotal = taxableAmount + taxes
8. Return priceBreakdown object
```

---

## 10. Loyalty Module

### How Points Work

| Concept           | Rule                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Earning           | Points are earned when booking status transitions to `checked_out`. NOT on confirmation. |
| Earning Rate      | `grandTotal × loyaltyPointsPerSAR` points (rounded down to nearest integer) |
| Redeeming         | During booking, client can apply N points. Discount = `N × loyaltyPointValue` SAR                      |
| Manual Adjustment | Admin can add/subtract points for any client                                                           |
| Balance           | Stored on `users.loyaltyPoints`, audited in `loyalty_ledger`                                           |

### Edge Cases

| Scenario | Behaviour |
| --- | --- |
| Booking is cancelled before check-in | No points are earned. If points were **redeemed** at booking time, they are **refunded** back to the client's balance immediately on cancellation. A `loyalty_ledger` entry with `type: "adjust"` is created. |
| Guest is a `no_show` | No points are earned. Redeemed points are **not** refunded (the room was held). Admin can override manually. |
| Booking is partially cancelled (date change) | Points are recalculated on the new `grandTotal`. Any previously redeemed points are re-evaluated; difference is refunded or charged. |
| Manual adjustment by admin | Creates a `loyalty_ledger` entry with `type: "adjust"`, `createdBy: adminId`, and a required `description`. |
| Point redemption cap | Client cannot redeem more points than the booking's `subtotal` (before tax). `loyaltyDiscount ≤ subtotal`. |

### Endpoints

| Method | Path                           | Access                   | Description                        |
| ------ | ------------------------------ | ------------------------ | ---------------------------------- |
| `GET`  | `/api/loyalty/balance`         | Client                   | Get own points balance             |
| `GET`  | `/api/loyalty/history`         | Client                   | Get own points transaction history |
| `GET`  | `/api/loyalty/admin/:clientId` | Admin / `loyalty:view`   | Get client's points data           |
| `POST` | `/api/loyalty/admin/adjust`    | Admin / `loyalty:adjust` | Manually adjust points             |

---

## 11. Payment Module

### Supported Gateway

Use a Saudi-friendly payment gateway (e.g., **Moyasar**, **Tap**, or **HyperPay**).

### Flow

```
1. Client chooses "pay_now" → booking created with status "pending"
2. Frontend receives payment session/URL from backend
3. Client completes payment on gateway
4. Gateway sends webhook → backend verifies
5. On success: booking.paymentStatus = "paid", booking.status = "confirmed"
6. On failure: booking.paymentStatus = "failed"
```

### Endpoints

| Method | Path                              | Access                   | Description           |
| ------ | --------------------------------- | ------------------------ | --------------------- |
| `POST` | `/api/payments/initiate`          | Client                   | Start payment session |
| `POST` | `/api/payments/webhook`           | Gateway                  | Webhook callback      |
| `GET`  | `/api/payments/:bookingId`        | Owner / Staff / Admin    | Get payment status    |
| `POST` | `/api/payments/:paymentId/refund` | Admin / `payment:refund` | Process refund        |
| `GET`  | `/api/payments`                   | Admin / `payment:view`   | List all transactions |

---

---

## 12. Reports Module

The reports module provides read-only analytics endpoints for admin and authorized staff.

**Access**: Admin always. Staff with `report:view` permission.

### 12.1 Available Reports

#### Occupancy Report

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/reports/occupancy` | Daily occupancy rate per room type for a date range |

**Query Params**: `startDate`, `endDate`, `roomTypeId` (optional)

**Response Shape**:
```json
{
  "data": [
    {
      "date": "2026-04-01",
      "roomType": { "_id": "...", "name": { "en": "Deluxe Pool View" } },
      "totalRooms": 5,
      "bookedRooms": 4,
      "occupancyRate": 0.80
    }
  ]
}
```

#### Revenue Report

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/reports/revenue` | Total revenue grouped by day/week/month for a date range |

**Query Params**: `startDate`, `endDate`, `groupBy` (`day` | `week` | `month`)

Revenue is calculated from `bookings` where `paymentStatus: "paid"` and `status` is `confirmed`, `checked_in`, or `checked_out`.

#### Upcoming Arrivals

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/reports/arrivals` | All bookings with `checkIn` within the next N days |

**Query Params**: `days` (default: 7)

Returns a list of bookings with guest name, room type, check-in date, payment status. Primarily used by reception staff as a daily briefing.

#### Upcoming Departures

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/reports/departures` | All bookings with `checkOut` within the next N days |

**Query Params**: `days` (default: 1)

#### Booking Summary

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/reports/bookings-summary` | Count of bookings by status for a given period |

Returns counts for: `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`, `no_show`, `expired`.

### 12.2 Module Folder

```
src/modules/reports/
├── reports.route.js
├── reports.controller.js
└── reports.service.js
```

No model needed — this module queries other collections read-only.

---

## 13. Website / Marketing Module

Serves content for the public marketing pages.

### Pages

| Page     | Path        | Content                           |
| -------- | ----------- | --------------------------------- |
| Home     | `/`         | Hero, featured rooms, CTA to book |
| About    | `/about`    | Hotel story, facilities           |
| Services | `/services` | Amenities, dining, spa, etc.      |
| Contact  | `/contact`  | Map, phone, email, form           |
| Booking  | `/jeddah`   | Integrated search + booking flow  |

### Implementation Options

- **Option A**: Server-rendered pages (EJS / Pug templates) — simpler.
- **Option B**: Headless API + separate frontend (React/Next.js) — more flexible.

> **Decision: Option B — Headless API.**
>
> The backend exposes pure JSON API routes. The frontend (marketing site, booking flow, client portal, and admin dashboard) is a separate application — recommended stack: **Next.js** (handles SSR for SEO on public pages, SPA behaviour for the dashboard). This is the right call because:
> - The booking flow and dashboard are already designed as API-first.
> - Next.js SSR satisfies SEO needs for the marketing pages.
> - A clean frontend/backend separation makes it easier to hand off to specialised developers.
> - RTL/LTR bilingual layout is much cleaner to manage in a modern frontend framework.
>
> The backend does **not** serve any HTML. All frontend routes are handled by the Next.js app.

All content must be **bilingual** (see Section 16).

---

## 14. Notification Module

### Triggers

| Event                            | Channel     | Recipient      |
| -------------------------------- | ----------- | -------------- |
| Booking Created                  | Email + SMS | Client         |
| Booking Confirmed                | Email       | Client         |
| Booking Cancelled                | Email       | Client + Admin |
| Check-in Reminder (1 day before) | Email + SMS | Client         |
| Payment Received                 | Email       | Client         |
| Points Earned                    | Email       | Client         |

### Implementation

- Use a queue-like pattern (even if simple — e.g., `setTimeout` or a `notifications` collection that a worker processes).
- Email: Nodemailer + SMTP or a service (SendGrid, Mailgun).
- SMS: Twilio or a local Saudi provider (e.g., Unifonic).

---

## 15. File Upload Module

### Usage

- Room type images (multiple per room type).
- User avatars (optional).

### Endpoints

| Method   | Path               | Access                             | Description    |
| -------- | ------------------ | ---------------------------------- | -------------- |
| `POST`   | `/api/uploads`     | Admin / Staff with `upload:create` | Upload file(s) |
| `DELETE` | `/api/uploads/:id` | Admin / `upload:delete`            | Delete file    |

### Storage

- **Development**: Local filesystem (`/uploads` directory).
- **Production**: Cloud storage (AWS S3 or Cloudinary).
- Store the URL in the database, not the file itself.

---

## 16. Internationalization (i18n)

### Strategy

- All user-facing text fields in the database use `{ en: String, ar: String }` objects.
- API request header: `Accept-Language: ar` or `Accept-Language: en`.
- API response middleware can optionally flatten `{ en, ar }` → single string based on the header.
- Frontend handles RTL layout when `ar` is active.

### Affected Fields

- Room type: `name`, `description`, image `alt` text
- Reservation option labels
- Cancellation policy labels
- Payment option labels
- Loyalty ledger descriptions
- Notification templates

---

## 17. API Conventions

### Base URL

```
/api/v1/...
```

### Response Format

**Success**:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

**Error**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check-in date must be before check-out date",
    "details": [...]
  }
}
```

### Pagination

Query params: `?page=1&limit=20`

### Filtering & Sorting

Query params: `?status=confirmed&sort=-createdAt`

### HTTP Status Codes

| Code  | Usage                               |
| ----- | ----------------------------------- |
| `200` | Successful GET / PATCH              |
| `201` | Successful POST (created)           |
| `204` | Successful DELETE                   |
| `400` | Validation error                    |
| `401` | Not authenticated                   |
| `403` | Not authorized (permission denied)  |
| `404` | Resource not found                  |
| `409` | Conflict (e.g., room not available) |
| `500` | Internal server error               |

---

## 18. Folder Structure

```
Charlie-Hotel/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.route.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.validator.js
│   │   │   └── auth.model.js          ← (uses user model, may not need own)
│   │   │
│   │   ├── user/
│   │   │   ├── user.route.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   ├── user.validator.js
│   │   │   └── user.model.js
│   │   │
│   │   ├── permission/
│   │   │   ├── permission.route.js
│   │   │   ├── permission.controller.js
│   │   │   ├── permission.service.js
│   │   │   └── permission.constants.js
│   │   │
│   │   ├── room/
│   │   │   ├── room.route.js
│   │   │   ├── room.controller.js
│   │   │   ├── room.service.js
│   │   │   ├── room.validator.js
│   │   │   ├── roomType.model.js
│   │   │   ├── roomPricing.model.js
│   │   │   └── roomAvailability.model.js
│   │   │
│   │   ├── booking/
│   │   │   ├── booking.route.js
│   │   │   ├── booking.controller.js
│   │   │   ├── booking.service.js
│   │   │   ├── booking.validator.js
│   │   │   └── booking.model.js
│   │   │
│   │   ├── pricing/
│   │   │   └── pricing.service.js      ← shared pricing engine
│   │   │
│   │   ├── loyalty/
│   │   │   ├── loyalty.route.js
│   │   │   ├── loyalty.controller.js
│   │   │   ├── loyalty.service.js
│   │   │   ├── loyalty.validator.js
│   │   │   └── loyaltyLedger.model.js
│   │   │
│   │   ├── payment/
│   │   │   ├── payment.route.js
│   │   │   ├── payment.controller.js
│   │   │   ├── payment.service.js
│   │   │   ├── payment.validator.js
│   │   │   └── payment.model.js
│   │   │
│   │   ├── notification/
│   │   │   ├── notification.service.js
│   │   │   └── templates/
│   │   │       ├── bookingConfirmation.hbs
│   │   │       └── ...
│   │   │
│   │   ├── upload/
│   │   │   ├── upload.route.js
│   │   │   ├── upload.controller.js
│   │   │   └── upload.service.js
│   │   │
│   │   ├── reports/
│   │   │   ├── reports.route.js
│   │   │   ├── reports.controller.js
│   │   │   └── reports.service.js
│   │   │
│   │   ├── settings/
│   │       ├── settings.route.js
│   │       ├── settings.controller.js
│   │       ├── settings.service.js
│   │       └── settings.model.js
│   │
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── authenticate.js        ← JWT verification
│   │   │   ├── authorize.js           ← RBAC permission check
│   │   │   ├── errorHandler.js        ← centralized error handler
│   │   │   ├── validate.js            ← Joi validation runner
│   │   │   ├── i18n.js                ← language detection middleware
│   │   │   └── rateLimiter.js
│   │   │
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   ├── enums.js
│   │   │   ├── helpers.js
│   │   │   ├── dateUtils.js
│   │   │   ├── bookingRefGenerator.js
│   │   │   └── responseFormatter.js
│   │   │
│   │   ├── errors/
│   │   │   ├── AppError.js
│   │   │   ├── NotFoundError.js
│   │   │   ├── ValidationError.js
│   │   │   └── AuthorizationError.js
│   │   │
│   │   └── config/
│   │       ├── db.js                   ← MongoDB connection
│   │       ├── env.js                  ← env vars loader
│   │       └── logger.js
│   │
│   ├── app.js                          ← Express app setup
│   └── server.js                       ← Entry point, starts server
│
├── .env.example
├── .gitignore
├── package.json
├── SYSTEM_DESIGN.md                    ← this file
└── README.md
```

---

## 19. Environment & Configuration

### Required Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/charlie-hotel

# JWT
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Payment Gateway
PAYMENT_GATEWAY=moyasar
PAYMENT_API_KEY=...
PAYMENT_SECRET_KEY=...
PAYMENT_WEBHOOK_SECRET=...

# File Upload
UPLOAD_PROVIDER=local          # local | s3 | cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Notifications
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMS_PROVIDER=unifonic
SMS_API_KEY=...

# General
DEFAULT_LANGUAGE=ar
FRONTEND_URL=https://charlie.com
```

---

## 20. Glossary

| Term                    | Definition                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Room Type**           | A category of room (e.g., "Deluxe Pool View"). Multiple physical rooms can be of the same type.                              |
| **Base Price**          | Default per-night price for a room type when no daily override exists.                                                       |
| **Nightly Rate**        | The actual price for a specific room type on a specific date (override or base).                                             |
| **Price Modifier**      | A positive or negative amount added to the nightly rate based on reservation option, cancellation policy, or payment option. |
| **Reservation Option**  | Meal plan included with the stay (room only, breakfast, half board, full board).                                             |
| **Cancellation Policy** | Rules about cancelling — may affect price (non-refundable is cheaper).                                                       |
| **Payment Option**      | When the guest pays — pay now (may be cheaper) or pay at hotel.                                                              |
| **Inventory**           | The count of available rooms of a given type on a given date.                                                                |
| **Loyalty Points**      | Reward currency earned from bookings, redeemable for discounts.                                                              |
| **RBAC**                | Role-Based Access Control — permission system for staff users.                                                               |
| **Booking Ref**         | Human-readable booking identifier (e.g., `CH-20260301-A7K2`).                                                                |
| **Pending Expiry**      | A pay_now booking that was never completed by the client. Auto-cancelled after `pendingBookingExpiryMinutes`. Inventory is restored. |
| **Manual Booking**      | A booking created by staff on behalf of a guest (walk-in, phone, offline). May have no client account attached. |
| **Paid Offline**        | Payment method used for manual bookings where cash or POS was collected in person by staff. |
| **Awaiting Payment**    | A confirmed pay-at-hotel booking where `paymentStatus` is still `"pending"`. Staff must collect and record payment on arrival/departure. |

---

## Appendix A: Booking Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT BOOKING FLOW                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │  SEARCH  │───▶│ RESULTS  │───▶│  SELECT  │───▶│ REVIEW │ │
│  │ dates +  │    │ room     │    │ room +   │    │ price  │ │
│  │ guests   │    │ options  │    │ options  │    │ summary│ │
│  └─────────┘    └──────────┘    └──────────┘    └───┬────┘ │
│                                                      │      │
│                      ┌───────────────────────────────┘      │
│                      │                                       │
│                      ▼                                       │
│               ┌──────────────┐                              │
│               │   CONFIRM    │                              │
│               │  + PAYMENT   │                              │
│               └──────┬───────┘                              │
│                      │                                       │
│           ┌──────────┴──────────┐                           │
│           │                     │                            │
│     Pay Now              Pay at Hotel                       │
│           │                     │                            │
│     ┌─────▼─────┐        ┌─────▼─────┐                     │
│     │  Payment  │        │ Confirmed │                      │
│     │  Gateway  │        │  Booking  │                      │
│     └─────┬─────┘        └───────────┘                      │
│           │                                                  │
│     ┌─────▼─────┐                                           │
│     │ Confirmed │                                           │
│     │  Booking  │                                           │
│     └───────────┘                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Room Search & Price Matrix Example

**Scenario**: Client searches for 2 guests, April 1–4 (3 nights)

| Room Type        | Night 1 (Apr 1) | Night 2 (Apr 2) | Night 3 (Apr 3) | Base Total |
| ---------------- | --------------- | --------------- | --------------- | ---------- |
| Deluxe Pool View | 650             | 650             | 700             | 2,000      |

**Options Matrix**:

| Reservation       | Cancellation         | Payment           | Modifier/Night | 3-Night Total | Grand Total |
| ----------------- | -------------------- | ----------------- | -------------- | ------------- | ----------- |
| Room Only (+0)    | Free Cancel (+20)    | Pay Now (-15)     | +5             | +15           | 2,015       |
| Room Only (+0)    | Non-Refundable (-30) | Pay Now (-15)     | -45            | -135          | 1,865       |
| Breakfast (+80)   | Free Cancel (+20)    | Pay at Hotel (+0) | +100           | +300          | 2,300       |
| Full Board (+250) | Non-Refundable (-30) | Pay Now (-15)     | +205           | +615          | 2,615       |

_All prices before VAT & loyalty discounts._

---

> **End of Document** — This file is the single source of truth for the Charlie Hotel project. All modules, APIs, and database schemas should be implemented according to this specification.

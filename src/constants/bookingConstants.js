// src/constants/bookingConstants.js

// Booking Status values
export const BOOKING_STATUS = {
    PENDING: "pending",          // initial state when booking created
    ARRIVED: "arrived",          // when customer arrives
    COMPLETED: "completed",      // job finished
    CANCELLED: "cancelled",      // booking cancelled
};

// Allowed sorting fields for list API
export const BOOKING_SORT_FIELDS = [
    "createdAt",
    "updatedAt",
    "scheduledDate",
    "ownerName",
    "vehicleRegNo",
    "status",
];

// Cost defaults
export const DEFAULT_COSTS = {
    labourCost: 0,
    partsCost: 0,
    bookingPrice: 0,
    prebookingLabourCost: 0,
    prebookingPartsCost: 0,
    prebookingBookingPrice: 0,
};

// Validation constants
export const VALIDATION_LIMITS = {
    remarksMaxLength: 500,
    ownerNameMaxLength: 100,
    ownerAddressMaxLength: 250,
    ownerPostalCodeMaxLength: 20,  // ✅ NEW
};

// Centralized population config for Booking queries
export const BOOKING_POPULATE = [
    { path: "prebookingServices", select: "name" },
    { path: "services", select: "name" },
    { path: "parts", select: "partName partNumber" },
    { path: "upsells.services", select: "name" },
    { path: "upsells.parts", select: "partName partNumber" },
    { path: "createdBy updatedBy arrivedBy completedBy cancelledBy", select: "name email" },
];

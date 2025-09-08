// src/utils/bookingHelpers.js

/**
 * Normalize items to array of string IDs
 */
const normalize = (items) =>
    (items || []).map((item) => (item?._id ? item._id.toString() : item.toString()));

/**
 * Compute totals for a booking:
 * - Labour cost
 * - Parts cost
 * - Booking price
 * - Deduplicate services and parts
 */
export async function computeTotals(booking) {
    const prebookingLabour = booking.prebookingLabourCost || 0;
    const prebookingParts = booking.prebookingPartsCost || 0;
    const prebookingPrice = booking.prebookingBookingPrice || 0;
    const prebookingServices = new Set(normalize(booking.prebookingServices));

    let totalLabour = prebookingLabour;
    let totalParts = prebookingParts;
    let totalBookingPrice = prebookingPrice;
    let allServices = prebookingServices;
    let allParts = new Set();

    for (const upsell of booking.upsells || []) {
        totalLabour += upsell.labourCost || 0;
        totalParts += upsell.partsCost || 0;
        totalBookingPrice += upsell.upsellPrice || 0;

        normalize(upsell.services).forEach((s) => allServices.add(s));
        normalize(upsell.parts).forEach((p) => allParts.add(p));
    }

    booking.services = Array.from(allServices);
    booking.parts = Array.from(allParts);
    booking.labourCost = totalLabour;
    booking.partsCost = totalParts;
    booking.bookingPrice = totalBookingPrice;

    return booking;
}

/**
 * Save booking after computing totals
 */
export async function saveWithCalculations(booking) {
    await computeTotals(booking);
    return booking.save();
}

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

    let totalLabour = prebookingLabour;
    let totalParts = prebookingParts;
    let upsellsPrice = 0;

    const allServices = new Set(normalize(booking.prebookingServices));
    const allParts = new Set(normalize(booking.parts));

    normalize(booking.services).forEach((s) => allServices.add(s));

    for (const upsell of booking.upsells || []) {
        totalLabour += upsell.labourCost || 0;
        totalParts += upsell.partsCost || 0;
        upsellsPrice += upsell.upsellPrice || 0;

        normalize(upsell.services).forEach((s) => allServices.add(s));
        normalize(upsell.parts).forEach((p) => allParts.add(p));
    }

    booking.services = Array.from(allServices);
    booking.parts = Array.from(allParts);
    booking.labourCost = totalLabour;
    booking.partsCost = totalParts;
    booking.bookingPrice = prebookingPrice + upsellsPrice;

    return booking;
}

/**
 * Save booking after computing totals
 */
export async function saveWithCalculations(booking) {
    await computeTotals(booking);
    return booking.save();
}

// Node/Mongoose context:
const distinct = await Booking.distinct('status');
console.log('Distinct statuses in DB:', distinct);

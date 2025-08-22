// src/routes/bookings.js
import express from 'express';
import mongoose from 'mongoose';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 🔐 Require auth for everything under this router
router.use(requireAuth);

// Helpers
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const allowedCreateFields = [
  'carRegNo', 'makeModel', 'clientName', 'clientAddress', 'phoneNumber',
  'scheduledArrivalDate', 'bookingPrice', 'labourCost', 'partsCost', 'services'
];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/** CREATE: Pre-booking (status=pending, preBookingDate=now) */
router.post('/', async (req, res) => {
  try {
    const data = pick(req.body || {}, allowedCreateFields);

    const required = ['carRegNo', 'makeModel', 'clientName', 'scheduledArrivalDate'];
    const missing = required.filter(f => !data[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });
    }

    if (data.scheduledArrivalDate) {
      data.scheduledArrivalDate = new Date(data.scheduledArrivalDate);
    }
    ['bookingPrice', 'labourCost', 'partsCost'].forEach(f => {
      if (data[f] != null) data[f] = Number(data[f]);
    });

    const doc = await Booking.create({
      ...data,
      status: BOOKING_STATUS.PENDING,
      createdBy: req.user?.id
    });

    const populated = await doc.populate('services');
    res.status(201).json({ ok: true, booking: populated });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create booking' });
  }
});

/** LIST: filterable */
router.get('/', async (req, res) => {
  try {
    const { status, regNo, from, to, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const q = {};
    if (status) q.status = status;
    if (regNo) q.carRegNo = { $regex: new RegExp(regNo, 'i') };
    if (from || to) {
      q.preBookingDate = {};
      if (from) q.preBookingDate.$gte = new Date(from);
      if (to) q.preBookingDate.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Booking.find(q).populate('services').sort(sort).skip(skip).limit(Number(limit)),
      Booking.countDocuments(q)
    ]);

    res.json({
      ok: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      items
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch bookings' });
  }
});

/** LIST only arrived bookings */
router.get('/status/arrived', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const q = { status: BOOKING_STATUS.ARRIVED };

    const [items, total] = await Promise.all([
      Booking.find(q).populate('services').sort(sort).skip(skip).limit(Number(limit)),
      Booking.countDocuments(q)
    ]);

    res.json({
      ok: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      items
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch arrived bookings' });
  }
});

/** GET by id */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

  const doc = await Booking.findById(id).populate('services');
  if (!doc) return res.status(404).json({ error: 'Not found' });

  res.json({ ok: true, booking: doc });
});

/** PATCH details (only while not complete/cancelled) */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const doc = await Booking.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if ([BOOKING_STATUS.COMPLETE, BOOKING_STATUS.CANCELLED].includes(doc.status)) {
      return res.status(400).json({ error: 'Cannot edit a completed or cancelled booking' });
    }

    const updates = pick(req.body || {}, [
      'carRegNo', 'makeModel', 'clientName', 'clientAddress', 'phoneNumber',
      'scheduledArrivalDate', 'bookingPrice', 'labourCost', 'partsCost', 'services'
    ]);

    if (updates.scheduledArrivalDate) {
      updates.scheduledArrivalDate = new Date(updates.scheduledArrivalDate);
    }
    ['bookingPrice', 'labourCost', 'partsCost'].forEach(f => {
      if (updates[f] != null) updates[f] = Number(updates[f]);
    });

    Object.assign(doc, updates, { updatedBy: req.user?.id });
    await doc.save();

    const populated = await doc.populate('services');
    res.json({ ok: true, booking: populated });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update booking' });
  }
});

/** STATUS TRANSITIONS */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!action) return res.status(400).json({ error: 'Missing action' });

    const doc = await Booking.findById(id).populate('services');
    if (!doc) return res.status(404).json({ error: 'Not found' });

    if ([BOOKING_STATUS.COMPLETE, BOOKING_STATUS.CANCELLED].includes(doc.status)) {
      return res.status(400).json({ error: `Cannot change status from ${doc.status}` });
    }

    const now = new Date();

    switch (action) {
      case 'confirm':
        if (doc.status !== BOOKING_STATUS.PENDING) {
          return res.status(400).json({ error: 'Only pending bookings can be confirmed' });
        }
        doc.status = BOOKING_STATUS.CONFIRMED;
        doc.confirmedAt = now;
        break;

      case 'arrive':
        if (![BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(doc.status)) {
          return res.status(400).json({ error: 'Only pending/confirmed bookings can arrive' });
        }
        doc.status = BOOKING_STATUS.ARRIVED;
        doc.arrivedAt = now;
        break;

      case 'complete':
        if (doc.status !== BOOKING_STATUS.ARRIVED) {
          return res.status(400).json({ error: 'Only arrived bookings can be completed' });
        }
        doc.status = BOOKING_STATUS.COMPLETE;
        doc.completedAt = now;
        break;

      case 'cancel':
        doc.status = BOOKING_STATUS.CANCELLED;
        doc.cancelledAt = now;
        break;

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

    doc.updatedBy = req.user?.id;
    await doc.save();
    const populated = await doc.populate('services'); // ensure response always has populated services
    res.json({ ok: true, booking: populated });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to change status' });
  }
});

export default router;

// src/controllers/bookingController.js
import mongoose from "mongoose";
import Booking, { BOOKING_STATUS } from "../models/Booking.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const allowedCreateFields = [
    "carRegNo",
    "makeModel",
    "clientName",
    "clientAddress",
    "phoneNumber",
    "scheduledArrivalDate",
    "bookingPrice",
    "labourCost",
    "partsCost",
    "services",
];

function pick(obj, keys) {
    const out = {};
    for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
    return out;
}

/** CREATE booking */
export async function createBooking(req, res) {
    try {
        const data = pick(req.body || {}, allowedCreateFields);

        const required = ["carRegNo", "makeModel", "clientName", "scheduledArrivalDate"];
        const missing = required.filter((f) => !data[f]);
        if (missing.length) {
            return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });
        }

        if (data.scheduledArrivalDate) {
            data.scheduledArrivalDate = new Date(data.scheduledArrivalDate);
        }
        ["bookingPrice", "labourCost", "partsCost"].forEach((f) => {
            if (data[f] != null) data[f] = Number(data[f]);
        });

        const doc = await Booking.create({
            ...data,
            status: BOOKING_STATUS.PENDING,
            createdBy: req.user?.id,
        });

        const populated = await doc.populate("services");
        res.status(201).json({ ok: true, booking: populated });
    } catch (err) {
        res.status(500).json({ error: err.message || "Failed to create booking" });
    }
}

/** LIST bookings with filters */
export async function listBookings(req, res) {
    try {
        const { status, regNo, from, to, page = 1, limit = 20, sort = "-createdAt" } = req.query;

        const q = {};
        if (status) q.status = status;
        if (regNo) q.carRegNo = { $regex: new RegExp(regNo, "i") };
        if (from || to) {
            q.scheduledArrivalDate = {};
            if (from) q.scheduledArrivalDate.$gte = new Date(from);
            if (to) q.scheduledArrivalDate.$lte = new Date(to);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
            Booking.find(q).populate("services").sort(sort).skip(skip).limit(Number(limit)),
            Booking.countDocuments(q),
        ]);

        res.json({
            ok: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            items,
        });
    } catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch bookings" });
    }
}

/** GET booking by id */
export async function getBookingById(req, res) {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid id" });

    const doc = await Booking.findById(id).populate("services");
    if (!doc) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true, booking: doc });
}

/** UPDATE booking */
export async function updateBooking(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid id" });

        const doc = await Booking.findById(id);
        if (!doc) return res.status(404).json({ error: "Not found" });
        if ([BOOKING_STATUS.COMPLETE, BOOKING_STATUS.CANCELLED].includes(doc.status)) {
            return res.status(400).json({ error: "Cannot edit a completed or cancelled booking" });
        }

        const updates = pick(req.body || {}, allowedCreateFields);
        if (updates.scheduledArrivalDate) {
            updates.scheduledArrivalDate = new Date(updates.scheduledArrivalDate);
        }
        ["bookingPrice", "labourCost", "partsCost"].forEach((f) => {
            if (updates[f] != null) updates[f] = Number(updates[f]);
        });

        Object.assign(doc, updates, { updatedBy: req.user?.id });
        await doc.save();

        const populated = await doc.populate("services");
        res.json({ ok: true, booking: populated });
    } catch (err) {
        res.status(500).json({ error: err.message || "Failed to update booking" });
    }
}

/** STATUS TRANSITIONS */
export async function updateBookingStatus(req, res) {
    try {
        const { id } = req.params;
        const { action } = req.body || {};

        if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid booking ID" });
        if (!action) return res.status(400).json({ error: "Missing action" });

        const doc = await Booking.findById(id).populate("services");
        if (!doc) return res.status(404).json({ error: "Booking not found" });

        const terminalStatuses = [BOOKING_STATUS.COMPLETE, BOOKING_STATUS.CANCELLED];
        if (terminalStatuses.includes(doc.status)) {
            return res.status(400).json({ error: `Cannot change status from ${doc.status}` });
        }

        const now = new Date();
        let message;

        switch (action) {
            case "arrived":
                if (doc.status === BOOKING_STATUS.ARRIVED) {
                    message = "Booking already arrived";
                    break;
                }
                if (doc.status !== BOOKING_STATUS.PENDING) {
                    throw new Error("Only pending bookings can be marked as arrived");
                }
                doc.status = BOOKING_STATUS.ARRIVED;
                doc.arrivedAt = now; // store current datetime
                message = "Booking marked as arrived";
                break;

            case "complete":
                if (doc.status === BOOKING_STATUS.COMPLETE) {
                    message = "Booking already completed";
                    break;
                }
                if (doc.status !== BOOKING_STATUS.ARRIVED) {
                    throw new Error("Only arrived bookings can be completed");
                }
                doc.status = BOOKING_STATUS.COMPLETE;
                doc.completedAt = now; // store current datetime
                message = "Booking marked as completed";
                break;

            case "cancel":
                if (doc.status === BOOKING_STATUS.CANCELLED) {
                    message = "Booking already cancelled";
                    break;
                }
                doc.status = BOOKING_STATUS.CANCELLED;
                doc.cancelledAt = now; // store current datetime
                message = "Booking cancelled";
                break;

            default:
                return res.status(400).json({ error: "Unknown action" });
        }

        doc.updatedBy = req.user?.id;
        await doc.save();

        const populated = await doc.populate("services");
        res.json({ ok: true, message, booking: populated });
    } catch (err) {
        res.status(400).json({ error: err.message || "Failed to change booking status" });
    }
}

const Booking = require('../models/Booking');
const Approval = require('../models/Approval');
const BookingService = require('../../services/BookingService');
const NotificationService = require('../../services/NotificationService');

class ApprovalController {
    // MVC View for pending approvals (Approver only)
    static async getQueue(req, res) {
        try {
            const bookings = await Booking.getPending();
            res.render('approvals/queue', { bookings, title: 'รายการรออนุมัติ - LPC Room Booking' });
        } catch (err) {
            console.error('Error loading approvals queue:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    // JSON APIs
    static async apiPostApprove(req, res) {
        const bookingId = req.params.id;
        const { note } = req.body;
        const approverId = req.session.userId;

        try {
            const booking = await Booking.findById(bookingId);
            if (!booking) {
                return res.status(404).json({ status: 404, message: 'ไม่พบรายการจองนี้' });
            }

            // If previously rejected or cancelled, check if room is still available before re-approving
            if (booking.approval_status === 'rejected' || booking.booking_status === 'cancelled') {
                const isAvailable = await BookingService.isRoomAvailable(booking.room_id, booking.meeting_date, booking.start_time, booking.end_time, bookingId);
                if (!isAvailable) {
                    return res.status(422).json({ status: 422, message: 'ไม่สามารถอนุมัติได้ เนื่องจากห้องประชุมไม่ว่างในช่วงเวลาดังกล่าว (มีผู้อื่นจองทับซ้อน)' });
                }
            }

            // Delete any existing approvals first (enables Editing/Overriding)
            await Approval.deleteByBookingId(bookingId);

            // Update status in bookings
            await Booking.updateApprovalStatus(bookingId, 'approved');
            await Booking.updateBookingStatus(bookingId, 'confirmed');

            // Log in approvals table
            await Approval.create(bookingId, approverId, 'approved', note || 'อนุมัติเรียบร้อย');

            // Log Audit
            await BookingService.logAudit(approverId, 'booking', 'approve', bookingId.toString(), req.ip);

            // Notify user
            await NotificationService.notify(
                booking.user_id,
                bookingId,
                'in-app',
                `คำขอจองห้องประชุม "${booking.title}" ของคุณได้รับการอนุมัติแล้ว`
            );
            await NotificationService.notify(
                booking.user_id,
                bookingId,
                'email',
                `คำขอจองห้องประชุม "${booking.title}" ของคุณได้รับการอนุมัติแล้ว`
            );

            res.json({ status: 200, message: 'อนุมัติรายการจองสำเร็จ' });
        } catch (err) {
            console.error('Error approving booking:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการทำรายการ' });
        }
    }

    static async apiPostReject(req, res) {
        const bookingId = req.params.id;
        const { note } = req.body;
        const approverId = req.session.userId;

        if (!note || note.trim() === '') {
            return res.status(400).json({ status: 400, message: 'โปรดระบุเหตุผลในการปฏิเสธการจอง' });
        }

        try {
            const booking = await Booking.findById(bookingId);
            if (!booking) {
                return res.status(404).json({ status: 404, message: 'ไม่พบรายการจองนี้' });
            }

            // Delete any existing approvals first (enables Editing/Overriding)
            await Approval.deleteByBookingId(bookingId);

            // Update status in bookings
            await Booking.updateApprovalStatus(bookingId, 'rejected');
            await Booking.updateBookingStatus(bookingId, 'cancelled');

            // Log in approvals table
            await Approval.create(bookingId, approverId, 'rejected', note);

            // Log Audit
            await BookingService.logAudit(approverId, 'booking', 'reject', bookingId.toString(), req.ip);

            // Notify user
            await NotificationService.notify(
                booking.user_id,
                bookingId,
                'in-app',
                `คำขอจองห้องประชุม "${booking.title}" ของคุณถูกปฏิเสธ: ${note}`
            );
            await NotificationService.notify(
                booking.user_id,
                bookingId,
                'email',
                `คำขอจองห้องประชุม "${booking.title}" ของคุณถูกปฏิเสธ: ${note}`
            );

            res.json({ status: 200, message: 'ปฏิเสธรายการจองสำเร็จ' });
        } catch (err) {
            console.error('Error rejecting booking:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการทำรายการ' });
        }
    }

    static async apiPostResetApproval(req, res) {
        const bookingId = req.params.id;
        const approverId = req.session.userId;

        try {
            const booking = await Booking.findById(bookingId);
            if (!booking) {
                return res.status(404).json({ status: 404, message: 'ไม่พบรายการจองนี้' });
            }

            // Reset statuses
            await Booking.updateApprovalStatus(bookingId, 'pending');
            await Booking.updateBookingStatus(bookingId, 'confirmed');

            // Delete approval decisions (enables deleting decisions)
            await Approval.deleteByBookingId(bookingId);

            // Log Audit
            await BookingService.logAudit(approverId, 'booking', 'reset_approval', bookingId.toString(), req.ip);

            // Notify user
            await NotificationService.notify(
                booking.user_id,
                bookingId,
                'in-app',
                `ผลการพิจารณาคำขอจองห้องประชุม "${booking.title}" ของคุณถูกลบ/รีเซ็ตกลับเป็นรอพิจารณา`
            );

            res.json({ status: 200, message: 'ลบผลการอนุมัติและรีเซ็ตสถานะเป็นรอพิจารณาเรียบร้อยแล้ว' });
        } catch (err) {
            console.error('Error resetting approval:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการรีเซ็ตสถานะคำขอ' });
        }
    }
}

module.exports = ApprovalController;

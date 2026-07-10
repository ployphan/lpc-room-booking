const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Approval = require('../models/Approval');
const BookingService = require('../../services/BookingService');
const NotificationService = require('../../services/NotificationService');

class BookingController {
    // MVC Views
    static async getCalendar(req, res) {
        try {
            const rooms = await Room.getActive();
            res.render('bookings/calendar', { rooms, title: 'ปฏิทินการจอง - LPC Room Booking' });
        } catch (err) {
            console.error('Error loading calendar:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    static async getNewForm(req, res) {
        try {
            const rooms = await Room.getActive();
            res.render('bookings/new', { rooms, error: null, title: 'จองห้องประชุมใหม่ - LPC Room Booking' });
        } catch (err) {
            console.error('Error loading new booking form:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    static async getMyBookings(req, res) {
        try {
            const bookings = await Booking.getByUserId(req.session.userId);
            res.render('bookings/my', { bookings, title: 'รายการจองของฉัน - LPC Room Booking' });
        } catch (err) {
            console.error('Error loading my bookings:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    static async getDetail(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) {
                return res.status(404).send('ไม่พบรายการจองนี้');
            }

            // Check authorization: Admin, Approver, or the owner User can view
            const isOwner = booking.user_id === req.session.userId;
            const isAdmin = req.session.user.role_name === 'admin';
            const isApprover = req.session.user.role_name === 'approver';

            if (!isOwner && !isAdmin && !isApprover) {
                return res.status(403).send('Forbidden: คุณไม่มีสิทธิ์ดูรายการจองนี้');
            }

            const attendees = await Booking.getAttendees(booking.id);
            const approvals = await Approval.getByBookingId(booking.id);
            const approvalDetail = approvals && approvals.length > 0 ? approvals[0] : null;
            res.render('bookings/detail', { booking, attendees, approvalDetail, title: 'รายละเอียดการจอง - LPC Room Booking' });
        } catch (err) {
            console.error('Error loading booking detail:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    // JSON API Endpoints
    static async apiGetAvailableRooms(req, res) {
        const { date, start, end } = req.query;

        if (!date || !start || !end) {
            return res.status(400).json({ status: 400, message: 'Missing parameters: date, start, end.' });
        }

        try {
            const rooms = await Room.getActive();
            const availableRooms = [];

            for (const room of rooms) {
                const isAvailable = await BookingService.isRoomAvailable(room.id, date, start, end);
                if (isAvailable) {
                    availableRooms.push(room);
                }
            }

            res.json({ status: 200, data: availableRooms });
        } catch (err) {
            console.error('Error checking available rooms:', err);
            res.status(500).json({ status: 500, message: 'Internal server error.' });
        }
    }

    static async apiPostBooking(req, res) {
        const { room_id, title, booker_name, booker_department, booker_phone, meeting_date, start_time, end_time, attendee_count, agenda, attendees } = req.body;
        const userId = req.session.userId;

        if (!room_id || !title || !meeting_date || !start_time || !end_time) {
            return res.status(400).json({ status: 400, message: 'โปรดกรอกข้อมูลสำคัญให้ครบถ้วน' });
        }

        try {
            // Check if booking is at least 3 days in advance
            const today = new Date();
            today.setHours(0,0,0,0);
            const bookingDate = new Date(meeting_date);
            bookingDate.setHours(0,0,0,0);
            
            const diffTime = bookingDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 3) {
                return res.status(400).json({ status: 400, message: 'การจองห้องประชุมต้องจองล่วงหน้าอย่างน้อย 3 วัน' });
            }

            // Check availability
            const isAvailable = await BookingService.isRoomAvailable(room_id, meeting_date, start_time, end_time);
            if (!isAvailable) {
                return res.status(422).json({ status: 422, message: 'ห้องประชุมไม่ว่างในช่วงเวลาดังกล่าว โปรดเลือกช่วงเวลาอื่น' });
            }

            // Create Booking
            const approvalStatus = 'pending'; // Default is pending approval
            const bookingStatus = 'confirmed'; // Confirmed by user but pending approval

            const bookingId = await Booking.create(
                room_id,
                userId,
                title,
                booker_name || '',
                booker_department || '',
                booker_phone || '',
                meeting_date,
                start_time,
                end_time,
                attendee_count || 0,
                agenda || '',
                approvalStatus,
                bookingStatus
            );

            // Add attendees if any
            if (attendees && Array.isArray(attendees)) {
                for (const att of attendees) {
                    if (att.name && att.email) {
                        await Booking.addAttendee(bookingId, att.name, att.email);
                    }
                }
            }

            // Log Audit
            await BookingService.logAudit(userId, 'booking', 'create', bookingId.toString(), req.ip);

            // Notify Approvers
            const room = await Room.findById(room_id);
            await NotificationService.notifyRole('approver', bookingId, `มีการจองห้องประชุมใหม่เข้ามา: ${title} ที่ห้อง ${room.room_name} วันที่ ${meeting_date} เวลา ${start_time}-${end_time}`);

            res.status(201).json({ 
                status: 201, 
                message: 'ส่งคำขอจองห้องประชุมสำเร็จ รอผู้อนุมัติพิจารณา',
                bookingId 
            });
        } catch (err) {
            console.error('Error creating booking API:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดภายในระบบ' });
        }
    }

    static async apiCancelBooking(req, res) {
        const bookingId = req.params.id;
        const userId = req.session.userId;

        try {
            const booking = await Booking.findById(bookingId);
            if (!booking) {
                return res.status(404).json({ status: 404, message: 'ไม่พบรายการจองนี้' });
            }

            // Check auth (only owner or admin can cancel)
            const isOwner = booking.user_id === userId;
            const isAdmin = req.session.user.role_name === 'admin';

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ status: 403, message: 'คุณไม่มีสิทธิ์ยกเลิกรายการจองนี้' });
            }

            // Regular users must cancel at least 2 days in advance
            if (isOwner && !isAdmin) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const bookingDate = new Date(booking.meeting_date);
                bookingDate.setHours(0,0,0,0);
                
                const diffTime = bookingDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 2) {
                    return res.status(400).json({ status: 400, message: 'การยกเลิกจองต้องดำเนินการล่วงหน้าอย่างน้อย 2 วัน' });
                }
            }

            // Log Audit
            await BookingService.logAudit(userId, 'booking', 'cancel', bookingId.toString(), req.ip);

            // Delete the booking completely
            await Booking.delete(bookingId);

            res.json({ status: 200, message: 'ยกเลิกการจองห้องประชุมและลบข้อมูลออกจากระบบสำเร็จ' });
        } catch (err) {
            console.error('Error cancelling booking:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการยกเลิกรายการจอง' });
        }
    }

    static async apiGetBookings(req, res) {
        try {
            const bookings = await Booking.getAll();
            res.json({ status: 200, data: bookings });
        } catch (err) {
            console.error('Error fetching bookings:', err);
            res.status(500).json({ status: 500, message: 'Error fetching bookings' });
        }
    }

    static async apiGetDetail(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) {
                return res.status(404).json({ status: 404, message: 'Not found' });
            }
            const attendees = await Booking.getAttendees(booking.id);
            res.json({ status: 200, data: { booking, attendees } });
        } catch (err) {
            console.error('Error fetching details:', err);
            res.status(500).json({ status: 500, message: 'Error fetching details' });
        }
    }

    // New methods for admin & approver management
    static async getAllBookings(req, res) {
        try {
            const bookings = await Booking.getAll();
            res.render('bookings/all', { bookings, title: 'จัดการคำขอจองทั้งหมด - LPC Room Booking' });
        } catch (err) {
            console.error('Error loading all bookings:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    static async getEditForm(req, res) {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) {
                return res.status(404).send('ไม่พบรายการจองนี้');
            }
            const rooms = await Room.getActive();
            res.render('bookings/edit', { booking, rooms, title: 'แก้ไขรายละเอียดการจอง - LPC Room Booking' });
        } catch (err) {
            console.error('Error loading edit form:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    static async apiPutBooking(req, res) {
        const bookingId = req.params.id;
        const { room_id, title, booker_name, booker_department, booker_phone, meeting_date, start_time, end_time, attendee_count, agenda, approval_status, booking_status } = req.body;
        const userId = req.session.userId;

        if (!room_id || !title || !meeting_date || !start_time || !end_time) {
            return res.status(400).json({ status: 400, message: 'โปรดกรอกข้อมูลสำคัญให้ครบถ้วน' });
        }

        try {
            const booking = await Booking.findById(bookingId);
            if (!booking) {
                return res.status(404).json({ status: 404, message: 'ไม่พบรายการจองนี้' });
            }

            // Check availability excluding current booking only if status is approved/pending and not cancelled
            if (booking_status !== 'cancelled' && approval_status !== 'rejected') {
                const isAvailable = await BookingService.isRoomAvailable(room_id, meeting_date, start_time, end_time, bookingId);
                if (!isAvailable) {
                    return res.status(422).json({ status: 422, message: 'ห้องประชุมไม่ว่างในช่วงเวลาดังกล่าว โปรดเลือกช่วงเวลาอื่น' });
                }
            }

            // Update Booking
            await Booking.update(
                bookingId,
                room_id,
                title,
                booker_name || '',
                booker_department || '',
                booker_phone || '',
                meeting_date,
                start_time,
                end_time,
                attendee_count || 0,
                agenda || '',
                approval_status || booking.approval_status,
                booking_status || booking.booking_status
            );

            // If approval status changed, update approval logs
            if (approval_status && booking.approval_status !== approval_status) {
                await Approval.deleteByBookingId(bookingId);
                if (approval_status !== 'pending') {
                    await Approval.create(bookingId, userId, approval_status, 'ปรับเปลี่ยนผ่านหน้าฟอร์มแก้ไขการจอง');
                }
            }

            // Log Audit
            await BookingService.logAudit(userId, 'booking', 'update', bookingId.toString(), req.ip);

            res.json({ status: 200, message: 'แก้ไขข้อมูลการจองห้องประชุมสำเร็จ' });
        } catch (err) {
            console.error('Error updating booking API:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
        }
    }
}

module.exports = BookingController;

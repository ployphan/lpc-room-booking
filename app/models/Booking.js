const db = require('../../config/database');

class Booking {
    static async create(roomId, userId, title, bookerName, bookerDepartment, bookerPhone, meetingDate, startTime, endTime, attendeeCount, agenda, approvalStatus = 'pending', bookingStatus = 'draft') {
        const sql = `
            INSERT INTO bookings (room_id, user_id, title, booker_name, booker_department, booker_phone, meeting_date, start_time, end_time, attendee_count, agenda, approval_status, booking_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await db.run(sql, [roomId, userId, title, bookerName, bookerDepartment, bookerPhone, meetingDate, startTime, endTime, attendeeCount, agenda, approvalStatus, bookingStatus]);
        return result.id;
    }

    static async findById(id) {
        const sql = `
            SELECT b.*, r.room_name, r.location, r.floor, u.full_name as user_name, u.email as user_email, d.department_name
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE b.id = ?
        `;
        return await db.get(sql, [id]);
    }

    static async getByUserId(userId) {
        const sql = `
            SELECT b.*, r.room_name, r.location, r.floor
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.user_id = ?
            ORDER BY b.meeting_date DESC, b.start_time DESC
        `;
        return await db.query(sql, [userId]);
    }

    static async getAll() {
        const sql = `
            SELECT b.*, r.room_name, r.location, r.floor, u.full_name as user_name, d.department_name
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            ORDER BY b.meeting_date DESC, b.start_time DESC
        `;
        return await db.query(sql);
    }

    static async getPending() {
        const sql = `
            SELECT b.*, r.room_name, r.location, r.floor, u.full_name as user_name, d.department_name
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE b.approval_status = 'pending'
            ORDER BY b.meeting_date ASC, b.start_time ASC
        `;
        return await db.query(sql);
    }

    static async updateApprovalStatus(bookingId, status) {
        const sql = `UPDATE bookings SET approval_status = ? WHERE id = ?`;
        return await db.run(sql, [status, bookingId]);
    }

    static async updateBookingStatus(bookingId, status) {
        const sql = `UPDATE bookings SET booking_status = ? WHERE id = ?`;
        return await db.run(sql, [status, bookingId]);
    }

    static async update(id, roomId, title, bookerName, bookerDepartment, bookerPhone, meetingDate, startTime, endTime, attendeeCount, agenda, approvalStatus, bookingStatus) {
        const sql = `
            UPDATE bookings
            SET room_id = ?, title = ?, booker_name = ?, booker_department = ?, booker_phone = ?, 
                meeting_date = ?, start_time = ?, end_time = ?, attendee_count = ?, agenda = ?,
                approval_status = ?, booking_status = ?
            WHERE id = ?
        `;
        return await db.run(sql, [roomId, title, bookerName, bookerDepartment, bookerPhone, meetingDate, startTime, endTime, attendeeCount, agenda, approvalStatus, bookingStatus, id]);
    }

    // Attendees management
    static async getAttendees(bookingId) {
        return await db.query('SELECT * FROM booking_attendees WHERE booking_id = ?', [bookingId]);
    }

    static async addAttendee(bookingId, name, email) {
        const sql = `INSERT INTO booking_attendees (booking_id, attendee_name, attendee_email) VALUES (?, ?, ?)`;
        return await db.run(sql, [bookingId, name, email]);
    }

    static async clearAttendees(bookingId) {
        return await db.run('DELETE FROM booking_attendees WHERE booking_id = ?', [bookingId]);
    }

    static async delete(id) {
        await db.run('DELETE FROM booking_attendees WHERE booking_id = ?', [id]);
        await db.run('DELETE FROM booking_approvals WHERE booking_id = ?', [id]);
        await db.run('DELETE FROM notifications WHERE booking_id = ?', [id]);
        return await db.run('DELETE FROM bookings WHERE id = ?', [id]);
    }
}

module.exports = Booking;

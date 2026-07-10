const db = require('../../config/database');

class Approval {
    static async create(bookingId, approverId, action, actionNote = '') {
        const sql = `
            INSERT INTO booking_approvals (booking_id, approver_id, action, action_note)
            VALUES (?, ?, ?, ?)
        `;
        const result = await db.run(sql, [bookingId, approverId, action, actionNote]);
        return result.id;
    }

    static async getByBookingId(bookingId) {
        const sql = `
            SELECT ba.*, u.full_name as approver_name, u.email as approver_email
            FROM booking_approvals ba
            JOIN users u ON ba.approver_id = u.id
            WHERE ba.booking_id = ?
            ORDER BY ba.action_at DESC
        `;
        return await db.query(sql, [bookingId]);
    }

    static async deleteByBookingId(bookingId) {
        const sql = `DELETE FROM booking_approvals WHERE booking_id = ?`;
        return await db.run(sql, [bookingId]);
    }
}

module.exports = Approval;

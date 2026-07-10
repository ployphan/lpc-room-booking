const Room = require('../models/Room');
const BookingService = require('../../services/BookingService');

class RoomController {
    // MVC View for rooms list (Admin only)
    static async getRooms(req, res) {
        try {
            const rooms = await Room.getAll();
            res.render('rooms/list', { rooms, title: 'จัดการห้องประชุม - LPC Room Booking' });
        } catch (err) {
            console.error('Error loading rooms:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    // JSON APIs
    static async apiGetRooms(req, res) {
        try {
            const rooms = await Room.getAll();
            res.json({ status: 200, data: rooms });
        } catch (err) {
            console.error('Error fetching rooms:', err);
            res.status(500).json({ status: 500, message: 'Internal Server Error' });
        }
    }

    static async apiPostCreate(req, res) {
        const { room_name, location, floor, capacity, equipment_summary, images, status } = req.body;
        const userId = req.session.userId;

        if (!room_name || !location || !floor || !capacity) {
            return res.status(400).json({ status: 400, message: 'โปรดกรอกข้อมูลห้องประชุมให้ครบถ้วน' });
        }

        try {
            const roomId = await Room.create(room_name, location, floor, capacity, equipment_summary || '', images || null, status || 'active');
            
            // Log Audit
            await BookingService.logAudit(userId, 'room', 'create', roomId.toString(), req.ip);

            res.status(201).json({ status: 201, message: 'สร้างห้องประชุมสำเร็จ', roomId });
        } catch (err) {
            console.error('Error creating room:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลห้องประชุม' });
        }
    }

    static async apiPostUpdate(req, res) {
        const roomId = req.params.id;
        const { room_name, location, floor, capacity, equipment_summary, images, status } = req.body;
        const userId = req.session.userId;

        if (!room_name || !location || !floor || !capacity) {
            return res.status(400).json({ status: 400, message: 'โปรดกรอกข้อมูลห้องประชุมให้ครบถ้วน' });
        }

        try {
            const room = await Room.findById(roomId);
            if (!room) {
                return res.status(404).json({ status: 404, message: 'ไม่พบห้องประชุมนี้' });
            }

            await Room.update(roomId, room_name, location, floor, capacity, equipment_summary || '', images || null, status || 'active');

            // Log Audit
            await BookingService.logAudit(userId, 'room', 'update', roomId.toString(), req.ip);

            res.json({ status: 200, message: 'อัปเดตข้อมูลห้องประชุมสำเร็จ' });
        } catch (err) {
            console.error('Error updating room:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลห้องประชุม' });
        }
    }

    static async apiDelete(req, res) {
        const roomId = req.params.id;
        const userId = req.session.userId;

        try {
            const room = await Room.findById(roomId);
            if (!room) {
                return res.status(404).json({ status: 404, message: 'ไม่พบห้องประชุมนี้' });
            }

            await Room.delete(roomId);

            // Log Audit
            await BookingService.logAudit(userId, 'room', 'delete', roomId.toString(), req.ip);

            res.json({ status: 200, message: 'ลบห้องประชุมสำเร็จ' });
        } catch (err) {
            console.error('Error deleting room:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการลบห้องประชุม' });
        }
    }
}

module.exports = RoomController;

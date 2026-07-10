const User = require('../models/User');
const db = require('../../config/database');
const bcrypt = require('bcryptjs');

class UserController {
    static async getUsers(req, res) {
        try {
            const users = await User.getAll();
            const departments = await db.query('SELECT * FROM departments ORDER BY department_name ASC');
            const roles = await db.query('SELECT * FROM roles ORDER BY role_name ASC');
            res.render('users/list', { 
                users, 
                departments, 
                roles,
                activePage: 'users',
                title: 'จัดการสมาชิก - LPC Room Booking' 
            });
        } catch (err) {
            console.error('Error loading users view:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    static async apiGetUsers(req, res) {
        try {
            const users = await User.getAll();
            res.json({ status: 200, data: users });
        } catch (err) {
            console.error('API get users error:', err);
            res.status(500).json({ status: 500, message: 'Internal Server Error' });
        }
    }

    static async apiCreateUser(req, res) {
        const { first_name, last_name, email, phone, password, role_id, department_id } = req.body;
        if (!first_name || !last_name || !email || !password || !role_id || !department_id) {
            return res.status(400).json({ status: 400, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
        }

        try {
            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(400).json({ status: 400, message: 'อีเมลนี้มีอยู่ในระบบแล้ว' });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const userId = await User.create(first_name, last_name, email, phone, passwordHash, role_id, department_id);
            res.status(201).json({ status: 201, message: 'สร้างบัญชีผู้ใช้ใหม่สำเร็จ', userId });
        } catch (err) {
            console.error('API create user error:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้' });
        }
    }

    static async apiUpdateUser(req, res) {
        const userId = req.params.id;
        const { first_name, last_name, email, phone, password, role_id, department_id, status } = req.body;

        if (!first_name || !last_name || !email || !role_id || !department_id || !status) {
            return res.status(400).json({ status: 400, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: 404, message: 'ไม่พบผู้ใช้ในระบบ' });
            }

            // Check email uniqueness if changed
            if (email !== user.email) {
                const existing = await User.findByEmail(email);
                if (existing) {
                    return res.status(400).json({ status: 400, message: 'อีเมลนี้ถูกใช้งานแล้วโดยผู้ใช้อื่น' });
                }
            }

            // Update details
            let passwordHash = user.password_hash;
            if (password && password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                passwordHash = await bcrypt.hash(password, salt);
            }

            const sql = `
                UPDATE users 
                SET first_name = ?, last_name = ?, email = ?, phone = ?, password_hash = ?, role_id = ?, department_id = ?, status = ?
                WHERE id = ?
            `;
            await db.run(sql, [first_name, last_name, email, phone, passwordHash, role_id, department_id, status, userId]);

            res.json({ status: 200, message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' });
        } catch (err) {
            console.error('API update user error:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้' });
        }
    }

    static async apiDeleteUser(req, res) {
        const userId = req.params.id;
        
        // Prevent deleting oneself
        if (parseInt(userId) === req.session.userId) {
            return res.status(400).json({ status: 400, message: 'ไม่สามารถลบบัญชีของตัวเองได้' });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: 404, message: 'ไม่พบผู้ใช้ในระบบ' });
            }

            // Delete user bookings first (or cascade handles it)
            await db.run('DELETE FROM booking_approvals WHERE approver_id = ?', [userId]);
            await db.run('DELETE FROM bookings WHERE user_id = ?', [userId]);
            await db.run('DELETE FROM users WHERE id = ?', [userId]);

            res.json({ status: 200, message: 'ลบบัญชีผู้ใช้สำเร็จ' });
        } catch (err) {
            console.error('API delete user error:', err);
            res.status(500).json({ status: 500, message: 'เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้' });
        }
    }
}

module.exports = UserController;

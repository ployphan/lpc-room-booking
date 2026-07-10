const bcrypt = require('bcryptjs');
const User = require('../models/User');
const db = require('../../config/database');

class AuthController {
    static getLogin(req, res) {
        if (req.session && req.session.userId) {
            return res.redirect('/dashboard');
        }
        res.render('auth/login', { error: null, title: 'เข้าสู่ระบบ - LPC Room Booking' });
    }

    static async postLogin(req, res) {
        const { email, password } = req.body;
        
        try {
            const user = await User.findByEmail(email);
            if (!user) {
                return res.render('auth/login', { error: 'ไม่พบผู้ใช้ในระบบ หรืออีเมลไม่ถูกต้อง', title: 'เข้าสู่ระบบ - LPC Room Booking' });
            }

            if (user.status !== 'active') {
                return res.render('auth/login', { error: 'บัญชีผู้ใช้ถูกระงับการใช้งานชั่วคราว', title: 'เข้าสู่ระบบ - LPC Room Booking' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.render('auth/login', { error: 'รหัสผ่านไม่ถูกต้อง', title: 'เข้าสู่ระบบ - LPC Room Booking' });
            }

            // Save in session
            req.session.userId = user.id;
            req.session.user = {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role_name: user.role_name,
                department_name: user.department_name,
                phone: user.phone
            };

            res.redirect('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            res.render('auth/login', { error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล', title: 'เข้าสู่ระบบ - LPC Room Booking' });
        }
    }

    static async getRegister(req, res) {
        try {
            const departments = await db.query('SELECT * FROM departments');
            
            // Generate math captcha
            const num1 = Math.floor(Math.random() * 10) + 1;
            const num2 = Math.floor(Math.random() * 10) + 1;
            req.session.captchaAnswer = num1 + num2;
            const captchaQuestion = `${num1} + ${num2} = ?`;

            res.render('auth/register', { departments, captchaQuestion, error: null, success: null, title: 'ลงทะเบียนผู้ใช้ใหม่ - LPC Room Booking' });
        } catch (err) {
            console.error('Get register error:', err);
            res.send('Error loading departments');
        }
    }

    static async postRegister(req, res) {
        const { first_name, last_name, email, phone, password, department_id, captcha_input } = req.body;
        
        try {
            const departments = await db.query('SELECT * FROM departments');
            
            // Generate next captcha in case of failure or reload
            const num1 = Math.floor(Math.random() * 10) + 1;
            const num2 = Math.floor(Math.random() * 10) + 1;
            const nextCaptchaQuestion = `${num1} + ${num2} = ?`;
            const sessionAnswer = req.session.captchaAnswer;
            req.session.captchaAnswer = num1 + num2; // Save for next try

            // Validate Captcha
            if (!captcha_input || parseInt(captcha_input) !== sessionAnswer) {
                return res.render('auth/register', { 
                    departments, 
                    captchaQuestion: nextCaptchaQuestion,
                    error: 'คำตอบคำถามความปลอดภัย (Captcha) ไม่ถูกต้อง', 
                    success: null,
                    title: 'ลงทะเบียนผู้ใช้ใหม่ - LPC Room Booking' 
                });
            }

            // Check if user already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.render('auth/register', { 
                    departments, 
                    captchaQuestion: nextCaptchaQuestion,
                    error: 'อีเมลนี้ถูกใช้งานในระบบแล้ว', 
                    success: null,
                    title: 'ลงทะเบียนผู้ใช้ใหม่ - LPC Room Booking' 
                });
            }

            // Get default "user" role ID
            const userRole = await db.get('SELECT id FROM roles WHERE role_name = "user"');

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Create user
            const newUserId = await User.create(first_name, last_name, email, phone, passwordHash, userRole.id, department_id);

            // Fetch created user with role & department name
            const createdUser = await User.findById(newUserId);

            // Save in session
            req.session.userId = createdUser.id;
            req.session.user = {
                id: createdUser.id,
                full_name: createdUser.full_name,
                email: createdUser.email,
                role_name: createdUser.role_name,
                department_name: createdUser.department_name,
                phone: createdUser.phone
            };

            return res.redirect('/dashboard');
        } catch (err) {
            console.error('Registration error:', err);
            
            const num1 = Math.floor(Math.random() * 10) + 1;
            const num2 = Math.floor(Math.random() * 10) + 1;
            const fallbackCaptcha = `${num1} + ${num2} = ?`;
            req.session.captchaAnswer = num1 + num2;

            res.render('auth/register', { 
                departments: [], 
                captchaQuestion: fallbackCaptcha,
                error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้', 
                success: null,
                title: 'ลงทะเบียนผู้ใช้ใหม่ - LPC Room Booking' 
            });
        }
    }

    static logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout session destroy error:', err);
            }
            res.redirect('/login');
        });
    }
}

module.exports = AuthController;

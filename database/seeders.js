const bcrypt = require('bcryptjs');
const { initializeDatabase, run, get, query } = require('./database');

const seed = async () => {
    try {
        console.log('Starting database seeding...');
        await initializeDatabase();

        // 1. Seed Departments
        const depts = ['ศูนย์การเรียนรู้ตลอดชีวิต (LPC)', 'ฝ่ายวิชาการ', 'ฝ่ายเทคโนโลยีสารสนเทศ', 'สำนักงานผู้อำนวยการ'];
        for (const dept of depts) {
            try {
                await run('INSERT OR IGNORE INTO departments (department_name) VALUES (?)', [dept]);
            } catch (e) {
                // Ignore duplicates
            }
        }
        console.log('Departments seeded.');

        // 2. Seed Roles
        const roles = ['admin', 'approver', 'user'];
        for (const role of roles) {
            try {
                await run('INSERT OR IGNORE INTO roles (role_name) VALUES (?)', [role]);
            } catch (e) {
                // Ignore duplicates
            }
        }
        console.log('Roles seeded.');

        // Fetch IDs
        const adminRole = await get('SELECT id FROM roles WHERE role_name = "admin"');
        const approverRole = await get('SELECT id FROM roles WHERE role_name = "approver"');
        const userRole = await get('SELECT id FROM roles WHERE role_name = "user"');
        
        const lpcDept = await get('SELECT id FROM departments WHERE department_name = "ศูนย์การเรียนรู้ตลอดชีวิต (LPC)"');
        const itDept = await get('SELECT id FROM departments WHERE department_name = "ฝ่ายเทคโนโลยีสารสนเทศ"');

        // 3. Seed Users
        const salt = await bcrypt.genSalt(10);
        const adminPw = await bcrypt.hash('admin1234', salt);
        const approverPw = await bcrypt.hash('approver1234', salt);
        const userPw = await bcrypt.hash('user1234', salt);

        const usersToSeed = [
            {
                email: 'admin@kpru.ac.th',
                pwd: adminPw,
                name: 'ผู้ดูแลระบบ LPC (Admin)',
                roleId: adminRole.id,
                deptId: itDept.id,
                phone: '081-234-5678'
            },
            {
                email: 'approver@kpru.ac.th',
                pwd: approverPw,
                name: 'ดร.สมชาย ใจดี (Approver)',
                roleId: approverRole.id,
                deptId: lpcDept.id,
                phone: '082-345-6789'
            },
            {
                email: 'user@kpru.ac.th',
                pwd: userPw,
                name: 'สมศรี มีทรัพย์ (User)',
                roleId: userRole.id,
                deptId: lpcDept.id,
                phone: '083-456-7890'
            }
        ];

        for (const u of usersToSeed) {
            try {
                await run(
                    'INSERT OR IGNORE INTO users (email, password_hash, full_name, role_id, department_id, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [u.email, u.pwd, u.name, u.roleId, u.deptId, u.phone, 'active']
                );
            } catch (e) {
                console.error('Error seeding user:', u.email, e.message);
            }
        }
        console.log('Users seeded.');

        // 4. Seed Rooms
        const roomsToSeed = [
            { name: 'Room A (LPC-101)', loc: 'อาคารเรียนรู้ LPC', floor: 'ชั้น 1', cap: 8, eq: 'Projector, Whiteboard, Air Conditioner' },
            { name: 'Room B (LPC-102)', loc: 'อาคารเรียนรู้ LPC', floor: 'ชั้น 1', cap: 12, eq: 'Smart TV, Whiteboard, Air Conditioner' },
            { name: 'Room C (LPC-201)', loc: 'อาคารเรียนรู้ LPC', floor: 'ชั้น 2', cap: 6, eq: 'Whiteboard, Air Conditioner' },
            { name: 'Room D (LPC-Auditorium)', loc: 'อาคารเรียนรู้ LPC', floor: 'ชั้น 2', cap: 20, eq: 'Video Conference System, Projector, Sound System, Air Conditioner' },
            { name: 'Room E (LPC-301)', loc: 'อาคารเรียนรู้ LPC', floor: 'ชั้น 3', cap: 10, eq: 'Smart TV, Whiteboard, Air Conditioner' },
            { name: 'Room F (LPC-302)', loc: 'อาคารเรียนรู้ LPC', floor: 'ชั้น 3', cap: 4, eq: 'Air Conditioner' }
        ];

        for (const r of roomsToSeed) {
            try {
                await run(
                    'INSERT OR IGNORE INTO rooms (room_name, location, floor, capacity, equipment_summary, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [r.name, r.loc, r.floor, r.cap, r.eq, 'active']
                );
            } catch (e) {
                console.error('Error seeding room:', r.name, e.message);
            }
        }
        console.log('Rooms seeded.');

        // 5. Seed Room Features
        const features = [
            'Projector',
            'Whiteboard',
            'Video Conference System',
            'Sound System',
            'Air Conditioner',
            'Smart TV'
        ];

        for (const f of features) {
            try {
                await run('INSERT OR IGNORE INTO room_features (feature_name) VALUES (?)', [f]);
            } catch (e) {
                // Ignore duplicates
            }
        }
        console.log('Room features seeded.');

        // 6. Map Features to Rooms
        const allRooms = await query('SELECT id, room_name, equipment_summary FROM rooms');
        const allFeatures = await query('SELECT id, feature_name FROM room_features');

        for (const room of allRooms) {
            for (const feat of allFeatures) {
                if (room.equipment_summary.includes(feat.feature_name)) {
                    try {
                        await run(
                            'INSERT OR IGNORE INTO room_feature_map (room_id, feature_id) VALUES (?, ?)',
                            [room.id, feat.id]
                        );
                    } catch (e) {
                        // Ignore duplicates
                    }
                }
            }
        }
        console.log('Room features map seeded.');

        // 7. Seed Bookings
        const user = await get('SELECT id FROM users WHERE email = "user@kpru.ac.th"');
        const roomA = await get('SELECT id FROM rooms WHERE room_name = "Room A (LPC-101)"');
        const roomB = await get('SELECT id FROM rooms WHERE room_name = "Room B (LPC-102)"');

        const mockBookings = [
            {
                roomId: roomA.id,
                userId: user.id,
                title: 'ประชุมด่วนวางแผนยุทธศาสตร์ LPC',
                bookerName: 'สมศรี มีทรัพย์',
                bookerDept: 'ศูนย์การเรียนรู้ตลอดชีวิต (LPC)',
                bookerPhone: '083-456-7890',
                date: '2026-06-28',
                start: '14:00',
                end: '16:30',
                attendeeCount: 7,
                agenda: 'ประชุมด่วนเพื่อกำหนดกรอบนโยบายการจองห้องเรียนรู้ตลอดชีวิต',
                appStat: 'approved',
                bookStat: 'confirmed'
            },
            {
                roomId: roomA.id,
                userId: user.id,
                title: 'ประชุมฝ่ายพัฒนามาตรฐานวิชาชีพ LPC',
                bookerName: 'สมศรี มีทรัพย์',
                bookerDept: 'ศูนย์การเรียนรู้ตลอดชีวิต (LPC)',
                bookerPhone: '083-456-7890',
                date: '2026-06-29',
                start: '09:30',
                end: '12:00',
                attendeeCount: 5,
                agenda: 'ประชุมหารือแนวทางการจัดหลักสูตรอบรมวิชาชีพระยะสั้น ประจำปีงบประมาณ 2569',
                appStat: 'approved',
                bookStat: 'confirmed'
            },
            {
                roomId: roomB.id,
                userId: user.id,
                title: 'อบรมระบบสารสนเทศภายใน LPC',
                bookerName: 'สมศรี มีทรัพย์',
                bookerDept: 'ศูนย์การเรียนรู้ตลอดชีวิต (LPC)',
                bookerPhone: '083-456-7890',
                date: '2026-06-30',
                start: '13:30',
                end: '16:00',
                attendeeCount: 10,
                agenda: 'อบรมการใช้งานโปรแกรมสำหรับเจ้าหน้าที่ศูนย์ LPC',
                appStat: 'pending',
                bookStat: 'confirmed'
            }
        ];

        for (const mb of mockBookings) {
            try {
                await run(`
                    INSERT INTO bookings (room_id, user_id, title, booker_name, booker_department, booker_phone, meeting_date, start_time, end_time, attendee_count, agenda, approval_status, booking_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [mb.roomId, mb.userId, mb.title, mb.bookerName, mb.bookerDept, mb.bookerPhone, mb.date, mb.start, mb.end, mb.attendeeCount, mb.agenda, mb.appStat, mb.bookStat]);
            } catch (e) {
                console.error('Error seeding booking:', mb.title, e.message);
            }
        }
        console.log('Bookings seeded.');
        console.log('Seeding completed successfully.');
        if (require.main === module) {
            process.exit(0);
        }
    } catch (e) {
        console.error('Seeding failed:', e);
        if (require.main === module) {
            process.exit(1);
        }
        throw e;
    }
};

if (require.main === module) {
    seed();
}

module.exports = { seed };

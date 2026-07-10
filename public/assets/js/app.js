// LPC Meeting Room Booking System - Frontend JS Logic

// 1. Dashboard Chart.js Initialization
function initializeDashboardCharts(stats) {
    // A. Bar Chart: Bookings by Room
    const barCtx = document.getElementById('bookingsByRoomChart');
    if (barCtx) {
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: stats.barChart.labels,
                datasets: [{
                    data: stats.barChart.data,
                    backgroundColor: 'rgba(176, 30, 46, 0.8)',
                    borderColor: 'var(--kpru-green)',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { color: 'var(--text-secondary)' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { 
                            color: 'var(--text-secondary)',
                            stepSize: 10
                        }
                    }
                }
            }
        });
    }

    // B. Donut Chart: Booking Status
    const donutCtx = document.getElementById('bookingStatusChart');
    if (donutCtx) {
        const total = stats.donutChart.data.reduce((a, b) => a + b, 0);

        new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: stats.donutChart.labels,
                datasets: [{
                    data: stats.donutChart.data,
                    backgroundColor: [
                        '#10B981', // Approved (green)
                        '#F59E0B', // Pending (yellow)
                        '#EF4444', // Rejected (red)
                        '#9CA3AF'  // Cancelled (gray)
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // Generate Custom Legend
        const legendDiv = document.getElementById('donutLegend');
        if (legendDiv) {
            legendDiv.innerHTML = '';
            const colors = ['#10B981', '#F59E0B', '#EF4444', '#9CA3AF'];
            stats.donutChart.labels.forEach((label, i) => {
                const count = stats.donutChart.data[i];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                
                legendDiv.innerHTML += `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${colors[i]};"></span>
                        <span style="font-weight: 500; color: var(--text-primary);">${label}: ${count} (${pct}%)</span>
                    </div>
                `;
            });
        }
    }

    // C. Line Chart: Weekly Booking Trend
    const lineCtx = document.getElementById('weeklyTrendChart');
    if (lineCtx) {
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: stats.lineChart.labels,
                datasets: [{
                    data: stats.lineChart.data,
                    borderColor: 'var(--kpru-green)',
                    backgroundColor: 'rgba(176, 30, 46, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: 'var(--kpru-green)',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: 'var(--text-secondary)' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { 
                            color: 'var(--text-secondary)',
                            stepSize: 5
                        }
                    }
                }
            }
        });
    }
}

// 2. FullCalendar Integration
function initializeCalendar(eventsData) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'th', // Thai locale support
        displayEventTime: false,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: 'วันนี้',
            month: 'เดือน',
            week: 'สัปดาห์',
            day: 'วัน'
        },
        events: eventsData,
        eventClick: function(info) {
            // Redirect to booking details page
            window.location.href = `/bookings/${info.event.id}`;
        },
        eventMouseEnter: function(info) {
            const event = info.event;
            const props = event.extendedProps;

            // Remove existing tooltips to prevent duplicates
            const oldTooltips = document.querySelectorAll('.calendar-tooltip');
            oldTooltips.forEach(t => t.remove());

            // Create new tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'calendar-tooltip';
            tooltip.id = 'tooltip-' + event.id;
            tooltip.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 6px; color: #000000; font-size: 0.9rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">${props.booking_title || event.title}</div>
                <div style="color: #1f2937; margin-bottom: 3px;"><strong>ห้อง:</strong> ${props.room_name || ''}</div>
                <div style="color: #1f2937; margin-bottom: 3px;"><strong>เวลา:</strong> ${props.start_time_raw} - ${props.end_time_raw} น.</div>
                <div style="color: #1f2937;"><strong>ผู้จอง:</strong> ${props.booker_name || ''}</div>
            `;

            Object.assign(tooltip.style, {
                position: 'fixed',
                background: '#ffffff',
                color: '#000000',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: '9999',
                fontSize: '0.8rem',
                pointerEvents: 'none',
                lineHeight: '1.4',
                fontFamily: 'inherit'
            });

            document.body.appendChild(tooltip);

            function positionTooltip(e) {
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }

            positionTooltip(info.jsEvent);

            info.el.addEventListener('mousemove', positionTooltip);
            info.el._tooltipListener = positionTooltip;
        },
        eventMouseLeave: function(info) {
            const tooltip = document.getElementById('tooltip-' + info.event.id);
            if (tooltip) {
                tooltip.remove();
            }
            if (info.el._tooltipListener) {
                info.el.removeEventListener('mousemove', info.el._tooltipListener);
            }
        }
    });

    calendar.render();
}

// 3. New Booking Form dynamic check & submit
function setupBookingForm() {
    const form = document.getElementById('bookingForm');
    if (!form) return;

    const roomSelect = document.getElementById('room_id');
    const dateInput = document.getElementById('date');
    const startTimeInput = document.getElementById('start_time');
    const endTimeInput = document.getElementById('end_time');
    const availabilityBadge = document.getElementById('availabilityBadge');

    // Live Availability Check
    async function checkAvailability() {
        const roomId = roomSelect.value;
        const date = dateInput.value;
        const start = startTimeInput.value;
        const end = endTimeInput.value;

        if (!roomId || !date || !start || !end) {
            availabilityBadge.style.display = 'none';
            return;
        }

        // Validate time
        if (start >= end) {
            availabilityBadge.style.display = 'block';
            availabilityBadge.className = 'auth-error';
            availabilityBadge.style.background = 'rgba(239, 68, 68, 0.15)';
            availabilityBadge.style.color = '#EF4444';
            availabilityBadge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            availabilityBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> เวลาเริ่มต้นต้องเกิดขึ้นก่อนเวลาสิ้นสุด';
            return;
        }

        try {
            const res = await fetch(`/api/rooms/available?date=${date}&start=${start}&end=${end}`);
            const result = await res.json();
            if (result.status === 200) {
                const availableRooms = result.data;
                const isAvailable = availableRooms.some(r => r.id === parseInt(roomId));
                
                availabilityBadge.style.display = 'block';
                if (isAvailable) {
                    availabilityBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                    availabilityBadge.style.color = '#10B981';
                    availabilityBadge.style.border = '1px solid rgba(16, 185, 129, 0.3)';
                    availabilityBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> ห้องประชุมว่าง สามารถจองได้!';
                } else {
                    availabilityBadge.style.background = 'rgba(239, 68, 68, 0.15)';
                    availabilityBadge.style.color = '#EF4444';
                    availabilityBadge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                    availabilityBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ห้องประชุมไม่ว่างในช่วงเวลาดังกล่าว';
                }
            }
        } catch (e) {
            console.error('Error checking room:', e);
        }
    }

    roomSelect.addEventListener('change', checkAvailability);
    dateInput.addEventListener('change', checkAvailability);
    startTimeInput.addEventListener('change', checkAvailability);
    endTimeInput.addEventListener('change', checkAvailability);

    // Form submission via AJAX
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const errorContainer = document.getElementById('formError');
        errorContainer.style.display = 'none';

        const roomId = roomSelect.value;
        const date = dateInput.value;
        const start = startTimeInput.value;
        const end = endTimeInput.value;

        if (start >= end) {
            errorContainer.style.display = 'block';
            errorContainer.className = 'auth-error';
            errorContainer.textContent = 'เวลาเริ่มต้นต้องเกิดขึ้นก่อนเวลาสิ้นสุด';
            return;
        }

        // Gather attendees
        const attendees = [];
        const attendeeRows = document.querySelectorAll('.attendee-row');
        attendeeRows.forEach(row => {
            const name = row.querySelector('.att-name').value;
            const email = row.querySelector('.att-email').value;
            if (name && email) {
                attendees.push({ name, email });
            }
        });

        const formData = {
            room_id: parseInt(roomId),
            title: document.getElementById('title').value,
            booker_name: document.getElementById('booker_name').value,
            booker_department: document.getElementById('booker_department').value,
            booker_phone: document.getElementById('booker_phone').value,
            meeting_date: date,
            start_time: start,
            end_time: end,
            attendee_count: parseInt(document.getElementById('attendees').value) || 0,
            agenda: document.getElementById('details').value || '',
            attendees: attendees
        };

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            
            if (res.status === 201) {
                // Success
                alert(result.message);
                window.location.href = '/bookings/my';
            } else {
                errorContainer.style.display = 'block';
                errorContainer.className = 'auth-error';
                errorContainer.textContent = result.message || 'เกิดข้อผิดพลาดในการบันทึกการจอง';
            }
        } catch (err) {
            console.error(err);
            errorContainer.style.display = 'block';
            errorContainer.className = 'auth-error';
            errorContainer.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
        }
    });
}

// 4. Cancel Booking Action
async function cancelBooking(bookingId) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองห้องประชุมนี้?')) {
        return;
    }

    try {
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'POST'
        });
        const result = await res.json();
        if (res.status === 200) {
            alert(result.message);
            window.location.reload();
        } else {
            alert(result.message);
        }
    } catch (e) {
        console.error(e);
        alert('เกิดข้อผิดพลาดในการลบรายการจอง');
    }
}

// 5. Approver Action
async function processApproval(bookingId, action) {
    let note = '';
    if (action === 'reject') {
        note = prompt('ระบุหมายเหตุ / เหตุผลสำหรับการปฏิเสธ คำขอนี้:');
        if (!note || note.trim() === '') {
            alert('การปฏิเสธคำขอจำเป็นต้องระบุเหตุผล');
            return;
        }
    } else {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการอนุมัติการจองห้องประชุมนี้?')) {
            return;
        }
    }

    try {
        const res = await fetch(`/api/bookings/${bookingId}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: note })
        });
        const result = await res.json();
        if (res.status === 200) {
            alert(result.message);
            window.location.reload();
        } else {
            alert(result.message);
        }
    } catch (e) {
        console.error(e);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
}

// 6. Reset Approval Action
async function resetApproval(bookingId) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผลการอนุมัติและตั้งค่ากลับเป็นรอพิจารณา? (การจองนี้จะเปลี่ยนสถานะเป็นรออนุมัติอีกครั้ง)')) {
        return;
    }

    try {
        const res = await fetch(`/api/bookings/${bookingId}/reset-approval`, {
            method: 'POST'
        });
        const result = await res.json();
        if (res.status === 200) {
            alert(result.message);
            window.location.reload();
        } else {
            alert(result.message);
        }
    } catch (e) {
        console.error(e);
        alert('เกิดข้อผิดพลาดในการรีเซ็ตผลการอนุมัติ');
    }
}

// 7. Global Page Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // A. If bookingsByRoomChart canvas exists, fetch stats and render charts
    if (document.getElementById('bookingsByRoomChart')) {
        fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(resData => {
                if (resData.status === 200) {
                    initializeDashboardCharts(resData.data);
                }
            })
            .catch(err => console.error('Error loading dashboard stats:', err));
    }

    // B. If calendar container exists, fetch bookings and render calendar
    if (document.getElementById('calendar')) {
        fetch('/api/bookings')
            .then(res => res.json())
            .then(resData => {
                if (resData.status === 200) {
                    const events = resData.data.map(b => {
                        let bgColor = '#FDE68A'; // Pending (Pastel yellow)
                        let borderColor = '#D97706'; // Pending (Strong orange)
                        if (b.booking_status === 'cancelled') {
                            bgColor = '#E5E7EB'; // Cancelled (Pastel grey)
                            borderColor = '#6B7280'; // Cancelled (Strong grey)
                        } else if (b.approval_status === 'approved') {
                            bgColor = '#A7F3D0'; // Approved (Pastel green)
                            borderColor = '#10B981'; // Approved (Strong green)
                        } else if (b.approval_status === 'rejected') {
                            bgColor = '#FCA5A5'; // Rejected (Pastel red)
                            borderColor = '#EF4444'; // Rejected (Strong red)
                        }

                        const shortRoom = (b.room_name || '').replace('ห้องประชุม', '').trim();
                        const timeStr = `${(b.start_time || '').substring(0, 5)}-${(b.end_time || '').substring(0, 5)}`;

                        return {
                            id: b.id,
                            title: `${shortRoom} (${timeStr})`,
                            start: `${b.meeting_date}T${b.start_time}`,
                            end: `${b.meeting_date}T${b.end_time}`,
                            backgroundColor: bgColor,
                            borderColor: borderColor,
                            textColor: '#000000',
                            extendedProps: {
                                room_name: b.room_name,
                                booker_name: b.booker_name || b.user_name,
                                start_time_raw: (b.start_time || '').substring(0, 5),
                                end_time_raw: (b.end_time || '').substring(0, 5),
                                booking_title: b.title
                            }
                        };
                    });
                    initializeCalendar(events);
                }
            })
            .catch(err => console.error('Error loading calendar bookings:', err));
    }

    // C. Setup booking form if present
    setupBookingForm();
});

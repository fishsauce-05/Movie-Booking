const AUTH_KEY = 'cp_user';

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch {
        return null;
    }
}

function saveUser(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function getAuthHeaders(extraHeaders = {}) {
    const user = getCurrentUser();
    const headers = { ...extraHeaders };

    if (user?._id) {
        headers['x-user-id'] = String(user._id);
    }

    return headers;
}

function clearUser() {
    localStorage.removeItem(AUTH_KEY);
}

// ── Booking history ──────────────────────────────────────────────────────────

async function openBookingHistory(user) {
    ensureBookingHistoryModal();
    openModal('booking-history-modal');
    const listEl = document.getElementById('booking-history-list');
    listEl.innerHTML = '<p class="bh-loading">Đang tải...</p>';

    try {
        const res = await fetch(`/api/bookings/customer/${user._id}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Lỗi tải dữ liệu');
        const bookings = await res.json();
        listEl.innerHTML = bookings.length ? '' : '<p class="bh-empty">Bạn chưa có đặt vé nào.</p>';
        bookings.forEach(b => {
            listEl.insertAdjacentHTML('beforeend', renderBookingItem(b));
        });
        listEl.querySelectorAll('.bh-cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => openCancelConfirm(btn.dataset.id, user));
        });
    } catch {
        listEl.innerHTML = '<p class="bh-empty">Không thể tải lịch sử đặt vé.</p>';
    }
}

function renderBookingItem(b) {
    const showtime = b.showtime || {};
    const movie = showtime.movie || {};
    const start = showtime.start_time ? new Date(showtime.start_time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '–';
    const isCancellable = b.status === 'Hoàn tất';
    const statusClass = b.status === 'Đã hủy' ? 'bh-status-cancelled' : 'bh-status-complete';

    return `
        <div class="bh-item" id="bh-item-${b._id}">
            ${movie.poster_url ? `<img class="bh-poster" src="${escAuthHtml(movie.poster_url)}" alt="">` : '<div class="bh-poster bh-poster-placeholder"></div>'}
            <div class="bh-info">
                <div class="bh-movie-title">${escAuthHtml(movie.title || '–')}</div>
                <div class="bh-meta">${start} · ${escAuthHtml(showtime.room_name || '–')}</div>
                <div class="bh-meta">Ghế: ${escAuthHtml((b.booked_seats || []).join(', '))}</div>
                <div class="bh-meta">Tổng: ${Number(b.total_price || 0).toLocaleString('vi-VN')} VNĐ</div>
            </div>
            <div class="bh-side">
                <span class="bh-status ${statusClass}">${escAuthHtml(b.status)}</span>
                ${isCancellable ? `<button class="button bh-cancel-btn" data-id="${b._id}">Hủy vé</button>` : ''}
            </div>
        </div>`;
}

function openCancelConfirm(bookingId, user) {
    const modal = document.getElementById('cancel-confirm-modal');
    modal.dataset.bookingId = bookingId;
    modal.dataset.userId = user._id;
    openModal('cancel-confirm-modal');
}

async function confirmCancelBooking() {
    const modal = document.getElementById('cancel-confirm-modal');
    const bookingId = modal.dataset.bookingId;
    const userId = modal.dataset.userId;
    const btn = document.getElementById('cancel-confirm-btn');
    btn.disabled = true;
    btn.textContent = 'Đang hủy...';

    try {
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        closeModal('cancel-confirm-modal');
        if (!res.ok) {
            alert(data.message || 'Hủy vé thất bại.');
            return;
        }
        try {
            const updatedUser = await fetch(`/api/auth/${userId}`, {
                headers: getAuthHeaders()
            }).then((r) => r.json());
            if (updatedUser && updatedUser._id) {
                saveUser(updatedUser);
                renderAuthNav(updatedUser);
            }
        } catch {
            // Keep the current UI if the profile refresh fails.
        }
        const item = document.getElementById(`bh-item-${bookingId}`);
        if (item) {
            item.querySelector('.bh-status').className = 'bh-status bh-status-cancelled';
            item.querySelector('.bh-status').textContent = 'Đã hủy';
            item.querySelector('.bh-cancel-btn')?.remove();
        }
        openModal('cancel-success-modal');
    } catch {
        closeModal('cancel-confirm-modal');
        alert('Lỗi kết nối máy chủ.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Xác nhận hủy';
    }
}

function ensureBookingHistoryModal() {
    if (document.getElementById('booking-history-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="booking-history-modal" class="modal-overlay" hidden>
            <div class="modal-box bh-modal-box">
                <button class="modal-close" type="button" aria-label="Đóng">×</button>
                <span class="modal-kicker">Tài khoản</span>
                <h3>Lịch sử đặt vé</h3>
                <div id="booking-history-list" class="bh-list"></div>
            </div>
        </div>

        <div id="cancel-confirm-modal" class="modal-overlay" hidden>
            <div class="modal-box">
                <h3>Xác nhận hủy vé</h3>
                <p style="color:var(--muted);margin:0 0 8px">Bạn có chắc muốn hủy vé này không? Hành động này không thể hoàn tác.</p>
                <p style="color:#e05c3a;margin:0 0 20px;font-size:.875rem">⚠️ Toàn bộ điểm thưởng bạn vừa tích được từ đơn này sẽ bị thu hồi, đồng thời bạn sẽ bị trừ thêm <strong>10 điểm</strong> phạt hủy vé.</p>
                <div class="modal-actions">
                    <button type="button" class="button button-secondary" onclick="closeModal('cancel-confirm-modal')">Không</button>
                    <button type="button" class="button bh-btn-danger" id="cancel-confirm-btn" onclick="confirmCancelBooking()">Xác nhận hủy</button>
                </div>
            </div>
        </div>

        <div id="cancel-success-modal" class="modal-overlay" hidden>
            <div class="modal-box">
                <h3>Hủy thành công</h3>
                <p style="color:var(--muted);margin:0 0 20px">Vé của bạn đã được hủy thành công.</p>
                <div class="modal-actions">
                    <button type="button" class="button button-primary" onclick="closeModal('cancel-success-modal'); location.reload()">Đóng</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('booking-history-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('booking-history-modal'))
            closeModal('booking-history-modal');
    });
    document.getElementById('cancel-confirm-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('cancel-confirm-modal'))
            closeModal('cancel-confirm-modal');
    });
    document.getElementById('cancel-success-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('cancel-success-modal')) {
            closeModal('cancel-success-modal');
            location.reload();
        }
    });
    document.getElementById('booking-history-modal').querySelector('.modal-close')
        .addEventListener('click', () => closeModal('booking-history-modal'));
}

// ── Auth modals ───────────────────────────────────────────────────────────────

function ensureAuthModals() {
    if (document.getElementById('login-modal') && document.getElementById('register-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="login-modal" class="modal-overlay" hidden>
            <div class="modal-box auth-modal-box" role="dialog" aria-modal="true" aria-labelledby="login-title">
                <button class="modal-close" type="button" aria-label="Đóng">×</button>
                <span class="modal-kicker">Fishsauce Cinema</span>
                <h3 id="login-title">Đăng nhập</h3>
                <p class="modal-subtitle">Vào tài khoản để đặt vé, áp mã giảm giá và tích điểm thành viên.</p>
                <form id="login-form" class="admin-form auth-form">
                    <label class="form-field">Email<input name="email" type="email" required placeholder="you@example.com" autocomplete="email"></label>
                    <label class="form-field">Mật khẩu<input name="password" type="password" required placeholder="Tối thiểu 6 ký tự" autocomplete="current-password"></label>
                    <p id="login-msg" class="form-msg"></p>
                    <button type="submit" class="button button-primary auth-submit">Đăng nhập</button>
                </form>
                <p class="modal-switch">Chưa có tài khoản? <button type="button" class="link-btn" data-switch-auth="register">Đăng ký ngay</button></p>
            </div>
        </div>

        <div id="register-modal" class="modal-overlay" hidden>
            <div class="modal-box auth-modal-box" role="dialog" aria-modal="true" aria-labelledby="register-title">
                <button class="modal-close" type="button" aria-label="Đóng">×</button>
                <span class="modal-kicker">Tài khoản mới</span>
                <h3 id="register-title">Đăng ký</h3>
                <p class="modal-subtitle">Tạo tài khoản để đặt vé nhanh hơn ở các lần sau.</p>
                <form id="register-form" class="admin-form auth-form">
                    <label class="form-field">Họ và tên<input name="full_name" required placeholder="Nguyễn Văn A" autocomplete="name"></label>
                    <label class="form-field">Email<input name="email" type="email" required placeholder="you@example.com" autocomplete="email"></label>
                    <label class="form-field">Số điện thoại<input name="phone" required placeholder="0123456789" autocomplete="tel"></label>
                    <label class="form-field">Mật khẩu<input name="password" type="password" required minlength="6" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password"></label>
                    <label class="form-field">Xác nhận mật khẩu<input name="confirm_password" type="password" required minlength="6" placeholder="Nhập lại mật khẩu" autocomplete="new-password"></label>
                    <p id="register-msg" class="form-msg"></p>
                    <button type="submit" class="button button-primary auth-submit">Đăng ký</button>
                </form>
                <p class="modal-switch">Đã có tài khoản? <button type="button" class="link-btn" data-switch-auth="login">Đăng nhập</button></p>
            </div>
        </div>
    `);
}

// Renders auth controls into any element with id="auth-nav"
function renderAuthNav(user) {
    const el = document.getElementById('auth-nav');
    if (!el) return;

    if (user) {
        el.innerHTML = `
            <div class="auth-info">
                <span class="auth-points">${user.loyalty_points || 0} điểm</span>
                <span class="auth-name">${escAuthHtml(user.full_name)}</span>
                ${user.role === 'ADMIN' || user.role === 'STAFF'
                    ? '<a class="button button-secondary auth-btn" href="admin.html">Admin</a>'
                    : ''}
                ${user.role === 'CUSTOMER'
                    ? `<a class="button button-secondary auth-btn" href="profile.html">Tài khoản</a>
                       <button class="button button-secondary auth-btn" id="open-booking-history-btn">Lịch sử đặt vé</button>`
                    : ''}
                <button class="button button-secondary auth-btn" id="logout-btn">Đăng xuất</button>
            </div>
        `;
        document.getElementById('open-booking-history-btn')?.addEventListener('click', () => openBookingHistory(user));
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            clearUser();
            location.reload();
        });
    } else {
        el.innerHTML = `
            <div class="auth-info">
                <button class="button button-primary auth-btn" id="open-login-btn">Đăng nhập</button>
                <button class="button button-primary auth-btn" id="open-register-btn">Đăng ký</button>
            </div>
        `;
        document.getElementById('open-login-btn')?.addEventListener('click', () => openModal('login-modal'));
        document.getElementById('open-register-btn')?.addEventListener('click', () => openModal('register-modal'));
    }
}

function escAuthHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
}

// ── Login form ───────────────────────────────────────────────────────────────

function wireLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('login-msg');
        const email = form.email.value.trim();
        const password = form.password.value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                msg.textContent = data.message;
                msg.className = 'form-msg form-msg-error';
                return;
            }
            saveUser(data);
            if (data.role === 'ADMIN' || data.role === 'STAFF') {
                location.href = 'admin.html';
                return;
            }
            closeModal('login-modal');
            renderAuthNav(data);
            msg.textContent = '';
            if (typeof fetchMovies === 'function') fetchMovies();
        } catch {
            msg.textContent = 'Lỗi kết nối máy chủ.';
            msg.className = 'form-msg form-msg-error';
        }
    });
}

// ── Register form ─────────────────────────────────────────────────────────────

function wireRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('register-msg');
        const body = {
            full_name: form.full_name.value.trim(),
            email: form.email.value.trim(),
            phone: form.phone.value.trim(),
            password: form.password.value
        };

        if (form.password.value !== form.confirm_password.value) {
            msg.textContent = 'Mật khẩu xác nhận không khớp.';
            msg.className = 'form-msg form-msg-error';
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) {
                msg.textContent = data.message;
                msg.className = 'form-msg form-msg-error';
                return;
            }
            msg.textContent = 'Đăng ký thành công! Vui lòng đăng nhập.';
            msg.className = 'form-msg form-msg-ok';
            form.reset();
            setTimeout(() => {
                closeModal('register-modal');
                openModal('login-modal');
            }, 1500);
        } catch {
            msg.textContent = 'Lỗi kết nối máy chủ.';
            msg.className = 'form-msg form-msg-error';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    ensureAuthModals();
    wireLoginForm();
    wireRegisterForm();

    // Close modal on backdrop click
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.hidden = true;
        });
    });
    document.querySelectorAll('.modal-close').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').hidden = true;
        });
    });
    document.querySelectorAll('[data-switch-auth]').forEach((btn) => {
        btn.addEventListener('click', () => {
            closeModal(btn.dataset.switchAuth === 'login' ? 'register-modal' : 'login-modal');
            openModal(`${btn.dataset.switchAuth}-modal`);
        });
    });

    if (location.hash === '#login') openModal('login-modal');
    if (location.hash === '#register') openModal('register-modal');
});

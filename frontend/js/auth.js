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

function ensureAuthModals() {
    if (document.getElementById('login-modal') && document.getElementById('register-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="login-modal" class="modal-overlay" hidden>
            <div class="modal-box auth-modal-box" role="dialog" aria-modal="true" aria-labelledby="login-title">
                <button class="modal-close" type="button" aria-label="Đóng">×</button>
                <span class="modal-kicker">Cinema Pulse</span>
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
                    <label class="form-field">Số điện thoại<input name="phone" required placeholder="0912345678" autocomplete="tel"></label>
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
                ${user.role === 'MANAGER' || user.role === 'STAFF'
                    ? '<a class="button button-secondary auth-btn" href="admin.html">Admin</a>'
                    : ''}
                <button class="button button-secondary auth-btn" id="logout-btn">Đăng xuất</button>
            </div>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            clearUser();
            location.reload();
        });
    } else {
        el.innerHTML = `
            <div class="auth-info">
                <button class="button button-secondary auth-btn" id="open-login-btn">Đăng nhập</button>
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
            closeModal('login-modal');
            renderAuthNav(data);
            msg.textContent = '';
            // Refresh movie list if on index
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

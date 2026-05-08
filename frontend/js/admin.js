const API = '/api';
const currentAdminUser = getCurrentUser();
const isAdmin = currentAdminUser?.role === 'ADMIN';
const isStaff = currentAdminUser?.role === 'STAFF';

function fmt(n) { return Number(n).toLocaleString('vi-VN') + ' VNĐ'; }
function fmtDate(d) {
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}
function fmtReleaseDate(val) {
    if (!val) return '–';
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    }
    // Fallback: already formatted string (dd-mm-yyyy or dd/mm/yyyy)
    return String(val).replace(/-/g, '/');
}
function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Auth guard ───────────────────────────────────────────────────────────────

(function guard() {
    const user = getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
        document.body.innerHTML = '<div style="padding:48px;text-align:center"><h2>Không có quyền truy cập.</h2><a href="index.html">Về trang chủ</a></div>';
        return;
    }
    document.getElementById('admin-user-label').textContent = `${user.full_name} (${user.role})`;
})();

// ── Logout ───────────────────────────────────────────────────────────────────

document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    if (typeof clearUser === 'function') clearUser();
    location.href = 'index.html';
});

// ── Tab routing ──────────────────────────────────────────────────────────────

const tabLoaders = {
    dashboard: loadDashboard,
    movies: loadMovies,
    showtimes: loadShowtimes,
    users: loadUsers,
    revenue: loadRevenue,
    coupons: loadCoupons,
    tickets: loadTickets
};

function activateTab(tab) {
    const btn = document.querySelector(`.menu-btn[data-tab="${tab}"]`);
    if (!btn) return;
    document.querySelectorAll('.menu-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('tab-title').textContent = btn.textContent.trim();
    history.replaceState(null, '', `#${tab}`);
    tabLoaders[tab]?.();
}

document.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

if (isStaff && !isAdmin) {
    document.querySelectorAll([
        '.menu-btn[data-tab="dashboard"]',
        '.menu-btn[data-tab="movies"]',
        '.menu-btn[data-tab="showtimes"]',
        '.menu-btn[data-tab="users"]',
        '.menu-btn[data-tab="revenue"]',
        '.menu-btn[data-tab="coupons"]'
    ].join(', ')).forEach((btn) => { btn.hidden = true; });
} else {
    // Admin không cần tab tra cứu vé
    document.getElementById('menu-tickets')?.setAttribute('hidden', 'hidden');
}

document.querySelectorAll('.dashboard-jump').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tabJump));
});

function showMsg(text, isError = false) {
    const el = document.getElementById('admin-msg');
    el.textContent = text;
    el.className = 'admin-msg' + (isError ? ' admin-msg-error' : ' admin-msg-ok');
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 4000);
}

async function apiFetch(url, opts = {}) {
    const headers = { ...(opts.headers || {}), ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) };
    const res = await fetch(API + url, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi không xác định');
    return data;
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────

async function loadDashboard() {
    try {
        const year = new Date().getFullYear();
        const [revData, movies, showtimes, byMovie] = await Promise.all([
            apiFetch(`/admin/revenue/monthly?year=${year}`),
            apiFetch('/admin/movies'),
            apiFetch('/admin/showtimes'),
            apiFetch('/admin/revenue/movies')
        ]);

        const now = new Date();
        const month = now.getMonth() + 1;
        const monthData = revData.revenue.find((r) => r.Thang === month);

        const upcomingShowtimes = showtimes
            .filter((s) => new Date(s.start_time) >= now)
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(0, 5);

        document.getElementById('stat-today-rev').textContent = fmt(monthData?.DoanhThu || 0);
        document.getElementById('stat-today-tickets').textContent = (monthData?.SoVeBan || 0) + ' vé';
        document.getElementById('stat-movies').textContent = movies.filter((m) => m.status === 'Đang chiếu').length;
        document.getElementById('stat-showtimes').textContent = showtimes.filter((s) => new Date(s.start_time) >= now).length;
        renderDashboardShowtimes(upcomingShowtimes);
        renderDashboardTopMovies(byMovie.slice(0, 5));
    } catch (e) {
        showMsg(e.message, true);
    }
}

function renderDashboardShowtimes(showtimes) {
    const el = document.getElementById('dashboard-showtimes');
    if (!el) return;
    el.innerHTML = showtimes.length ? showtimes.map((s) => `
        <article class="compact-row">
            <div>
                <strong>${escHtml(s.movie?.title || 'Chưa có tên phim')}</strong>
                <span>${fmtDate(s.start_time)} · ${escHtml(s.room_name || 'Phòng chiếu')}</span>
            </div>
            <div class="compact-value">${s.bookedSeats || 0}/${s.totalSeats || 0}</div>
        </article>
    `).join('') : '<p class="empty-row">Chưa có suất chiếu sắp tới.</p>';
}

function renderDashboardTopMovies(rows) {
    const el = document.getElementById('dashboard-top-movies');
    if (!el) return;
    el.innerHTML = rows.length ? rows.map((r) => `
        <article class="compact-row">
            <div>
                <strong>${escHtml(r.movie?.title || 'Không xác định')}</strong>
                <span>${r.total_tickets || 0} vé · ${r.total_bookings || 0} hóa đơn</span>
            </div>
            <div class="compact-value">${fmt(r.total_revenue || 0)}</div>
        </article>
    `).join('') : '<p class="empty-row">Chưa có dữ liệu doanh thu.</p>';
}

// ── MOVIES ───────────────────────────────────────────────────────────────────

let editingMovieId = null;
let allMovies = [];

async function loadMovies() {
    try {
        allMovies = await apiFetch('/admin/movies');
        renderMovies();
        if (!document.getElementById('movie-search')._wired) {
            document.getElementById('movie-search')._wired = true;
            document.getElementById('movie-search').addEventListener('input', renderMovies);
            document.getElementById('movie-status-filter').addEventListener('change', renderMovies);
        }
    } catch (e) { showMsg(e.message, true); }
}

function renderMovies() {
    const q      = (document.getElementById('movie-search')?.value || '').trim().toLowerCase();
    const status = document.getElementById('movie-status-filter')?.value || '';
    const movies = allMovies.filter((m) => {
        const matchQ = !q || m.title.toLowerCase().includes(q) || (m.genre || []).join(' ').toLowerCase().includes(q);
        const matchS = !status || m.status === status;
        return matchQ && matchS;
    });
    const tbody = document.getElementById('movie-tbody');
    tbody.innerHTML = movies.map((m) => `
        <tr>
            <td><strong>${escHtml(m.title)}</strong></td>
            <td>${(m.genre || []).join(', ')}</td>
            <td>${m.duration || '–'} phút</td>
            <td><span class="badge ${m.status === 'Đang chiếu' ? 'badge-green' : 'badge-yellow'}">${m.status}</span></td>
            <td>${fmtReleaseDate(m.release_date)}</td>
            <td class="action-cell">
                <button class="btn-icon" onclick="editMovie('${m._id}')">Sửa</button>
                <button class="btn-icon btn-danger" onclick="deleteMovie('${m._id}','${escHtml(m.title)}')">Xoá</button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="6" class="empty-row">${q || status ? 'Không có phim khớp.' : 'Chưa có phim nào.'}</td></tr>`;
}

document.getElementById('add-movie-btn').addEventListener('click', () => {
    if (!isAdmin) return showMsg('Nhân viên không có quyền thêm phim.', true);
    editingMovieId = null;
    document.getElementById('movie-form').reset();
    document.getElementById('movie-id-field').value = '';
    document.getElementById('movie-form-title').textContent = 'Thêm phim mới';
    document.getElementById('movie-submit-btn').textContent = 'Thêm';
    document.getElementById('movie-form-wrap').hidden = false;
});

document.getElementById('movie-cancel-btn').addEventListener('click', () => {
    document.getElementById('movie-form-wrap').hidden = true;
});

window.editMovie = async function (id) {
    if (!isAdmin) return showMsg('Nhân viên không có quyền sửa phim.', true);
    try {
        const m = await apiFetch(`/movies/${id}`);
        editingMovieId = id;
        const form = document.getElementById('movie-form');
        form.title.value = m.title || '';
        form.duration.value = m.duration || '';
        form.genre.value = (m.genre || []).join(', ');
        form.release_date.value = m.release_date ? m.release_date.slice(0, 10) : '';
        form.status.value = m.status || 'Đang chiếu';
        form.poster_url.value = m.poster_url || '';
        form.description.value = m.description || '';
        document.getElementById('movie-id-field').value = id;
        document.getElementById('movie-form-title').textContent = 'Sửa phim';
        document.getElementById('movie-submit-btn').textContent = 'Lưu thay đổi';
        document.getElementById('movie-form-wrap').hidden = false;
        document.getElementById('movie-form-wrap').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { showMsg(e.message, true); }
};

window.deleteMovie = async function (id, title) {
    if (!isAdmin) return showMsg('Nhân viên không có quyền xoá phim.', true);
    if (!confirm(`Xoá phim "${title}"?`)) return;
    try {
        await apiFetch(`/admin/movies/${id}`, { method: 'DELETE' });
        showMsg('Xoá phim thành công.');
        allMovies = allMovies.filter((m) => String(m._id) !== id);
        renderMovies();
    } catch (e) { showMsg(e.message, true); }
};

document.getElementById('movie-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
        title: fd.get('title'),
        duration: fd.get('duration'),
        genre: fd.get('genre').split(',').map((g) => g.trim()).filter(Boolean),
        release_date: fd.get('release_date'),
        status: fd.get('status'),
        poster_url: fd.get('poster_url'),
        description: fd.get('description')
    };

    try {
        const id = document.getElementById('movie-id-field').value;
        if (id) {
            await apiFetch(`/admin/movies/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            showMsg('Cập nhật phim thành công.');
        } else {
            await apiFetch('/admin/movies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            showMsg('Thêm phim thành công.');
        }
        document.getElementById('movie-form-wrap').hidden = true;
        loadMovies();
    } catch (err) { showMsg(err.message, true); }
});

// ── SHOWTIMES ────────────────────────────────────────────────────────────────

let allShowtimes = [];

async function loadShowtimes() {
    try {
        const [showtimes, movies, rooms] = await Promise.all([
            apiFetch('/admin/showtimes'),
            apiFetch('/admin/movies'),
            apiFetch('/admin/rooms')
        ]);

        allShowtimes = showtimes;

        const mSel = document.getElementById('st-movie-select');
        mSel.innerHTML = '<option value="">– Chọn phim –</option>' +
            movies.map((m) => `<option value="${m._id}">${escHtml(m.title)}</option>`).join('');

        const rSel = document.getElementById('st-room-select');
        rSel.innerHTML = '<option value="">– Chọn phòng –</option>' +
            rooms.map((r) => `<option value="${r.room_name}">${escHtml(r.room_name)}</option>`).join('');

        renderShowtimes();

        if (!document.getElementById('showtime-search')._wired) {
            document.getElementById('showtime-search')._wired = true;
            document.getElementById('showtime-search').addEventListener('input', renderShowtimes);
        }
    } catch (e) { showMsg(e.message, true); }
}

function renderShowtimes() {
    const q = (document.getElementById('showtime-search')?.value || '').trim().toLowerCase();
    const showtimes = allShowtimes.filter((s) => {
        if (!q) return true;
        return (s.movie?.title || '').toLowerCase().includes(q) ||
               s.room_name.toLowerCase().includes(q);
    });
    const tbody = document.getElementById('showtime-tbody');
    tbody.innerHTML = showtimes.map((s) => `
        <tr>
            <td>${escHtml(s.movie?.title || '–')}</td>
            <td>${escHtml(s.room_name)}</td>
            <td>${fmtDate(s.start_time)}</td>
            <td>${fmtDate(s.end_time)}</td>
            <td>${s.bookedSeats}/${s.totalSeats}</td>
            <td class="action-cell">
                <button class="btn-icon btn-danger" onclick="deleteShowtime('${s._id}')">Xoá</button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="6" class="empty-row">${q ? 'Không có suất chiếu khớp.' : 'Chưa có suất chiếu.'}</td></tr>`;
}

document.getElementById('add-showtime-btn').addEventListener('click', () => {
    if (!isAdmin) return showMsg('Nhân viên không có quyền tạo suất chiếu.', true);
    document.getElementById('showtime-form').reset();
    document.getElementById('showtime-form-wrap').hidden = false;
});
document.getElementById('showtime-cancel-btn').addEventListener('click', () => {
    document.getElementById('showtime-form-wrap').hidden = true;
});

window.deleteShowtime = async function (id) {
    if (!isAdmin) return showMsg('Nhân viên không có quyền xoá suất chiếu.', true);
    if (!confirm('Xoá suất chiếu này?')) return;
    try {
        await apiFetch(`/admin/showtimes/${id}`, { method: 'DELETE' });
        showMsg('Xoá suất chiếu thành công.');
        allShowtimes = allShowtimes.filter((s) => String(s._id) !== id);
        renderShowtimes();
    } catch (e) { showMsg(e.message, true); }
};

document.getElementById('showtime-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdmin) {
        showMsg('Nhân viên không có quyền tạo suất chiếu.', true);
        return;
    }
    const fd = new FormData(e.target);
    try {
        await apiFetch('/admin/showtimes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movieId: fd.get('movieId'),
                roomName: fd.get('roomName'),
                startTime: fd.get('startTime'),
                endTime: fd.get('endTime')
            })
        });
        showMsg('Tạo suất chiếu thành công.');
        document.getElementById('showtime-form-wrap').hidden = true;
        loadShowtimes();
    } catch (err) { showMsg(err.message, true); }
});

// ── USERS ────────────────────────────────────────────────────────────────────

async function loadUsers() {
    const q = document.getElementById('user-search').value.trim();
    const role = document.getElementById('user-role-filter').value;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (role) params.set('role', role);

    try {
        const users = await apiFetch(`/admin/users?${params}`);
        const tbody = document.getElementById('user-tbody');
        tbody.innerHTML = users.map((u) => {
            const isSelf = String(u._id) === String(currentAdminUser?._id);
            const isAdmin = u.role === 'ADMIN';
            const locked = isSelf || isAdmin;
            const lockTitle = isSelf ? 'Không thể đổi role của chính mình' : 'Không thể đổi role của admin';
            return `
            <tr>
                <td>${escHtml(u.full_name)}${isSelf ? ' <span style="color:var(--muted);font-size:.75rem">(bạn)</span>' : ''}</td>
                <td>${escHtml(u.email)}</td>
                <td>${escHtml(u.phone || '–')}</td>
                <td>
                    ${locked
                        ? `<span class="badge ${u.role === 'ADMIN' ? 'badge-green' : 'badge-yellow'}" title="${lockTitle}">${escHtml(u.role)}</span>`
                        : `<select class="role-select" onchange="updateUserRole('${u._id}', this.value)">
                            <option ${u.role === 'CUSTOMER' ? 'selected' : ''}>CUSTOMER</option>
                            <option ${u.role === 'STAFF' ? 'selected' : ''}>STAFF</option>
                            <option ${u.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                           </select>`
                    }
                </td>
                <td>${u.loyalty_points || 0}</td>
                <td></td>
            </tr>`;
        }).join('') || '<tr><td colspan="6" class="empty-row">Không có người dùng.</td></tr>';
    } catch (e) { showMsg(e.message, true); }
}

window.updateUserRole = async function (id, role) {
    if (!isAdmin) return showMsg('Chỉ admin mới được phân quyền người dùng.', true);
    try {
        await apiFetch(`/admin/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
        });
        showMsg('Cập nhật vai trò thành công.');
    } catch (e) { showMsg(e.message, true); }
};

document.getElementById('user-search').addEventListener('input', loadUsers);
document.getElementById('user-role-filter').addEventListener('change', loadUsers);

// ── REVENUE ──────────────────────────────────────────────────────────────────

let revenueReportCache = null;

async function loadRevenue() {
    const year = document.getElementById('rev-year').value || new Date().getFullYear();
    try {
        const [monthly, byMovie] = await Promise.all([
            apiFetch(`/admin/revenue/monthly?year=${year}`),
            apiFetch(`/admin/revenue/movies?from=${year}-01-01T00:00:00.000Z&to=${year}-12-31T23:59:59.999Z`)
        ]);

        const totalRev = monthly.revenue.reduce((s, r) => s + r.DoanhThu, 0);
        const totalTickets = monthly.revenue.reduce((s, r) => s + r.SoVeBan, 0);
        const maxRev = Math.max(...monthly.revenue.map((r) => r.DoanhThu), 1);
        revenueReportCache = { year, monthly: monthly.revenue, byMovie };

        document.getElementById('rev-summary').innerHTML = `
            <div class="stat-card"><span class="stat-label">Tổng doanh thu ${year}</span><strong>${fmt(totalRev)}</strong></div>
            <div class="stat-card"><span class="stat-label">Tổng vé bán ${year}</span><strong>${totalTickets} vé</strong></div>
        `;

        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        document.getElementById('rev-tbody').innerHTML = months.map((m) => {
            const row = monthly.revenue.find((r) => r.Thang === m);
            const rev = row?.DoanhThu || 0;
            const pct = Math.round((rev / maxRev) * 100);
            return `
                <tr>
                    <td>Tháng ${m}</td>
                    <td>${fmt(rev)}</td>
                    <td>${row?.SoVeBan || 0}</td>
                    <td><div class="rev-bar-wrap"><div class="rev-bar" style="width:${pct}%"></div><span>${pct}%</span></div></td>
                </tr>
            `;
        }).join('');

        document.getElementById('rev-movie-tbody').innerHTML = byMovie.map((r) => `
            <tr>
                <td>${escHtml(r.movie?.title || 'Không xác định')}</td>
                <td>${fmt(r.total_revenue)}</td>
                <td>${r.total_tickets}</td>
                <td>${r.total_bookings}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="empty-row">Chưa có dữ liệu.</td></tr>';
    } catch (e) { showMsg(e.message, true); }
}

function openRevenueExportModal() {
    document.getElementById('revenue-export-modal').hidden = false;
}

function closeRevenueExportModal() {
    document.getElementById('revenue-export-modal').hidden = true;
}

async function exportRevenueReport(type) {
    if (typeof XLSX === 'undefined') {
        showMsg('Không thể tải thư viện xuất Excel. Hãy kiểm tra kết nối mạng và tải lại trang.', true);
        return;
    }

    if (type !== 'monthly' && type !== 'movies') {
        showMsg('Lựa chọn không hợp lệ.', true);
        return;
    }

    const selectedYear = document.getElementById('rev-year').value || new Date().getFullYear();
    if (!revenueReportCache || String(revenueReportCache.year) !== String(selectedYear)) await loadRevenue();
    const data = revenueReportCache;
    if (!data) return;

    const workbook = XLSX.utils.book_new();
    if (type === 'monthly') {
        const rows = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const row = data.monthly.find((r) => r.Thang === month);
            return {
                'Tháng': `Tháng ${month}`,
                'Doanh thu': row?.DoanhThu || 0,
                'Số vé': row?.SoVeBan || 0
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Theo tháng');
        XLSX.writeFile(workbook, `thong-ke-doanh-thu-theo-thang-${data.year}.xlsx`);
        showMsg('Đã xuất file thống kê theo tháng.');
        return;
    }

    const rows = data.byMovie.map((r) => ({
        'Phim': r.movie?.title || 'Không xác định',
        'Doanh thu': r.total_revenue || 0,
        'Số vé': r.total_tickets || 0,
        'Số hoá đơn': r.total_bookings || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Doanh thu phim');
    XLSX.writeFile(workbook, `thong-ke-doanh-thu-phim-${data.year}.xlsx`);
    showMsg('Đã xuất file thống kê doanh thu phim.');
}

document.getElementById('rev-load-btn').addEventListener('click', loadRevenue);
document.getElementById('rev-export-btn').addEventListener('click', openRevenueExportModal);
document.querySelectorAll('[data-revenue-export-close]').forEach((el) => {
    el.addEventListener('click', closeRevenueExportModal);
});
document.querySelectorAll('[data-revenue-export-type]').forEach((btn) => {
    btn.addEventListener('click', async () => {
        closeRevenueExportModal();
        await exportRevenueReport(btn.dataset.revenueExportType);
    });
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('revenue-export-modal').hidden) {
        closeRevenueExportModal();
    }
});

// ── COUPONS ──────────────────────────────────────────────────────────────────

async function loadCoupons() {
    try {
        const coupons = await apiFetch('/admin/coupons');
        document.getElementById('coupon-tbody').innerHTML = coupons.map((c) => `
            <tr class="${c.isExpired ? 'row-dim' : ''}">
                <td><strong>${escHtml(c.code)}</strong></td>
                <td>${c.discount_type === 'PERCENT' ? '%' : 'Cố định'}</td>
                <td>${c.discount_type === 'PERCENT' ? c.discount_value + '%' : fmt(c.discount_value)}</td>
                <td>${c.used_count}/${c.max_uses}</td>
                <td>${new Date(c.end_date).toLocaleDateString('vi-VN')}</td>
                <td><span class="badge ${c.status === 'ACTIVE' && !c.isExpired ? 'badge-green' : 'badge-red'}">${c.isExpired ? 'Hết hạn' : c.status}</span></td>
                <td class="action-cell">
                    ${c.status === 'ACTIVE' ? `<button class="btn-icon btn-danger" onclick="deactivateCoupon('${c._id}')">Tắt</button>` : ''}
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="empty-row">Chưa có mã giảm giá.</td></tr>';
    } catch (e) { showMsg(e.message, true); }
}

document.getElementById('add-coupon-btn').addEventListener('click', () => {
    if (!isAdmin) return showMsg('Nhân viên không có quyền tạo mã giảm giá.', true);
    document.getElementById('coupon-form').reset();
    document.getElementById('coupon-form-wrap').hidden = false;
});
document.getElementById('coupon-cancel-btn').addEventListener('click', () => {
    document.getElementById('coupon-form-wrap').hidden = true;
});

window.deactivateCoupon = async function (id) {
    if (!isAdmin) return showMsg('Nhân viên không có quyền tắt mã giảm giá.', true);
    try {
        await apiFetch(`/admin/coupons/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'INACTIVE' })
        });
        showMsg('Đã tắt mã giảm giá.');
        loadCoupons();
    } catch (e) { showMsg(e.message, true); }
};

document.getElementById('coupon-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdmin) {
        showMsg('Nhân viên không có quyền tạo mã giảm giá.', true);
        return;
    }
    const fd = new FormData(e.target);
    try {
        await apiFetch('/admin/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: fd.get('code'),
                discount_type: fd.get('discount_type'),
                discount_value: fd.get('discount_value'),
                min_order_value: fd.get('min_order_value') || 0,
                max_uses: fd.get('max_uses'),
                start_date: fd.get('start_date'),
                end_date: fd.get('end_date')
            })
        });
        showMsg('Tạo mã giảm giá thành công.');
        document.getElementById('coupon-form-wrap').hidden = true;
        loadCoupons();
    } catch (err) { showMsg(err.message, true); }
});

// ── TICKETS (STAFF) ──────────────────────────────────────────────────────────

let allBookings = [];

async function loadTickets() {
    try {
        allBookings = await apiFetch('/admin/bookings');
        renderBookings();
        if (!document.getElementById('booking-search')._wired) {
            document.getElementById('booking-search')._wired = true;
            document.getElementById('booking-search').addEventListener('input', renderBookings);
            document.getElementById('booking-status-filter').addEventListener('change', renderBookings);
        }
    } catch (e) { showMsg(e.message, true); }
}

function renderBookings() {
    const q      = (document.getElementById('booking-search')?.value || '').trim().toLowerCase();
    const status = document.getElementById('booking-status-filter')?.value || '';
    const list   = allBookings.filter((b) => {
        const matchStatus = !status || b.status === status;
        const matchQ = !q ||
            String(b._id).toLowerCase().includes(q) ||
            (b.customer?.full_name || '').toLowerCase().includes(q) ||
            (b.customer?.email    || '').toLowerCase().includes(q) ||
            (b.showtime?.movie?.title || '').toLowerCase().includes(q);
        return matchStatus && matchQ;
    });
    const statusClass = (s) => s === 'Hoàn tất' ? 'badge-green' : s === 'Đã hủy' ? 'badge-red' : 'badge-yellow';
    document.getElementById('booking-tbody').innerHTML = list.map((b) => {
        const st    = b.showtime || {};
        const movie = st.movie   || {};
        const start = st.start_time ? fmtDate(st.start_time) : '–';
        return `
        <tr>
            <td style="font-size:.72rem;font-family:monospace">${escHtml(String(b._id))}</td>
            <td>
                <div>${escHtml(b.customer?.full_name || '–')}</div>
                <div style="font-size:.75rem;color:var(--muted)">${escHtml(b.customer?.email || '')}</div>
            </td>
            <td>${escHtml(movie.title || '–')}</td>
            <td>
                <div>${escHtml(st.room_name || '–')}</div>
                <div style="font-size:.75rem;color:var(--muted)">${start}</div>
            </td>
            <td>${escHtml((b.booked_seats || []).join(', '))}</td>
            <td>${fmt(b.total_price || 0)}</td>
            <td><span class="badge ${statusClass(b.status)}">${escHtml(b.status || '–')}</span></td>
            <td class="action-cell">
                <button class="btn-icon" onclick="downloadTicket(${JSON.stringify(b).replace(/"/g, '&quot;')})">Tải</button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="8" class="empty-row">${q || status ? 'Không có đặt vé khớp.' : 'Chưa có đặt vé nào.'}</td></tr>`;
}

window.downloadTicket = function(booking) {
    const st = booking.showtime || {};
    const movie = st.movie || booking.movie_snapshot || {};
    const start = st.start_time ? fmtDate(st.start_time) : '–';
    const lines = [
        '========================================',
        '         FISHSAUCE CINEMA               ',
        '========================================',
        `Ma dat ve  : ${booking._id}`,
        `Phim       : ${movie.title || '–'}`,
        `Phong chieu: ${st.room_name || booking.room_id || '–'}`,
        `Gio chieu  : ${start}`,
        `Ghe        : ${(booking.booked_seats || []).join(', ')}`,
        `Tong tien  : ${Number(booking.total_price || 0).toLocaleString('vi-VN')} VND`,
        `Thoi gian  : ${booking.created_at ? fmtDate(booking.created_at) : '–'}`,
        `Trang thai : ${booking.status || '–'}`,
        '========================================'
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ve-${booking._id}.txt`;
    a.click();
};

// ── Boot ─────────────────────────────────────────────────────────────────────

const staffTabs   = ['tickets'];
const adminTabs = ['dashboard', 'movies', 'showtimes', 'users', 'revenue', 'coupons'];
const validTabs   = isStaff && !isAdmin ? staffTabs : adminTabs;
const defaultTab  = validTabs[0];
const initialTab  = location.hash.replace('#', '');
activateTab(validTabs.includes(initialTab) ? initialTab : defaultTab);

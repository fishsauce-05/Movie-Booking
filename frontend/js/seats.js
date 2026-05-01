const API = '/api';

const params = new URLSearchParams(location.search);
const movieId = params.get('movie');
const preselectedShowtimeId = params.get('showtime');

let currentShowtimeId = preselectedShowtimeId || null;
let selectedSeats = [];
let bookedSeatCodes = new Set();
let seatPriceMap = {};
let basePrice = 0;
let discount = 0;
let validatedCoupon = null;

const sbMovie = document.getElementById('sb-movie');
const sbShowtime = document.getElementById('sb-showtime');
const sbRoom = document.getElementById('sb-room');
const sbSeats = document.getElementById('sb-seats');
const sbBasePrice = document.getElementById('sb-base-price');
const sbTotal = document.getElementById('sb-total');
const bookBtn = document.getElementById('book-btn');
const bookMsg = document.getElementById('book-msg');
const couponInput = document.getElementById('coupon-input');
const couponBtn = document.getElementById('coupon-btn');
const couponMsg = document.getElementById('coupon-msg');
const seatGrid = document.getElementById('seat-grid');
const seatSection = document.getElementById('seat-section');
const showtimeList = document.getElementById('showtime-list');
const SEAT_COLUMNS = 10;
const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E'];

function isVipSeatCode(seatCode) {
    const row = String(seatCode || '').charAt(0).toUpperCase();
    const column = Number(String(seatCode || '').slice(1));
    const vipRows = ['C', 'D', 'E'];
    return vipRows.includes(row) && column >= 3 && column <= 8;
}

function fmt(n) {
    return Number(n).toLocaleString('vi-VN') + ' VNĐ';
}

function fmtDate(d) {
    return new Intl.DateTimeFormat('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).format(new Date(d));
}

// ── Movie info ───────────────────────────────────────────────────────────────

async function loadMovieInfo(id) {
    try {
        const movie = await fetch(`${API}/movies/${id}`).then((r) => r.json());
        const bar = document.getElementById('movie-info');
        bar.innerHTML = `
            <img class="movie-info-poster" src="${movie.poster_url || ''}" alt="${movie.title}" onerror="this.style.display='none'">
            <div class="movie-info-text">
                <h2 class="movie-info-title">${movie.title}</h2>
                <div class="movie-info-meta">
                    <span>${movie.duration ? movie.duration + ' phút' : ''}</span>
                    <span>${(movie.genre || []).join(', ')}</span>
                    <span class="status-badge">${movie.status || ''}</span>
                </div>
            </div>
        `;
        sbMovie.textContent = movie.title;
    } catch {}
}

// ── Showtime picker ──────────────────────────────────────────────────────────

async function loadShowtimes(id) {
    try {
        const showtimes = await fetch(`${API}/showtimes/movie/${id}`).then((r) => r.json());
        if (!showtimes.length) {
            showtimeList.innerHTML = '<p class="muted">Không có suất chiếu nào sắp tới.</p>';
            return;
        }

        showtimeList.innerHTML = '';
        showtimes.forEach((st) => {
            const btn = document.createElement('button');
            btn.className = 'showtime-btn';
            if (st._id === currentShowtimeId) btn.classList.add('active');
            btn.dataset.id = st._id;
            btn.innerHTML = `
                <strong>${fmtDate(st.start_time)}</strong>
                <span>${st.room_name}</span>
                <span class="seat-count">${st.availableSeats}/${st.totalSeats} ghế trống</span>
            `;
            btn.addEventListener('click', () => selectShowtime(st));
            showtimeList.appendChild(btn);
        });

        if (currentShowtimeId) {
            const found = showtimes.find((s) => s._id === currentShowtimeId);
            if (found) selectShowtime(found);
        }
    } catch {}
}

async function selectShowtime(st) {
    currentShowtimeId = st._id;
    document.querySelectorAll('.showtime-btn').forEach((b) => b.classList.remove('active'));
    const btn = document.querySelector(`.showtime-btn[data-id="${st._id}"]`);
    if (btn) btn.classList.add('active');

    sbShowtime.textContent = fmtDate(st.start_time);
    sbRoom.textContent = st.room_name;

    resetSelection();
    await loadSeatGrid(st._id);
}

// ── Seat grid ────────────────────────────────────────────────────────────────

async function loadSeatGrid(showtimeId) {
    try {
        seatGrid.innerHTML = '<p class="muted">Đang tải sơ đồ ghế...</p>';
        seatSection.hidden = false;

        const data = await fetch(`${API}/showtimes/${showtimeId}`).then((r) => r.json());
        const seats = Array.isArray(data.seats) ? data.seats : [];

        seatPriceMap = {};
        bookedSeatCodes = new Set(
            Array.isArray(data.bookedSeats)
                ? data.bookedSeats
                : seats.filter((s) => s.status === 'Đã được đặt' || s.status === 'Đang giữ chờ thanh toán').map((s) => s.seat_code)
        );
        seats.forEach((s) => { seatPriceMap[s.seat_code] = s.price; });

        const seatMap = new Map(seats.map((seat) => [seat.seat_code, seat]));
        seatGrid.innerHTML = '';
        SEAT_ROWS.forEach((rowKey) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'seat-row';

            const label = document.createElement('span');
            label.className = 'row-label';
            label.textContent = rowKey;
            rowEl.appendChild(label);

            for (let column = 1; column <= SEAT_COLUMNS; column += 1) {
                const seatCode = `${rowKey}${column}`;
                const seat = seatMap.get(seatCode) || {
                    seat_code: seatCode,
                    type: isVipSeatCode(seatCode) ? 'VIP' : 'NORMAL',
                    price: 0,
                    status: bookedSeatCodes.has(seatCode) ? 'Đã được đặt' : 'Trống'
                };
                const isVip = isVipSeatCode(seat.seat_code) || seat.type === 'VIP';

                const el = document.createElement('button');
                el.className = 'seat';
                el.dataset.code = seat.seat_code;
                el.dataset.status = seat.status;
                el.dataset.type = isVip ? 'VIP' : seat.type;
                el.dataset.price = seat.price;
                el.title = `${seat.seat_code} – ${isVip ? 'VIP' : seat.type} – ${fmt(seat.price)}`;
                el.textContent = seat.seat_code.slice(1);

                if (seat.status === 'Đã được đặt' || seat.status === 'Đang giữ chờ thanh toán' || bookedSeatCodes.has(seat.seat_code)) {
                    el.classList.add('seat-booked');
                    el.disabled = true;
                } else if (isVip) {
                    el.classList.add('seat-vip');
                } else {
                    el.classList.add('seat-empty');
                }

                el.addEventListener('click', () => toggleSeat(el, seat));
                rowEl.appendChild(el);
            }

            seatGrid.appendChild(rowEl);
        });
    } catch {
        seatGrid.innerHTML = '<p class="error-state">Không thể tải sơ đồ ghế.</p>';
    }
}

function toggleSeat(el, seat) {
    if (el.disabled || seat.status === 'Đã được đặt' || bookedSeatCodes.has(seat.seat_code)) return;

    const code = seat.seat_code;
    const idx = selectedSeats.indexOf(code);

    if (idx === -1) {
        if (selectedSeats.length >= 8) {
            showBookMsg('Tối đa 8 ghế mỗi lần đặt.', true);
            return;
        }
        selectedSeats.push(code);
        el.classList.remove('seat-empty', 'seat-vip');
        el.classList.add('seat-selected');
    } else {
        selectedSeats.splice(idx, 1);
        el.classList.remove('seat-selected');
        el.classList.add(isVipSeatCode(code) ? 'seat-vip' : 'seat-empty');
    }

    recalcPrice();
}

function recalcPrice() {
    basePrice = selectedSeats.reduce((sum, code) => sum + (seatPriceMap[code] || 0), 0);
    discount = 0;
    validatedCoupon = null;
    couponMsg.textContent = '';
    couponMsg.className = 'coupon-msg';

    updateSidebar();
}

function updateSidebar() {
    sbSeats.textContent = selectedSeats.length ? selectedSeats.join(', ') : 'Chưa chọn ghế';
    sbBasePrice.textContent = fmt(basePrice);
    sbTotal.textContent = fmt(Math.max(0, basePrice - discount));
    bookBtn.disabled = selectedSeats.length === 0;
    clearBookMsg();
}

function resetSelection() {
    selectedSeats = [];
    bookedSeatCodes = new Set();
    seatPriceMap = {};
    basePrice = 0;
    discount = 0;
    validatedCoupon = null;
    couponInput.value = '';
    couponMsg.textContent = '';
    couponMsg.className = 'coupon-msg';
    updateSidebar();
}

// ── Coupon ───────────────────────────────────────────────────────────────────

couponBtn.addEventListener('click', async () => {
    const code = couponInput.value.trim();
    if (!code) return;
    if (!basePrice) {
        setCouponMsg('Vui lòng chọn ghế trước.', true);
        return;
    }

    couponBtn.disabled = true;
    couponBtn.textContent = '...';
    try {
        const res = await fetch(`${API}/coupons/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, totalPrice: basePrice })
        });
        const data = await res.json();

        if (!res.ok) {
            setCouponMsg(data.message, true);
            discount = 0;
            validatedCoupon = null;
        } else {
            discount = data.discountAmount;
            validatedCoupon = code;
            setCouponMsg(`Giảm ${fmt(discount)} ✓`, false);
        }
        updateSidebar();
    } catch {
        setCouponMsg('Không thể kiểm tra mã giảm giá.', true);
    } finally {
        couponBtn.disabled = false;
        couponBtn.textContent = 'Áp dụng';
    }
});

function setCouponMsg(msg, isError) {
    couponMsg.textContent = msg;
    couponMsg.className = 'coupon-msg' + (isError ? ' coupon-error' : ' coupon-ok');
}

// ── Booking ──────────────────────────────────────────────────────────────────

bookBtn.addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) {
        document.getElementById('login-required-modal').hidden = false;
        return;
    }

    if (!currentShowtimeId || !selectedSeats.length) return;

    bookBtn.disabled = true;
    bookBtn.textContent = 'Đang xử lý...';
    clearBookMsg();

    try {
        const res = await fetch(`${API}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
            body: JSON.stringify({
                customerId: user._id,
                showtimeId: currentShowtimeId,
                seatsToBook: selectedSeats,
                couponCode: validatedCoupon || undefined
            })
        });
        const data = await res.json();

        if (!res.ok) {
            showBookMsg(data.message, true);
            // Reload seat grid to reflect updated statuses
            await loadSeatGrid(currentShowtimeId);
            resetSelection();
        } else {
            showBookMsg(`✓ ${data.message} Mã hoá đơn: ${data.bookingId}`, false);
            await loadSeatGrid(currentShowtimeId);
            resetSelection();
            // Update loyalty points shown in nav
            renderAuthNav(await fetch(`${API}/auth/${user._id}`, {
                headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
            }).then((r) => r.json()));
        }
    } catch {
        showBookMsg('Lỗi hệ thống. Vui lòng thử lại.', true);
    } finally {
        bookBtn.disabled = selectedSeats.length === 0;
        bookBtn.textContent = 'Đặt vé';
    }
});

function showBookMsg(msg, isError) {
    bookMsg.textContent = msg;
    bookMsg.className = 'book-msg' + (isError ? ' book-msg-error' : ' book-msg-ok');
}

function clearBookMsg() {
    bookMsg.textContent = '';
    bookMsg.className = 'book-msg';
}

// ── Init ─────────────────────────────────────────────────────────────────────

(async function init() {
    renderAuthNav(getCurrentUser());

    if (!movieId && !preselectedShowtimeId) {
        document.getElementById('movie-info').innerHTML = '<p class="error-state">Thiếu thông tin phim. Vui lòng chọn phim từ trang chủ.</p>';
        return;
    }

    if (movieId) {
        await Promise.all([loadMovieInfo(movieId), loadShowtimes(movieId)]);
    } else if (preselectedShowtimeId) {
        const st = await fetch(`${API}/showtimes/${preselectedShowtimeId}`).then((r) => r.json());
        if (st.movie) {
            sbMovie.textContent = st.movie.title;
            document.getElementById('movie-info').innerHTML = `
                <div class="movie-info-text"><h2 class="movie-info-title">${st.movie.title}</h2></div>
            `;
        }
        await selectShowtime(st);
    }
})();

// Block STAFF/ADMIN — họ dùng admin.html
(function guardCustomerPage() {
    if (typeof getCurrentUser !== 'function') return;
    const u = getCurrentUser();
    if (u && (u.role === 'ADMIN' || u.role === 'STAFF')) {
        location.replace('admin.html');
    }
})();

const API_BASE_URL = '/api';

const moviesSection = document.getElementById('movies');
const searchInput = document.getElementById('search-input');
const genreFilter = document.getElementById('genre-filter');
const statusBox = document.getElementById('status-box');
const movieCount = document.getElementById('movie-count');
const moviesPagination = document.getElementById('index-movies-pagination');

let allMovies = [];
let activeGenres = [];
let activeKeyword = '';
let reviewMovieId = null;
let showtimeFilteredIds = null; // null = no filter; Set of movie IDs when active
let activeMinRating = null;     // null = no filter; number when active
let currentMoviesPage = 1;
const MOVIES_PAGE_SIZE = 9;
function normalizeGenres(movie) {
    if (Array.isArray(movie?.genre)) return movie.genre.filter(Boolean).map((g) => String(g).trim());
    if (typeof movie?.genre === 'string' && movie.genre.trim()) return movie.genre.split(',').map((g) => g.trim()).filter(Boolean);
    return [];
}

function uniqueGenres(movies) {
    const genres = new Set();
    movies.forEach((m) => normalizeGenres(m).forEach((g) => genres.add(g)));
    return Array.from(genres).sort((a, b) => a.localeCompare(b, 'vi'));
}

function formatDate(value) {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function getMovieTitle(movie) { return movie?.title || movie?.name || 'Untitled'; }
function getPosterUrl(movie) { return movie?.poster_url || movie?.posterUrl || ''; }

function buildMovieCard(movie) {
    const genres = normalizeGenres(movie);
    const title = getMovieTitle(movie);
    const posterUrl = getPosterUrl(movie);
    const releaseDate = formatDate(movie?.release_date);
    const duration = movie?.duration ? `${movie.duration} phút` : 'Chưa rõ';
    const status = movie?.status || 'Đang chiếu';
    const id = movie._id;

    const card = document.createElement('article');
    card.className = 'movie-card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
        <div class="movie-poster">
            ${posterUrl
                ? `<img src="${posterUrl}" alt="Poster ${title}" loading="lazy">`
                : `<div class="movie-fallback">${title.charAt(0).toUpperCase()}</div>`}
        </div>
        <div class="movie-body">
            <div class="movie-badges">${genres.length ? genres.map((g) => `<span class="movie-badge">${escHtml(g)}</span>`).join('') : '<span class="movie-badge">Phim</span>'}</div>
            <h3 class="movie-title">${title}</h3>
            <div class="movie-meta">
                <span>${duration}</span>
                <span>Khởi chiếu: ${releaseDate}</span>
            </div>
            <div class="movie-availability">
                <span>Trạng thái: ${status}</span>
            </div>
            <div class="movie-actions">
                <a class="button button-primary" href="seats.html?movie=${id}">Đặt vé</a>
                <button class="button button-secondary review-trigger" data-id="${id}" data-title="${title}">Đánh giá</button>
            </div>
        </div>
    `;

    card.querySelector('.review-trigger').addEventListener('click', (e) => { e.stopPropagation(); openReviews(id, title); });
    card.querySelector('.button-primary').addEventListener('click', (e) => e.stopPropagation());
    card.addEventListener('click', () => openMovieDetail(movie));
    return card;
}

function setStatus(message, isError = false) {
    if (!statusBox) return;
    statusBox.hidden = false;
    statusBox.textContent = message;
    statusBox.classList.toggle('error-state', isError);
}

function clearStatus() {
    if (!statusBox) return;
    statusBox.hidden = true;
    statusBox.textContent = '';
    statusBox.classList.remove('error-state');
}

function applyFilters() {
    const keyword = activeKeyword.trim().toLowerCase();
    return allMovies.filter((movie) => {
        const title  = getMovieTitle(movie).toLowerCase();
        const genres = normalizeGenres(movie).map((g) => g.toLowerCase());
        const matchesKeyword  = !keyword || title.includes(keyword) || genres.some((g) => g.includes(keyword));
        const matchesGenre    = !activeGenres.length || activeGenres.some((g) => genres.includes(g.toLowerCase()));
        const matchesShowtime = !showtimeFilteredIds || showtimeFilteredIds.has(String(movie._id));
        const matchesRating   = activeMinRating === null || (movie.rating_points || 0) >= activeMinRating;
        return matchesKeyword && matchesGenre && matchesShowtime && matchesRating;
    });
}

function renderMovies(movies) {
    if (!moviesSection) return;
    const totalPages = Math.max(Math.ceil(movies.length / MOVIES_PAGE_SIZE), 1);
    if (currentMoviesPage > totalPages) currentMoviesPage = totalPages;
    const start = (currentMoviesPage - 1) * MOVIES_PAGE_SIZE;
    const pageMovies = movies.slice(start, start + MOVIES_PAGE_SIZE);

    moviesSection.innerHTML = '';
    if (!pageMovies.length) {
        moviesSection.innerHTML = `<article class="empty-state"><h3>Không tìm thấy phim phù hợp</h3><p>Hãy thử đổi từ khóa hoặc bộ lọc.</p></article>`;
        renderMoviesPagination(0);
        return;
    }
    pageMovies.forEach((m) => moviesSection.appendChild(buildMovieCard(m)));
    renderMoviesPagination(movies.length);
}

function renderMoviesPagination(totalItems) {
    if (!moviesPagination) return;
    const totalPages = Math.ceil(totalItems / MOVIES_PAGE_SIZE);
    if (totalPages <= 1) {
        moviesPagination.innerHTML = '';
        return;
    }

    const pages = getPaginationItems(currentMoviesPage, totalPages);
    moviesPagination.innerHTML = `
        <button type="button" class="page-btn" data-page="${currentMoviesPage - 1}" ${currentMoviesPage === 1 ? 'disabled' : ''}>Trước</button>
        ${pages.map((page) => page === '...'
            ? '<span class="page-ellipsis">...</span>'
            : `<button type="button" class="page-btn ${page === currentMoviesPage ? 'active' : ''}" data-page="${page}" aria-label="Trang ${page}" ${page === currentMoviesPage ? 'aria-current="page"' : ''}>${page}</button>`
        ).join('')}
        <button type="button" class="page-btn" data-page="${currentMoviesPage + 1}" ${currentMoviesPage === totalPages ? 'disabled' : ''}>Sau</button>
    `;

    moviesPagination.querySelectorAll('.page-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const page = Number(btn.dataset.page);
            if (!page || page === currentMoviesPage || page < 1 || page > totalPages) return;
            currentMoviesPage = page;
            refreshMovies(false);
            moviesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function getPaginationItems(page, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (page >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', page - 1, page, page + 1, '...', total];
}

function refreshMovies(resetPage = true) {
    if (resetPage) currentMoviesPage = 1;
    const filtered = applyFilters();
    if (movieCount) movieCount.textContent = String(filtered.length);
    renderMovies(filtered);
}

function wireFilters() {
    searchInput?.addEventListener('input', (e) => { activeKeyword = e.target.value; refreshMovies(); });
    genreFilter?.addEventListener('change', (e) => {
        activeGenres = e.target.value === 'all' ? [] : [e.target.value];
        refreshMovies();
    });

    // ── Showtime date/time filter ─────────────────────────────────────────────
    document.getElementById('filter-showtime-btn')?.addEventListener('click', async () => {
        const date      = document.getElementById('filter-date').value;
        const timeStart = document.getElementById('filter-time-start').value;
        const timeEnd   = document.getElementById('filter-time-end').value;
        if (!date && !timeStart && !timeEnd) return;

        try {
            const params = new URLSearchParams();
            if (date)      params.set('date', date);
            if (timeStart) params.set('timeStart', timeStart);
            if (timeEnd)   params.set('timeEnd', timeEnd);

            const res      = await fetch(`/api/showtimes/filter?${params}`);
            const data     = await res.json();
            const movieIds = Array.isArray(data) ? data.map((s) => String(s.movie_id)) : [];
            showtimeFilteredIds = new Set(movieIds);
            document.getElementById('filter-showtime-reset').hidden = false;
            refreshMovies();
        } catch { /* ignore */ }
    });

    document.getElementById('filter-showtime-reset')?.addEventListener('click', () => {
        showtimeFilteredIds = null;
        document.getElementById('filter-date').value       = '';
        document.getElementById('filter-time-start').value = '';
        document.getElementById('filter-time-end').value   = '';
        document.getElementById('filter-showtime-reset').hidden = true;
        refreshMovies();
    });

    // ── Star rating filter ────────────────────────────────────────────────────
    const starResetBtn = document.getElementById('star-reset-btn');

    function clearStarActive() {
        document.querySelectorAll('.star-filter-btn').forEach((b) => b.classList.remove('active'));
        if (starResetBtn) starResetBtn.hidden = true;
        activeMinRating = null;
    }

    document.querySelectorAll('.star-filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const val = Number(btn.dataset.val);
            if (activeMinRating === val) {
                clearStarActive();
            } else {
                clearStarActive();
                activeMinRating = val;
                btn.classList.add('active');
                if (starResetBtn) starResetBtn.hidden = false;
            }
            refreshMovies();
        });
    });

    starResetBtn?.addEventListener('click', () => {
        clearStarActive();
        refreshMovies();
    });
}

function populateGenres(movies) {
    if (!genreFilter) return;
    const genres = uniqueGenres(movies);
    genreFilter.innerHTML = '<option value="all">Tất cả</option>' +
        genres.map((g) => `<option value="${g}">${g}</option>`).join('');
}

async function fetchMovies() {
    try {
        clearStatus();
        setStatus('Đang tải danh sách phim...');
        const res = await fetch(`${API_BASE_URL}/movies?status=all&limit=100`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        allMovies = Array.isArray(payload) ? payload : (payload?.data || payload?.movies || []);
        populateGenres(allMovies);
        clearStatus();
        refreshMovies();
    } catch (error) {
        allMovies = [];
        setStatus('Không thể tải danh sách phim.', true);
        if (moviesSection) moviesSection.innerHTML = `<article class="empty-state error-state"><h3>Không thể tải dữ liệu</h3><p>${error.message}</p></article>`;
    }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

async function openReviews(movieId, title) {
    reviewMovieId = movieId;
    const section = document.getElementById('review-section');
    document.getElementById('review-movie-title').textContent = `Đánh giá: ${title}`;
    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth' });
    await loadReviews(movieId);
}

document.getElementById('close-review-btn')?.addEventListener('click', () => {
    document.getElementById('review-section').hidden = true;
});

async function loadReviews(movieId) {
    const avgEl = document.getElementById('review-avg');
    const listEl = document.getElementById('review-list');
    const formWrap = document.getElementById('review-form-wrap');

    avgEl.textContent = 'Đang tải...';
    listEl.innerHTML = '';

    try {
        const data = await fetch(`${API_BASE_URL}/reviews/movie/${movieId}`).then((r) => r.json());

        avgEl.innerHTML = `
            <span class="review-stars">${renderStars(data.avgRating)}</span>
            <span class="review-avg-num">${data.avgRating}/5</span>
            <span class="review-total">(${data.total} đánh giá)</span>
        `;

        listEl.innerHTML = data.reviews.length
            ? data.reviews.map((r) => `
                <div class="review-card">
                    <div class="review-top">
                        <strong>${escHtml(r.customer_name)}</strong>
                        <span class="review-stars-sm">${renderStars(r.rating)}</span>
                        <span class="review-date">${new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                        ${canDeleteReview(r) ? `<button class="btn-icon btn-danger review-del-btn" data-id="${r._id}">Xoá</button>` : ''}
                    </div>
                    <p class="review-comment">${escHtml(r.comment)}</p>
                </div>
            `).join('')
            : '<p class="muted">Chưa có đánh giá nào.</p>';

        listEl.querySelectorAll('.review-del-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('Xoá đánh giá này?')) return;
                await fetch(`${API_BASE_URL}/reviews/${btn.dataset.id}`, {
                    method: 'DELETE',
                    headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
                });
                loadReviews(movieId);
            });
        });

        const user = getCurrentUser();
        if (user && user.role === 'CUSTOMER') {
            formWrap.innerHTML = `
                <h4>Viết đánh giá của bạn</h4>
                <form id="write-review-form" class="admin-form">
                    <div class="star-picker" id="star-picker">
                        ${[1,2,3,4,5].map((n) => `<button type="button" class="star-btn" data-val="${n}">★</button>`).join('')}
                    </div>
                    <input type="hidden" id="review-rating-val" value="0">
                    <label class="form-field">Nội dung<textarea name="comment" rows="3" placeholder="Chia sẻ cảm nhận của bạn..."></textarea></label>
                    <p id="review-write-msg" class="form-msg"></p>
                    <button type="submit" class="button button-primary">Gửi đánh giá</button>
                </form>
            `;
            wireStarPicker();
            document.getElementById('write-review-form').addEventListener('submit', submitReview);
        }
    } catch {
        avgEl.textContent = '';
        listEl.innerHTML = '<p class="error-state">Không thể tải đánh giá.</p>';
    }
}

function wireStarPicker() {
    const btns = document.querySelectorAll('.star-btn');
    btns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const val = Number(btn.dataset.val);
            document.getElementById('review-rating-val').value = val;
            btns.forEach((b) => b.classList.toggle('active', Number(b.dataset.val) <= val));
        });
    });
}

async function submitReview(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const msg = document.getElementById('review-write-msg');
    const rating = Number(document.getElementById('review-rating-val').value);
    const comment = e.target.comment.value.trim();

    if (!rating) { msg.textContent = 'Vui lòng chọn số sao.'; msg.className = 'form-msg form-msg-error'; return; }

    try {
        const res = await fetch(`${API_BASE_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
            body: JSON.stringify({ movieId: reviewMovieId, customerId: user._id, rating, comment })
        });
        const data = await res.json();
        if (!res.ok) { msg.textContent = data.message; msg.className = 'form-msg form-msg-error'; return; }
        msg.textContent = 'Đánh giá thành công!'; msg.className = 'form-msg form-msg-ok';
        e.target.reset();
        loadReviews(reviewMovieId);
    } catch { msg.textContent = 'Lỗi hệ thống.'; msg.className = 'form-msg form-msg-error'; }
}

function canDeleteReview(review) {
    const user = getCurrentUser();
    if (!user) return false;
    return user.role === 'ADMIN' || String(review.customer_id) === String(user._id);
}

function renderStars(rating) {
    const full = Math.round(rating);
    return [1,2,3,4,5].map((n) => `<span class="${n <= full ? 'star-on' : 'star-off'}">★</span>`).join('');
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Movie detail modal ────────────────────────────────────────────────────────

function fmtDuration(mins) {
    if (!mins) return 'Chưa rõ';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h} giờ ${m} phút` : `${m} phút`;
}

function openMovieDetail(movie) {
    ensureDetailModal();
    const genres   = normalizeGenres(movie);
    const posterUrl = getPosterUrl(movie);
    const title    = getMovieTitle(movie);
    document.getElementById('md-poster').src        = posterUrl || '';
    document.getElementById('md-poster').alt        = title;
    document.getElementById('md-poster').style.display = posterUrl ? '' : 'none';
    document.getElementById('md-title').textContent   = title;
    document.getElementById('md-genre').textContent   = genres.join(', ') || '–';
    document.getElementById('md-duration').textContent = fmtDuration(movie.duration);
    document.getElementById('md-status').textContent  = movie.status || '–';
    document.getElementById('md-desc').textContent    = movie.description || 'Chưa có mô tả.';
    document.getElementById('md-book-btn').href       = `seats.html?movie=${movie._id}`;
    document.getElementById('movie-detail-modal').hidden = false;
}

function ensureDetailModal() {
    if (document.getElementById('movie-detail-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="movie-detail-modal" class="modal-overlay" hidden>
            <div class="modal-box" style="max-width:760px;display:flex;gap:24px;padding:0;overflow:hidden;align-items:stretch">
                <div style="flex:0 0 260px;background:#111">
                    <img id="md-poster" style="width:100%;height:100%;object-fit:cover;display:block" src="" alt="">
                </div>
                <div style="flex:1;padding:32px 28px;overflow-y:auto">
                    <button class="modal-close" type="button" aria-label="Đóng" style="position:absolute;top:12px;right:12px">×</button>
                    <h2 id="md-title" style="margin:0 0 12px;font-size:1.4rem"></h2>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
                        <span style="color:var(--muted);font-size:.85rem">Thể loại: </span><span id="md-genre" style="font-size:.85rem"></span>
                    </div>
                    <div style="display:flex;gap:24px;margin-bottom:16px;font-size:.85rem;color:var(--muted)">
                        <span>⏱ <span id="md-duration"></span></span>
                        <span>📽 <span id="md-status"></span></span>
                    </div>
                    <p id="md-desc" style="font-size:.9rem;line-height:1.6;color:var(--muted);margin:0 0 24px"></p>
                    <a id="md-book-btn" class="button button-primary" href="#">Đặt vé ngay</a>
                </div>
            </div>
        </div>
    `);
    const modal = document.getElementById('movie-detail-modal');
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
    modal.querySelector('.modal-close').addEventListener('click', () => { modal.hidden = true; });
}

document.addEventListener('DOMContentLoaded', () => {
    renderAuthNav(getCurrentUser());
    wireFilters();
    fetchMovies();
});

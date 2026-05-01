const API_BASE_URL = '/api';

const moviesSection = document.getElementById('movies');
const searchInput = document.getElementById('search-input');
const genreFilter = document.getElementById('genre-filter');
const statusBox = document.getElementById('status-box');
const movieCount = document.getElementById('movie-count');

let allMovies = [];
let activeGenres = [];
let activeKeyword = '';
let reviewMovieId = null;

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
    card.innerHTML = `
        <div class="movie-poster">
            ${posterUrl
                ? `<img src="${posterUrl}" alt="Poster ${title}" loading="lazy">`
                : `<div class="movie-fallback">${title.charAt(0).toUpperCase()}</div>`}
        </div>
        <div class="movie-body">
            <span class="movie-badge">${genres[0] || 'Phim'}</span>
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

    card.querySelector('.review-trigger').addEventListener('click', () => openReviews(id, title));
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
        const title = getMovieTitle(movie).toLowerCase();
        const genres = normalizeGenres(movie).map((g) => g.toLowerCase());
        const matchesKeyword = !keyword || title.includes(keyword) || genres.some((g) => g.includes(keyword));
        const matchesGenre = !activeGenres.length || activeGenres.some((g) => genres.includes(g.toLowerCase()));
        return matchesKeyword && matchesGenre;
    });
}

function renderMovies(movies) {
    if (!moviesSection) return;
    moviesSection.innerHTML = '';
    if (!movies.length) {
        moviesSection.innerHTML = `<article class="empty-state"><h3>Không tìm thấy phim phù hợp</h3><p>Hãy thử đổi từ khóa hoặc bộ lọc.</p></article>`;
        return;
    }
    movies.forEach((m) => moviesSection.appendChild(buildMovieCard(m)));
}

function refreshMovies() {
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
        const res = await fetch(`${API_BASE_URL}/movies`);
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
    return user.role === 'MANAGER' || String(review.customer_id) === String(user._id);
}

function renderStars(rating) {
    const full = Math.round(rating);
    return [1,2,3,4,5].map((n) => `<span class="${n <= full ? 'star-on' : 'star-off'}">★</span>`).join('');
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', () => {
    renderAuthNav(getCurrentUser());
    wireFilters();
    fetchMovies();
});

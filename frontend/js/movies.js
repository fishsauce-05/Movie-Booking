// Block STAFF/ADMIN
(function guard() {
    if (typeof getCurrentUser !== 'function') return;
    const u = getCurrentUser();
    if (u && (u.role === 'ADMIN' || u.role === 'STAFF')) location.replace('admin.html');
})();

const API = '/api';
let currentStatus = 'Đang chiếu';
let allMovies = [];
let currentPage = 1;
let totalMovies = 0;
let totalPages = 1;
const PAGE_SIZE = 9;

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function fmtDuration(mins) {
    if (!mins) return 'Chưa rõ';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h} giờ ${m} phút` : `${m} phút`;
}
function normalizeGenres(movie) {
    if (Array.isArray(movie?.genre)) return movie.genre.filter(Boolean).map((g) => String(g).trim());
    if (typeof movie?.genre === 'string') return movie.genre.split(',').map((g) => g.trim()).filter(Boolean);
    return [];
}

async function fetchMovies() {
    try {
        const params = new URLSearchParams({
            status: currentStatus,
            page: String(currentPage),
            limit: String(PAGE_SIZE),
            meta: '1'
        });
        const res  = await fetch(`${API}/movies?${params}`);
        const data = await res.json();
        allMovies  = Array.isArray(data) ? data : (data.data || data.movies || []);
        totalMovies = Number(data.total || allMovies.length);
        totalPages  = Number(data.totalPages || 1);
        renderMovies();
    } catch {
        document.getElementById('all-movies').innerHTML = '<p class="error-state">Không thể tải danh sách phim.</p>';
        document.getElementById('movies-pagination').innerHTML = '';
    }
}

function sortMovies(movies) {
    return [...movies].sort((a, b) => {
        const seatsA = a.total_booked_seats || 0;
        const seatsB = b.total_booked_seats || 0;
        if (seatsB !== seatsA) return seatsB - seatsA;
        const custA = a.total_customers || 0;
        const custB = b.total_customers || 0;
        if (custB !== custA) return custB - custA;
        return (a.title || '').localeCompare(b.title || '', 'vi');
    });
}

function renderMovies() {
    const sorted   = sortMovies(allMovies);
    const grid     = document.getElementById('all-movies');
    const countEl  = document.getElementById('movies-count');
    const start    = totalMovies ? ((currentPage - 1) * PAGE_SIZE) + 1 : 0;
    const end      = Math.min(currentPage * PAGE_SIZE, totalMovies);
    countEl.textContent = totalMovies ? `${start}-${end} / ${totalMovies} phim` : '0 phim';

    grid.innerHTML = '';
    if (!sorted.length) {
        grid.innerHTML = '<article class="empty-state"><h3>Không có phim nào.</h3></article>';
        renderPagination();
        return;
    }
    sorted.forEach((movie) => {
        const genres   = normalizeGenres(movie);
        const posterUrl = movie.poster_url || '';
        const title    = movie.title || 'Untitled';
        const card     = document.createElement('article');
        card.className = 'movie-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div class="movie-poster">
                ${posterUrl
                    ? `<img src="${escHtml(posterUrl)}" alt="Poster ${escHtml(title)}" loading="lazy">`
                    : `<div class="movie-fallback">${escHtml(title.charAt(0).toUpperCase())}</div>`}
            </div>
            <div class="movie-body">
                <div class="movie-badges">${genres.length ? genres.map((g) => `<span class="movie-badge">${escHtml(g)}</span>`).join('') : '<span class="movie-badge">Phim</span>'}</div>
                <h3 class="movie-title">${escHtml(title)}</h3>
                <div class="movie-meta">
                    <span>${escHtml(fmtDuration(movie.duration))}</span>
                    <span>Trạng thái: ${escHtml(movie.status || '–')}</span>
                </div>
                <div class="movie-actions">
                    <a class="button button-primary" href="seats.html?movie=${encodeURIComponent(movie._id)}">Đặt vé</a>
                </div>
            </div>
        `;
        card.querySelector('.button-primary').addEventListener('click', (e) => e.stopPropagation());
        card.addEventListener('click', () => openMovieDetail(movie));
        grid.appendChild(card);
    });
    renderPagination();
}

function renderPagination() {
    const pagination = document.getElementById('movies-pagination');
    if (!pagination) return;
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    const pages = getPaginationItems(currentPage, totalPages);
    pagination.innerHTML = `
        <button type="button" class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Trước</button>
        ${pages.map((page) => page === '...'
            ? '<span class="page-ellipsis">...</span>'
            : `<button type="button" class="page-btn ${page === currentPage ? 'active' : ''}" data-page="${page}" aria-label="Trang ${page}" ${page === currentPage ? 'aria-current="page"' : ''}>${page}</button>`
        ).join('')}
        <button type="button" class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Sau</button>
    `;

    pagination.querySelectorAll('.page-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const page = Number(btn.dataset.page);
            if (!page || page === currentPage || page < 1 || page > totalPages) return;
            currentPage = page;
            fetchMovies();
            document.getElementById('all-movies')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function getPaginationItems(page, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (page >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', page - 1, page, page + 1, '...', total];
}

// ── Detail modal (standalone, mirrors app.js) ─────────────────────────────────

function openMovieDetail(movie) {
    ensureDetailModal();
    const genres    = normalizeGenres(movie);
    const posterUrl = movie.poster_url || '';
    const title     = movie.title || 'Untitled';
    document.getElementById('md-poster').src         = posterUrl;
    document.getElementById('md-poster').alt         = title;
    document.getElementById('md-poster').style.display = posterUrl ? '' : 'none';
    document.getElementById('md-title').textContent    = title;
    document.getElementById('md-genre').textContent    = genres.join(', ') || '–';
    document.getElementById('md-duration').textContent = fmtDuration(movie.duration);
    document.getElementById('md-status').textContent   = movie.status || '–';
    document.getElementById('md-desc').textContent     = movie.description || 'Chưa có mô tả.';
    document.getElementById('md-book-btn').href        = `seats.html?movie=${movie._id}`;
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
                <div style="flex:1;padding:32px 28px;overflow-y:auto;position:relative">
                    <button class="modal-close" type="button" aria-label="Đóng" style="position:absolute;top:12px;right:12px">×</button>
                    <h2 id="md-title" style="margin:0 0 12px;font-size:1.4rem"></h2>
                    <div style="margin-bottom:16px;font-size:.85rem;color:var(--muted)">
                        Thể loại: <span id="md-genre"></span>
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

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-pill').forEach((b) => {
            b.classList.remove('active');
            b.style.borderBottomColor = 'transparent';
            b.style.color = 'var(--muted)';
            b.style.fontWeight = '500';
        });
        btn.classList.add('active');
        btn.style.borderBottomColor = 'var(--primary, #e05c3a)';
        btn.style.color = 'var(--primary, #e05c3a)';
        btn.style.fontWeight = '600';
        currentStatus = btn.dataset.status;
        currentPage = 1;
        fetchMovies();
    });
});

document.addEventListener('DOMContentLoaded', () => {
    renderAuthNav(getCurrentUser());
    fetchMovies();
});

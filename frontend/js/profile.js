const user = getCurrentUser();
if (!user || user.role !== 'CUSTOMER') {
    location.replace(user ? 'admin.html' : 'index.html#login');
}

function renderView(u) {
    document.getElementById('pv-name').textContent   = u.full_name || '–';
    document.getElementById('pv-email').textContent  = u.email || '–';
    document.getElementById('pv-phone').textContent  = u.phone || '–';
    document.getElementById('pv-points').textContent = `${u.loyalty_points || 0} điểm`;
}

document.addEventListener('DOMContentLoaded', () => {
    renderAuthNav(user);
    renderView(user);

    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        document.getElementById('ef-name').value  = user.full_name || '';
        document.getElementById('ef-phone').value = user.phone || '';
        document.getElementById('ef-password').value = '';
        document.getElementById('profile-msg').textContent = '';
        document.getElementById('profile-view').hidden = true;
        document.getElementById('profile-edit').hidden = false;
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        document.getElementById('profile-view').hidden = false;
        document.getElementById('profile-edit').hidden = true;
    });

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('profile-msg');
        const body = {
            full_name: document.getElementById('ef-name').value.trim(),
            phone:     document.getElementById('ef-phone').value.trim()
        };
        const pw = document.getElementById('ef-password').value;

        try {
            const res = await fetch(`/api/auth/${user._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) { msg.textContent = data.message; msg.className = 'form-msg form-msg-error'; return; }

            // Đổi password nếu có nhập
            if (pw) {
                const resPw = await fetch(`/api/auth/${user._id}/password`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ newPassword: pw })
                });
                const dataPw = await resPw.json();
                if (!resPw.ok) { msg.textContent = dataPw.message; msg.className = 'form-msg form-msg-error'; return; }
            }

            // Refresh user data
            const updated = await fetch(`/api/auth/${user._id}`, { headers: getAuthHeaders() }).then((r) => r.json());
            if (updated && updated._id) {
                saveUser(updated);
                renderAuthNav(updated);
                renderView(updated);
            }

            msg.textContent = 'Cập nhật thành công!';
            msg.className = 'form-msg form-msg-ok';
            setTimeout(() => {
                document.getElementById('profile-view').hidden = false;
                document.getElementById('profile-edit').hidden = true;
            }, 1200);
        } catch {
            msg.textContent = 'Lỗi kết nối máy chủ.';
            msg.className = 'form-msg form-msg-error';
        }
    });
});

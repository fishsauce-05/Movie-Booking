import { ObjectId } from 'mongodb';

function httpError(message, status) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function validateObjectId(id, label = 'ID') {
    if (!ObjectId.isValid(id)) throw httpError(`${label} không hợp lệ.`, 400);
}

function validateEmail(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        throw httpError('Email không hợp lệ.', 400);
    }
}

function validatePhone(phone) {
    if (!phone || !/^0\d{9}$/.test(String(phone))) {
        throw httpError('Số điện thoại không hợp lệ (phải là 10 chữ số, bắt đầu bằng 0).', 400);
    }
}

function validatePassword(password) {
    if (!password || String(password).length < 6) {
        throw httpError('Mật khẩu phải có ít nhất 6 ký tự.', 400);
    }
}

export { httpError, validateObjectId, validateEmail, validatePhone, validatePassword };

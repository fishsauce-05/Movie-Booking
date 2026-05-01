import { ObjectId } from 'mongodb';

export default function createAuthMiddleware(db) {
    const users = db.collection('Users');

    async function findUserById(userId) {
        if (!userId || !ObjectId.isValid(userId)) return null;

        return users.findOne(
            { _id: new ObjectId(userId) },
            { projection: { password: 0 } }
        );
    }

    function loadCurrentUser(options = {}) {
        const { bodyFields = [], paramFields = [] } = options;

        return async function currentUserLoader(req, res, next) {
            try {
                const candidateIds = [req.headers['x-user-id']];

                bodyFields.forEach((field) => {
                    if (req.body?.[field]) candidateIds.push(req.body[field]);
                });

                paramFields.forEach((field) => {
                    if (req.params?.[field]) candidateIds.push(req.params[field]);
                });

                const userId = candidateIds.find(Boolean);
                const currentUser = await findUserById(userId);

                if (!currentUser) {
                    return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.' });
                }

                req.currentUser = currentUser;
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    function requireRole(...allowedRoles) {
        return function roleGuard(req, res, next) {
            if (!req.currentUser) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.' });
            }

            if (!allowedRoles.includes(req.currentUser.role)) {
                return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
            }

            next();
        };
    }

    function requireSelfOrRole({ targetParamFields = [], targetBodyFields = [], allowedRoles = [] } = {}) {
        return function selfOrRoleGuard(req, res, next) {
            if (!req.currentUser) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.' });
            }

            if (allowedRoles.includes(req.currentUser.role)) {
                return next();
            }

            const candidateIds = [
                ...targetParamFields.map((field) => req.params?.[field]),
                ...targetBodyFields.map((field) => req.body?.[field])
            ].filter(Boolean);

            const isOwner = candidateIds.some((candidateId) => String(candidateId) === String(req.currentUser._id));

            if (!isOwner) {
                return res.status(403).json({ message: 'Bạn không có quyền truy cập tài nguyên này.' });
            }

            next();
        };
    }

    return { loadCurrentUser, requireRole, requireSelfOrRole };
}

const DEFAULT_USERS = [
    {
        email: 'user.customer@gmail.com',
        password: '12341234',
        full_name: 'User Customer',
        phone: '0900000001',
        role: 'CUSTOMER'
    },
    {
        email: 'user.staff@gmail.com',
        password: '12341234',
        full_name: 'User Staff',
        phone: '0900000002',
        role: 'STAFF'
    },
    {
        email: 'user.admin@gmail.com',
        password: '12341234',
        full_name: 'User Admin',
        phone: '0900000003',
        role: 'MANAGER'
    }
];

export async function upsertDefaultUsers(db) {
    const users = db.collection('Users');
    const results = [];

    for (const user of DEFAULT_USERS) {
        const result = await users.updateOne(
            { email: user.email },
            {
                $set: {
                    full_name: user.full_name,
                    phone: user.phone,
                    password: user.password,
                    role: user.role,
                    loyalty_points: 0
                },
                $setOnInsert: {
                    created_at: new Date()
                }
            },
            { upsert: true }
        );

        results.push({
            email: user.email,
            matchedCount: result.matchedCount,
            upsertedCount: result.upsertedCount,
            modifiedCount: result.modifiedCount
        });
    }

    return results;
}

export { DEFAULT_USERS };

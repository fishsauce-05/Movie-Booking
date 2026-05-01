const DEFAULT_USERS = [
    {
        email: 'user.customer@gmail.com',
        password: '12341234',
        full_name: 'User Customer',
        phone: '0900000001',
        role: 'CUSTOMER',
        loyalty_points: 0
    },
    {
        email: 'user.staff@gmail.com',
        password: '12341234',
        full_name: 'User Staff',
        phone: '0900000002',
        role: 'STAFF',
        loyalty_points: 0
    },
    {
        email: 'user.admin@gmail.com',
        password: '12341234',
        full_name: 'User Admin',
        phone: '0900000003',
        role: 'MANAGER',
        loyalty_points: 0
    }
];

async function insertUsers(db) {
    const usersCol = db.collection('Users');
    const results = [];

    for (const user of DEFAULT_USERS) {
        const result = await usersCol.updateOne(
            { email: user.email },
            {
                $set: {
                    full_name: user.full_name,
                    phone: user.phone,
                    password: user.password,
                    role: user.role,
                    loyalty_points: user.loyalty_points
                },
                $setOnInsert: { created_at: new Date() }
            },
            { upsert: true }
        );
        results.push({ email: user.email, ...result });
    }

    console.log(`✓ Upsert ${results.length} tài khoản mặc định`);
    return results;
}

export { DEFAULT_USERS, insertUsers };

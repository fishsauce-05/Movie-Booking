const MOVIES = [
    {
        title: 'Avatar: The Way of Water',
        genre: ['Sci-Fi', 'Action', 'Adventure'],
        duration: 192,
        release_date: new Date('2022-12-16'),
        status: 'Đang chiếu',
        poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400'
    },
    {
        title: 'Dune: Part Two',
        genre: ['Sci-Fi', 'Drama', 'Adventure'],
        duration: 166,
        release_date: new Date('2024-02-28'),
        status: 'Đang chiếu',
        poster_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400'
    },
    {
        title: 'Inside Out 2',
        genre: ['Animation', 'Comedy', 'Family'],
        duration: 96,
        release_date: new Date('2024-06-14'),
        status: 'Đang chiếu',
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400'
    },
    {
        title: 'Oppenheimer',
        genre: ['Biography', 'Drama', 'History'],
        duration: 180,
        release_date: new Date('2023-07-21'),
        status: 'Đang chiếu',
        poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=400'
    },
    {
        title: 'Barbie',
        genre: ['Comedy', 'Fantasy'],
        duration: 114,
        release_date: new Date('2023-07-21'),
        status: 'Đang chiếu',
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400'
    },
    {
        title: 'Killers of the Flower Moon',
        genre: ['Crime', 'Drama', 'History'],
        duration: 206,
        release_date: new Date('2023-10-20'),
        status: 'Sắp chiếu',
        poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=400'
    }
];

async function insertMovies(db) {
    await db.collection('Movies').deleteMany({});
    const result = await db.collection('Movies').insertMany(MOVIES);
    console.log(`✓ Thêm ${result.insertedCount} phim`);
    return result.insertedIds;
}

export { MOVIES, insertMovies };

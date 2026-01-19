const { Client } = require('pg');
const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/reservation"
});

async function main() {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "Reservation" ORDER BY "createdAt" DESC LIMIT 1');
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();

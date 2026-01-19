const { Client } = require('pg');
const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/reservation" // Try connecting to 'reservation' db
});

async function main() {
    try {
        console.log("Connecting with pg...");
        await client.connect();
        console.log("Connected successfully!");
        const res = await client.query('SELECT NOW()');
        console.log("Time from DB:", res.rows[0]);
    } catch (err) {
        console.error("Connection failed with pg:", err);
    } finally {
        await client.end();
    }
}

main();

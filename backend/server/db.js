import mysql from "mysql2/promise";

let pool;

export function getDatabase() {
  if (!pool) {
    const required = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE"];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Missing MySQL settings: ${missing.join(", ")}`);
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      supportBigNumbers: true,
      bigNumberStrings: false,
      decimalNumbers: true,
      timezone: "Z",
    });
  }
  return pool;
}

export async function closeDatabase() {
  if (!pool) return;
  const connection = pool;
  pool = undefined;
  await connection.end();
}

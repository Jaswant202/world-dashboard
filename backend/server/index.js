
import "dotenv/config";
import express from "express";
import { getDatabase } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.get("/api/dashboard", async (request, response) => {
  const countryCode = String(request.query.country || "in").toLowerCase();

  if (!/^[a-z]{2}$/.test(countryCode)) {
    return response.status(400).json({
      error: "Country code must contain two letters."
    });
  }

  try {
    const db = getDatabase();

    const [countryRows] = await db.execute(`
      SELECT c.code, c.name, c.population, c.capital, c.states,
             c.gdp_usd AS gdpUsd,
             r.name AS regionName,
             r.value AS regionValue
      FROM countries c
      LEFT JOIN country_regions r ON r.country_code = c.code
      ORDER BY c.name, r.sort_order
    `);

    const countriesByCode = new Map();

    for (const row of countryRows) {
      if (!countriesByCode.has(row.code)) {
        countriesByCode.set(row.code, {
          code: row.code,
          name: row.name,
          population: row.population,
          capital: row.capital,
          states: row.states,
          gdpUsd: row.gdpUsd,
          regions: [],
        });
      }

      if (row.regionName) {
        countriesByCode.get(row.code).regions.push({
          name: row.regionName,
          value: row.regionValue
        });
      }
    }

    const [statsRows] = await db.execute(`
      SELECT population,
             country_count AS countryCount,
             continents,
             timezones,
             gdp_usd AS gdpUsd,
             source
      FROM global_stats
      WHERE id = 1
      LIMIT 1
    `);

    const [weatherRows] = await db.execute(`
      SELECT country_code AS countryCode,
             city,
             temp_c AS tempC,
             condition_text AS \`condition\`,
             wind,
             humidity,
             source,
             observed_at AS observedAt
      FROM weather_snapshots
      WHERE country_code = ?
      ORDER BY observed_at DESC
      LIMIT 1
    `, [countryCode]);

    const [trafficRows] = await db.execute(`
      SELECT arrivals,
             departures,
             tracked_flights AS trackedFlights,
             source,
             observed_at AS observedAt
      FROM traffic_snapshots
      WHERE id = 1
      LIMIT 1
    `);

    const [events] = await db.execute(`
      SELECT id,
             TIME_FORMAT(event_time, '%H:%i') AS time,
             name,
             place,
             start_at AS startAt,
             source
      FROM events
      ORDER BY start_at
      LIMIT 6
    `);

    response.json({
      countries: [...countriesByCode.values()],
      stats: statsRows[0] || null,
      weather: weatherRows[0] || null,
      traffic: trafficRows[0] || null,
      events,
    });

  } catch (error) {
    console.error("MYSQL ERROR:", error);

    response.status(503).json({
      error: "Could not load dashboard data.",
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Dashboard API listening on port ${port}`);
});

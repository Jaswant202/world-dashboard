
import "dotenv/config";
import { MongoClient } from "mongodb";
import { getDatabase, closeDatabase } from "./db.js";

const mongo = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
);

const mongoDatabase = process.env.MONGODB_DB || "world_dashboard";

function toMysqlDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function migrate() {
  let connection;

  try {
    console.log("Connecting to MongoDB...");
    await mongo.connect();

    const source = mongo.db(mongoDatabase);
    const pool = getDatabase();

    connection = await pool.getConnection();

    console.log("Connected. Reading MongoDB records...");

    const countries = await source.collection("countries").find({}).toArray();
    const stats = await source.collection("globalStats").findOne();
    const weather = await source.collection("weatherSnapshots").find({}).toArray();
    const traffic = await source.collection("trafficSnapshots").findOne();
    const events = await source.collection("events").find({}).toArray();

    await connection.beginTransaction();

    // 1. Countries and their regions
    for (const country of countries) {
      await connection.execute(
        `INSERT INTO countries
          (code, name, population, capital, states, gdp_usd)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          population = VALUES(population),
          capital = VALUES(capital),
          states = VALUES(states),
          gdp_usd = VALUES(gdp_usd)`,
        [
          country.code,
          country.name,
          country.population,
          country.capital,
          country.states,
          country.gdpUsd
        ]
      );

      await connection.execute(
        "DELETE FROM country_regions WHERE country_code = ?",
        [country.code]
      );

      for (let i = 0; i < (country.regions || []).length; i++) {
        const region = country.regions[i];

        await connection.execute(
          `INSERT INTO country_regions
            (country_code, sort_order, name, value)
           VALUES (?, ?, ?, ?)`,
          [country.code, i + 1, region.name, region.value]
        );
      }
    }

    // 2. Global statistics
    if (stats) {
      await connection.execute(
        `INSERT INTO global_stats
          (id, population, country_count, continents, timezones, gdp_usd, source)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          population = VALUES(population),
          country_count = VALUES(country_count),
          continents = VALUES(continents),
          timezones = VALUES(timezones),
          gdp_usd = VALUES(gdp_usd),
          source = VALUES(source)`,
        [
          stats.population,
          stats.countryCount,
          stats.continents,
          stats.timezones,
          stats.gdpUsd,
          stats.source
        ]
      );
    }

    // 3. Weather snapshots
    for (const item of weather) {
      await connection.execute(
        `INSERT INTO weather_snapshots
          (country_code, city, temp_c, condition_text, wind,
           humidity, source, observed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          temp_c = VALUES(temp_c),
          condition_text = VALUES(condition_text),
          wind = VALUES(wind),
          humidity = VALUES(humidity),
          observed_at = VALUES(observed_at)`,
        [
          item.countryCode,
          item.city,
          item.tempC,
          item.condition,
          item.wind,
          item.humidity,
          item.source,
          toMysqlDateTime(item.observedAt)
        ]
      );
    }

    // 4. Traffic snapshot
    if (traffic) {
      await connection.execute(
        `INSERT INTO traffic_snapshots
          (id, arrivals, departures, tracked_flights, source, observed_at)
         VALUES (1, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          arrivals = VALUES(arrivals),
          departures = VALUES(departures),
          tracked_flights = VALUES(tracked_flights),
          source = VALUES(source),
          observed_at = VALUES(observed_at)`,
        [
          traffic.arrivals,
          traffic.departures,
          traffic.trackedFlights,
          traffic.source,
          toMysqlDateTime(traffic.observedAt)
        ]
      );
    }

    // 5. Events
    for (const event of events) {
      const eventDate = new Date(event.startAt);
      const eventTime = event.time || eventDate.toISOString().slice(11, 16);

      await connection.execute(
        `INSERT INTO events
          (id, event_time, name, place, start_at, source)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          event_time = VALUES(event_time),
          name = VALUES(name),
          place = VALUES(place),
          start_at = VALUES(start_at),
          source = VALUES(source)`,
        [
          event.id,
          `${eventTime.length === 5 ? eventTime + ":00" : eventTime}`,
          event.name,
          event.place,
          toMysqlDateTime(event.startAt),
          event.source
        ]
      );
    }

    await connection.commit();

    console.log("\nMIGRATION SUCCESSFUL!");
    console.log("Countries:", countries.length);
    console.log(
      "Country regions:",
      countries.reduce((total, item) => total + (item.regions || []).length, 0)
    );
    console.log("Global stats:", stats ? 1 : 0);
    console.log("Weather snapshots:", weather.length);
    console.log("Traffic snapshots:", traffic ? 1 : 0);
    console.log("Events:", events.length);
    console.log("\nOriginal MongoDB records were not deleted.");

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("\nMIGRATION FAILED:", error.message);
    process.exitCode = 1;

  } finally {
    if (connection) connection.release();

    await mongo.close();
    await closeDatabase();
  }
}

migrate();

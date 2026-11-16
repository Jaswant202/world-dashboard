import "dotenv/config";
import { closeDatabase, getDatabase } from "./db.js";

const countries = [
  { code: "in", name: "India", population: 1450000000, capital: "NEW DELHI", states: "28", gdpUsd: 4100000000000, regions: [["Other regions", 20], ["South Asia", 45], ["Africa", 35]] },
  { code: "cn", name: "China", population: 1410000000, capital: "BEIJING", states: "23", gdpUsd: 18500000000000, regions: [["Other regions", 15], ["East Asia", 60], ["Southeast Asia", 25]] },
  { code: "us", name: "United States", population: 340000000, capital: "WASHINGTON, D.C.", states: "50", gdpUsd: 29200000000000, regions: [["North America", 50], ["Europe", 35], ["Asia", 15]] },
  { code: "ae", name: "United Arab Emirates", population: 10200000, capital: "ABU DHABI", states: "7 emirates", gdpUsd: 537000000000, regions: [["Other regions", 25], ["West Asia", 50], ["Africa", 25]] },
  { code: "ly", name: "Libya", population: 7400000, capital: "TRIPOLI", states: "22 districts", gdpUsd: 48000000000, regions: [["Other regions", 20], ["West Asia", 35], ["North Africa", 45]] },
  { code: "ng", name: "Nigeria", population: 233000000, capital: "ABUJA", states: "36", gdpUsd: 363000000000, regions: [["Other regions", 20], ["West Africa", 55], ["Central Africa", 25]] },
  { code: "br", name: "Brazil", population: 212000000, capital: "BRASÍLIA", states: "26", gdpUsd: 2200000000000, regions: [["South America", 45], ["North America", 25], ["Africa", 30]] },
  { code: "jp", name: "Japan", population: 123000000, capital: "TOKYO", states: "47", gdpUsd: 4100000000000, regions: [["Other regions", 20], ["East Asia", 60], ["Southeast Asia", 20]] },
  { code: "gb", name: "United Kingdom", population: 68000000, capital: "LONDON", states: "4", gdpUsd: 3600000000000, regions: [["Europe", 40], ["Asia", 35], ["Africa", 25]] },
];
const weather = [
  ["in", "DELHI", 28, "PARTLY CLOUDY", "10 KTS SE", 62],
  ["cn", "BEIJING", 24, "CLEAR", "7 KTS E", 48],
  ["us", "NEW YORK", 22, "CLEAR", "8 KTS SW", 51],
  ["ae", "ABU DHABI", 34, "SUNNY", "6 KTS NW", 38],
  ["ly", "TRIPOLI", 27, "CLEAR", "9 KTS N", 44],
  ["ng", "ABUJA", 31, "SUNNY", "5 KTS SW", 70],
  ["br", "BRASÍLIA", 27, "CLEAR", "7 KTS E", 66],
  ["jp", "TOKYO", 23, "CLOUDY", "11 KTS NE", 58],
  ["gb", "LONDON", 17, "CLOUDY", "12 KTS W", 73],
];
const events = [
  ["climate-summit", "08:00", "CLIMATE SUMMIT", "Geneva · International Conference Centre", "2030-01-01 08:00:00"],
  ["trade-conference", "10:30", "TRADE CONFERENCE", "Singapore · Marina Bay Sands", "2030-01-01 10:30:00"],
  ["g20-meeting", "13:00", "G20 MEETING", "New Delhi · Bharat Mandapam", "2030-01-02 13:00:00"],
  ["tech-expo", "15:30", "TECH EXPO", "Tokyo · Big Sight", "2030-01-03 15:30:00"],
];

const db = getDatabase();
const connection = await db.getConnection();
try {
  await connection.beginTransaction();
  for (const country of countries) {
    await connection.execute(`
      INSERT INTO countries (code, name, population, capital, states, gdp_usd)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), population=VALUES(population), capital=VALUES(capital), states=VALUES(states), gdp_usd=VALUES(gdp_usd)
    `, [country.code, country.name, country.population, country.capital, country.states, country.gdpUsd]);
    await connection.execute("DELETE FROM country_regions WHERE country_code = ?", [country.code]);
    for (let i = 0; i < country.regions.length; i++) {
      await connection.execute(
        "INSERT INTO country_regions (country_code, sort_order, name, value) VALUES (?, ?, ?, ?)",
        [country.code, i, country.regions[i][0], country.regions[i][1]],
      );
    }
  }

  for (const [countryCode, city, tempC, condition, wind, humidity] of weather) {
    await connection.execute(`
      INSERT INTO weather_snapshots (country_code, city, temp_c, condition_text, wind, humidity, source, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sample', UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE temp_c=VALUES(temp_c), condition_text=VALUES(condition_text), wind=VALUES(wind), humidity=VALUES(humidity), observed_at=VALUES(observed_at)
    `, [countryCode, city, tempC, condition, wind, humidity]);
  }

  await connection.execute(`
    INSERT INTO global_stats (id, population, country_count, continents, timezones, gdp_usd, source)
    VALUES (1, 8450000000, 195, 7, 24, 105000000000000, 'sample')
    ON DUPLICATE KEY UPDATE population=VALUES(population), country_count=VALUES(country_count), continents=VALUES(continents), timezones=VALUES(timezones), gdp_usd=VALUES(gdp_usd), source=VALUES(source)
  `);
  await connection.execute(`
    INSERT INTO traffic_snapshots (id, arrivals, departures, tracked_flights, source, observed_at)
    VALUES (1, 124, 118, 118, 'sample', UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE arrivals=VALUES(arrivals), departures=VALUES(departures), tracked_flights=VALUES(tracked_flights), source=VALUES(source), observed_at=VALUES(observed_at)
  `);
  for (const [id, time, name, place, startAt] of events) {
    await connection.execute(`
      INSERT INTO events (id, event_time, name, place, start_at, source)
      VALUES (?, ?, ?, ?, ?, 'sample')
      ON DUPLICATE KEY UPDATE event_time=VALUES(event_time), name=VALUES(name), place=VALUES(place), start_at=VALUES(start_at), source=VALUES(source)
    `, [id, time, name, place, startAt]);
  }
  await connection.commit();
  console.log("Sample dashboard records are ready in MySQL.");
} catch (error) {
  await connection.rollback();
  console.error("Could not seed MySQL. Check the connection and import schema.sql first.");
  process.exitCode = 1;
} finally {
  connection.release();
  await closeDatabase();
}

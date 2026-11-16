CREATE DATABASE IF NOT EXISTS world_dashboard
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE world_dashboard;

CREATE TABLE IF NOT EXISTS countries (
  code CHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  population BIGINT UNSIGNED NOT NULL,
  capital VARCHAR(100) NOT NULL,
  states VARCHAR(40) NOT NULL,
  gdp_usd BIGINT UNSIGNED NOT NULL
);

CREATE TABLE IF NOT EXISTS country_regions (
  country_code CHAR(2) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  value TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (country_code, sort_order),
  CONSTRAINT fk_regions_country FOREIGN KEY (country_code) REFERENCES countries(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS global_stats (
  id TINYINT UNSIGNED PRIMARY KEY,
  population BIGINT UNSIGNED NOT NULL,
  country_count SMALLINT UNSIGNED NOT NULL,
  continents TINYINT UNSIGNED NOT NULL,
  timezones SMALLINT UNSIGNED NOT NULL,
  gdp_usd BIGINT UNSIGNED NOT NULL,
  source VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS weather_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  city VARCHAR(100) NOT NULL,
  temp_c SMALLINT NOT NULL,
  condition_text VARCHAR(80) NOT NULL,
  wind VARCHAR(40) NOT NULL,
  humidity TINYINT UNSIGNED NOT NULL,
  source VARCHAR(32) NOT NULL,
  observed_at DATETIME NOT NULL,
  UNIQUE KEY uq_weather_sample (country_code, city, source),
  KEY ix_weather_latest (country_code, observed_at),
  CONSTRAINT fk_weather_country FOREIGN KEY (country_code) REFERENCES countries(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS traffic_snapshots (
  id TINYINT UNSIGNED PRIMARY KEY,
  arrivals SMALLINT UNSIGNED NOT NULL,
  departures SMALLINT UNSIGNED NOT NULL,
  tracked_flights SMALLINT UNSIGNED NOT NULL,
  source VARCHAR(32) NOT NULL,
  observed_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(64) PRIMARY KEY,
  event_time TIME NOT NULL,
  name VARCHAR(120) NOT NULL,
  place VARCHAR(180) NOT NULL,
  start_at DATETIME NOT NULL,
  source VARCHAR(32) NOT NULL,
  KEY ix_events_start (start_at)
);

import { useEffect, useState } from "react";
import {
  IconArrowDown, IconArrowUp, IconBolt, IconCalendarEvent, IconChartBar,
  IconChevronDown, IconClock, IconCloud, IconMap, IconPlane,
  IconShieldCheck, IconSun, IconUsers, IconWorld,
} from "@tabler/icons-react";
import "./App.css";

const API_URL = "http://localhost:3001/api/dashboard";

const cameras = [
  { city: "NEW YORK", image: "https://images.pexels.com/photos/12233330/pexels-photo-12233330.jpeg" },
  { city: "LONDON", image: "https://images.pexels.com/photos/16435133/pexels-photo-16435133.jpeg" },
  { city: "DUBAI", image: "https://images.pexels.com/photos/34218532/pexels-photo-34218532.jpeg" },
];

const formatCompact = (value) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const iconForStat = [IconWorld, IconUsers, IconWorld, IconMap, IconChartBar];

function PanelTitle({ icon: Icon, children, collapsed, onClick }) {
  return (
    <button className="panel-title" aria-expanded={!collapsed} onClick={onClick}>
      {Icon && <Icon size={18} />}
      <span>{children}</span>
      <IconChevronDown size={14} className={`panel-chevron ${collapsed ? "is-collapsed" : ""}`} />
    </button>
  );
}

export default function App() {
  const [countryCode, setCountryCode] = useState("in");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState(0);
  const [cameraIndex, setCameraIndex] = useState(2);
  const [selectedStat, setSelectedStat] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [trafficView, setTrafficView] = useState("ARRIVALS");
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API_URL}?country=${encodeURIComponent(countryCode)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(`API request failed (${response.status})`);
        }
        const result = await response.json();
        setDashboard(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to connect to the MySQL API.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDashboard();
    return () => controller.abort();
  }, [countryCode]);

  const countries = dashboard?.countries || [];
  const country = countries.find((item) => item.code === countryCode);
  const weather = dashboard?.weather;
  const statsData = dashboard?.stats;
  const traffic = dashboard?.traffic;
  const events = dashboard?.events || [];
  const regions = country?.regions || [];
  const selectedRegion = regions[region] || regions[0];
  const togglePanel = (panel) =>
    setCollapsed((current) => ({ ...current, [panel]: !current[panel] }));
  const panelTitle = (id, title, icon) => (
    <PanelTitle icon={icon} collapsed={collapsed[id]} onClick={() => togglePanel(id)}>
      {title}
    </PanelTitle>
  );

  const stats = statsData
    ? [
        { name: "POPULATION", value: formatCompact(statsData.population), info: "Global population · MySQL database." },
        { name: "COUNTRIES", value: statsData.countryCount, info: "Country count · MySQL database." },
        { name: "CONTINENTS", value: statsData.continents, info: "Continents · MySQL database." },
        { name: "TIMEZONES", value: statsData.timezones, info: "Time zones · MySQL database." },
        { name: "GDP (USD)", value: `$${formatCompact(statsData.gdpUsd)}`, info: "Global GDP · MySQL database." },
      ]
    : [];

  const regionTotal = regions.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const first = Number(regions[0]?.value || 0);
  const second = Number(regions[1]?.value || 0);
  const third = Number(regions[2]?.value || 0);
  const regionGradient = `conic-gradient(#db302a 0 ${first}%, #e7bd24 ${first}% ${first + second}%, #5b9e18 ${first + second}% 100%)`;

  return (
    <main className="dashboard-page">
      <div className="dashboard-frame">
        <header className="dashboard-header">
          <div className="map-texture" />
          <h1>WORLD DASHBOARD</h1>
          <div className="country-selector" aria-label="Select a country">
            <span>COUNTRY SELECTOR</span>
            {countries.map((item) => (
              <button
                key={item.code}
                title={item.name}
                aria-label={`Select ${item.name}`}
                aria-pressed={item.code === countryCode}
                className={item.code === countryCode ? "selected" : ""}
                onClick={() => {
                  setCountryCode(item.code);
                  setRegion(0);
                  setWeatherExpanded(false);
                }}
              >
                <img src={`https://flagcdn.com/w40/${item.code}.png`} alt="" />
              </button>
            ))}
          </div>
        </header>

        {error && (
          <div className="connection-error">
            <span>MYSQL API CONNECTION ERROR: {error}</span>
            <button onClick={() => window.location.reload()}>RETRY</button>
          </div>
        )}
        {loading && <div className="dashboard-message">CONNECTING TO MYSQL DATABASE...</div>}

        {dashboard && country && (
          <div className={`dashboard-grid ${loading ? "is-loading" : ""}`}>
            <div className="dashboard-column left-column">
              <section className="panel status-panel">
                {panelTitle("status", "WORLD STATUS", IconWorld)}
                {!collapsed.status && (
                  <div className="status-rows">
                    {stats.map((stat, index) => {
                      const StatIcon = iconForStat[index];
                      return (
                        <div key={stat.name}>
                          <button
                            className="status-stat"
                            aria-expanded={selectedStat === stat.name}
                            onClick={() => setSelectedStat(selectedStat === stat.name ? null : stat.name)}
                          >
                            <StatIcon />
                            <span>{stat.name}</span>
                            <strong>{stat.value}</strong>
                          </button>
                          {selectedStat === stat.name && <p className="stat-detail">{stat.info}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="panel overview-panel">
                {panelTitle("overview", <>
                  <span className="flag-heading"><img src={`https://flagcdn.com/w40/${country.code}.png`} alt="" /></span>
                  {country.name.toUpperCase()} OVERVIEW
                </>)}
                {!collapsed.overview && (
                  <div className="overview-body">
                    <div className="overview-icons">
                      <IconWorld size={37} /><IconMap size={27} /><IconChartBar size={27} />
                    </div>
                    <div className="overview-stats">
                      <div><span>POPULATION</span><strong>{formatCompact(country.population)}</strong></div>
                      <div><span>CAPITAL</span><strong>{country.capital}</strong></div>
                      <div><span>STATES</span><strong>{country.states}</strong></div>
                      <div><span>GDP</span><strong>${formatCompact(country.gdpUsd)}</strong></div>
                    </div>
                  </div>
                )}
              </section>

              <section className="panel weather-panel">
                {panelTitle("weather", `WEATHER · ${country.name.toUpperCase()}`, IconSun)}
                {!collapsed.weather && (
                  <div className="weather-content">
                    <div className="weather-temp">
                      <div className="weather-icon">
                        <IconSun size={35} fill="#f6c74f" color="#f6c74f" />
                        <IconCloud size={35} fill="#e4edf4" color="#e4edf4" />
                      </div>
                      <strong>{weather?.tempC ?? "--"}°C</strong>
                      <small>{weather?.condition || "NO WEATHER DATA"}</small>
                    </div>
                    <div className="weather-info">
                      {weatherExpanded ? (
                        <>
                          <span>WIND <b>{weather?.wind || "--"}</b></span>
                          <span>HUMIDITY <b>{weather?.humidity ?? "--"}%</b></span>
                          <small>{weather?.city || "CITY DATA UNAVAILABLE"}</small>
                        </>
                      ) : (
                        <button className="weather-expand" onClick={() => setWeatherExpanded(true)}>
                          VIEW WEATHER DETAILS
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="dashboard-column center-column">
              <section className="panel timezone-panel">
                {panelTitle("timezone", `REGIONAL MIX · ${country.name.toUpperCase()} · ${(selectedRegion?.name || "REGION").toUpperCase()}`)}
                {!collapsed.timezone && (
                  <div className="donut-area">
                    <div className="donut" style={{ background: regionGradient }}>
                      {regions[0] && (
                        <button className="donut-label red-label" aria-label={`${regions[0].name} ${regions[0].value}%`} onClick={() => setRegion(0)}>
                          {regions[0].value}%<small>{regions[0].name}</small>
                        </button>
                      )}
                      {regions[1] && (
                        <button className="donut-label yellow-label" aria-label={`${regions[1].name} ${regions[1].value}%`} onClick={() => setRegion(1)}>
                          {regions[1].value}%<small>{regions[1].name}</small>
                        </button>
                      )}
                      {regions[2] && (
                        <button className="donut-label green-label" aria-label={`${regions[2].name} ${regions[2].value}%`} onClick={() => setRegion(2)}>
                          {regions[2].value}%<small>{regions[2].name}</small>
                        </button>
                      )}
                      <div className="donut-center">
                        <IconWorld size={52} />
                        <span>{selectedRegion?.name || `${regionTotal}%`}</span>
                      </div>
                    </div>
                    <small className="sample-label">DATABASE REGION DISTRIBUTION</small>
                  </div>
                )}
              </section>

              <section className="panel feed-panel">
                {panelTitle("feed", `WORLD CITY PREVIEW · ${cameras[cameraIndex].city}`)}
                {!collapsed.feed && (
                  <>
                    <div className="main-feed" style={{ backgroundImage: `url(${cameras[cameraIndex].image})` }}>
                      <span className="feed-live">IMAGE PREVIEW</span>
                      <span className="feed-city">{cameras[cameraIndex].city}</span>
                    </div>
                    <div className="camera-grid">
                      {cameras.map((item, index) => (
                        <button
                          key={item.city}
                          aria-label={`Show ${item.city} preview`}
                          aria-pressed={cameraIndex === index}
                          className={`camera ${cameraIndex === index ? "active" : ""}`}
                          style={{ backgroundImage: `url(${item.image})` }}
                          onClick={() => setCameraIndex(index)}
                        >
                          <span>CAM {index + 1} · {item.city}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>

            <div className="dashboard-column right-column">
              <section className="panel traffic-panel">
                {panelTitle("traffic", "WORLD TRAFFIC · DATABASE", IconPlane)}
                {!collapsed.traffic && (
                  <>
                    <div className="traffic-stats">
                      <button className={trafficView === "ARRIVALS" ? "active" : ""} onClick={() => setTrafficView("ARRIVALS")}>
                        <IconPlane size={29} /><strong>{traffic?.arrivals ?? "--"}</strong><span>ARRIVALS</span>
                      </button>
                      <button className={trafficView === "DEPARTURES" ? "active" : ""} onClick={() => setTrafficView("DEPARTURES")}>
                        <IconArrowUp size={24} /><strong>{traffic?.departures ?? "--"}</strong><span>DEPARTURES</span>
                      </button>
                      <button className={trafficView === "FLIGHTS" ? "active" : ""} onClick={() => setTrafficView("FLIGHTS")}>
                        <IconArrowDown size={24} /><strong>{traffic?.trackedFlights ?? "--"}</strong><span>FLIGHTS</span>
                      </button>
                    </div>
                    <div className="traffic-detail">{trafficView} · MYSQL DATABASE COUNT</div>
                  </>
                )}
              </section>

              <section className="panel events-panel">
                {panelTitle("events", "SCHEDULED GLOBAL EVENTS", IconCalendarEvent)}
                {!collapsed.events && (
                  <div className="event-list">
                    {events.map((event, index) => (
                      <div className={`event-row ${selectedEvent === index ? "selected" : ""}`} key={event.id}>
                        <button onClick={() => setSelectedEvent(selectedEvent === index ? null : index)} aria-expanded={selectedEvent === index}>
                          <span className="event-time">{event.time}<small> UTC</small></span>
                          <span>{event.name}{selectedEvent === index && <small className="event-place">{event.place} · Database record</small>}</span>
                          <IconClock size={20} />
                        </button>
                      </div>
                    ))}
                    {events.length === 0 && <div className="panel-empty">No events found in database.</div>}
                  </div>
                )}
              </section>

              <section className="panel system-panel">
                {panelTitle("system", "SYSTEM STATUS")}
                {!collapsed.system && (
                  <div className="system-content">
                    <div className="system-row"><IconBolt size={15} /><span>API</span><strong className="online">● CONNECTED</strong></div>
                    <div className="system-row"><IconShieldCheck size={15} /><span>DATABASE</span><strong className="online">● MYSQL</strong></div>
                    <small className="sample-label">API RESPONSE RECEIVED</small>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        <div className="sample-note">
          {dashboard ? "MYSQL DATABASE · API CONNECTED · SAMPLE RECORDS" : "WORLD DASHBOARD"}
        </div>
      </div>
    </main>
  );
}

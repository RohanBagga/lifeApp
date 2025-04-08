import { useEffect, useState } from "react";
import "./App.css";

const CLIENT_ID = "1032345992294-48boa203ightsaf4o186tqgtu8c13l4n.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

interface CalendarEvent {
  summary: string;
  start: { date: string };
}

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filtered, setFiltered] = useState<CalendarEvent[]>([]);
  const [search, setSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState("all");
  const [compact, setCompact] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    window.gapi.load("client", async () => {
      await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
    });

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response: any) => {
        if (response.error) return console.error("Token error:", response);

        setAccessToken(response.access_token);
        await fetchCalendarEvents(response.access_token);
      },
    });

    const signInBtn = document.getElementById("signin-btn");
    signInBtn?.addEventListener("click", () => {
      tokenClient.requestAccessToken({ prompt: "consent" });
    });

    const signOutBtn = document.getElementById("signout-btn");
    signOutBtn?.addEventListener("click", () => {
      if (accessToken) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
          setAccessToken(null);
          setEvents([]);
          setFiltered([]);
        });
      }
    });
  }, []);

  useEffect(() => {
    const query = search.toLowerCase().trim();

    const results = events
      .filter((event) => {
        const rawDate = event.start?.date;
        if (!rawDate) return false;

        const eventDate = new Date(rawDate);
        eventDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(
          (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const title = event.summary?.toLowerCase() || "";
        const titleWords = title.split(/\s+/);
        const matchesSearch = titleWords.some((word) =>
          word.startsWith(query)
        );
        const matchesDate =
          daysFilter === "all" ||
          (diffDays >= 0 && diffDays <= parseInt(daysFilter));

        return diffDays >= 0 && matchesSearch && matchesDate;
      })
      .sort(
        (a, b) =>
          new Date(a.start.date).getTime() - new Date(b.start.date).getTime()
      );

    setFiltered(results);
  }, [search, daysFilter, events]);

  const fetchCalendarEvents = async (token: string) => {
    setLoading(true);
    try {
      const res = await window.gapi.client.calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 100,
      });

      const allDayEvents = res.result.items?.filter(
        (e: any) => !!e.start?.date
      ) || [];

      setEvents(allDayEvents);
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCountdownText = (rawDate: string) => {
    const date = new Date(rawDate);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return diffDays === 0
      ? "🟡 Today!"
      : diffDays === 1
      ? "1 day away"
      : `${diffDays} days away`;
  };

  return (
    <div className="container">
      <h1>📅 My Calendar Dashboard</h1>

      {!accessToken && <button id="signin-btn">Sign in with Google</button>}
      {accessToken && <button id="signout-btn">Sign out</button>}

      {accessToken && (
        <>
          <div className="controls">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title..."
            />
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="7">Next 7 days</option>
              <option value="30">Next 30 days</option>
            </select>
            <button onClick={() => setCompact((c) => !c)}>
              Toggle Compact Mode
            </button>
          </div>

          {loading ? (
            <p>🔄 Loading events...</p>
          ) : filtered.length === 0 ? (
            <p>No matching all-day events.</p>
          ) : (
            <div className="event-list">
              {filtered.map((event) => (
                <div className="event-card" key={event.summary + event.start.date}>
                  {compact ? (
                    <strong>{event.summary} — {getCountdownText(event.start.date)}</strong>
                  ) : (
                    <>
                      <div className="title">{event.summary}</div>
                      <div className="date">📅 {new Date(event.start.date).toDateString()}</div>
                      <div className="countdown">⏳ {getCountdownText(event.start.date)}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
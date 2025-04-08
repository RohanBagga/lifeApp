import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import "./App.css";

const CLIENT_ID =
  "1032345992294-48boa203ightsaf4o186tqgtu8c13l4n.apps.googleusercontent.com";
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
    let gapiInitialized = false;
  
    window.gapi.load("client", async () => {
      await window.gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
      });
      gapiInitialized = true;
  
      // Set up token client **only after init**
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error) {
            console.error("Token error:", response);
            return;
          }
  
          console.log("Access Token:", response.access_token);
          setAccessToken(response.access_token);
  
          if (gapiInitialized) {
            await fetchCalendarEvents();
          } else {
            console.warn("gapi client not ready yet!");
          }
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

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      console.log("Fetching events...");
      const res = await window.gapi.client.calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 100,
      });
  
      const allDayEvents =
        res.result.items?.filter((e: any) => !!e.start?.date) || [];
  
      console.log("Events fetched:", allDayEvents);
      setEvents(allDayEvents);
    } catch (error) {
      console.error("Fetch failed:", error); // 👈 show error clearly
    } finally {
      setLoading(false);
    }
  };
  

  const getCountdownText = (rawDate: string) => {
    const date = new Date(rawDate);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return diffDays === 0
      ? "🟡 Today!"
      : diffDays === 1
      ? "1 day away"
      : `${diffDays} days away`;
  };

  return (
    <Box
      sx={{
        width: "100vw",
        minHeight: "100vh",
        bgcolor: "#f4f4f4",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        px: { xs: 2, sm: 4 },
        py: { xs: 4, sm: 6 },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: "800px",
          p: { xs: 2, sm: 4 },
          borderRadius: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", mb: 3, display: "flex", gap: 1 }}
        >
          📅 My Calendar Dashboard
        </Typography>

        {!accessToken ? (
          <Button
            variant="contained"
            id="signin-btn"
            fullWidth
            sx={{ mb: 2 }}
          >
            Sign in with Google
          </Button>
        ) : (
          <Button
            variant="outlined"
            id="signout-btn"
            fullWidth
            sx={{ mb: 2 }}
          >
            Sign out
          </Button>
        )}

        {accessToken && (
          <>
            {/* Controls */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
              <TextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search local events..."
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Filter</InputLabel>
                <Select
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(e.target.value)}
                  label="Filter"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="7">Next 7 days</MenuItem>
                  <MenuItem value="30">Next 30 days</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={() => setCompact((c) => !c)}>
                Toggle Compact Mode
              </Button>
            </Box>

            {loading ? (
              <Typography align="center">🔄 Loading events...</Typography>
            ) : filtered.length === 0 ? (
              <Typography align="center">No matching all-day events.</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filtered.map((event) => {
                  const title = event.summary || "Untitled";
                  const date = event.start.date;
                  const countdown = getCountdownText(date);

                  return (
                    <Paper key={title + date} className="event-card">
                      {compact ? (
                        <Typography variant="body1" fontWeight="bold">
                          {title} — {countdown}
                        </Typography>
                      ) : (
                        <>
                          <div className="title">{title}</div>
                          <div className="date">
                            📅 {new Date(date).toDateString()}
                          </div>
                          <div className="countdown">⏳ {countdown}</div>
                        </>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}

export default App;

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = __dirname;

const holidays = {
  "christmas": {
    name: "Christmas",
    getDate: (year) => atStartOfDay(year, 11, 25),
  },
  "thanksgiving": {
    name: "Thanksgiving",
    getDate: (year) => nthWeekdayOfMonth(year, 10, 4, 4),
  },
  "easter": {
    name: "Easter",
    getDate: getEasterDate,
  },
  "new-year": {
    name: "New Year's Day",
    getDate: (year) => atStartOfDay(year, 0, 1),
  },
  "halloween": {
    name: "Halloween",
    getDate: (year) => atStartOfDay(year, 9, 31),
  },
  "independence-day": {
    name: "Independence Day",
    getDate: (year) => atStartOfDay(year, 6, 4),
  },
  "valentines-day": {
    name: "Valentine's Day",
    getDate: (year) => atStartOfDay(year, 1, 14),
  },
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function atStartOfDay(year, monthIndex, day) {
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}

function nthWeekdayOfMonth(year, monthIndex, weekday, occurrence) {
  const firstOfMonth = atStartOfDay(year, monthIndex, 1);
  const offset = (weekday - firstOfMonth.getDay() + 7) % 7;
  const day = 1 + offset + (occurrence - 1) * 7;
  return atStartOfDay(year, monthIndex, day);
}

function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return atStartOfDay(year, month, day);
}

function getUpcomingHoliday(id, now = new Date()) {
  const key = holidays[id] ? id : "christmas";
  const holiday = holidays[key];
  let date = holiday.getDate(now.getFullYear());

  if (date.getTime() <= now.getTime()) {
    date = holiday.getDate(now.getFullYear() + 1);
  }

  return {
    id: key,
    name: holiday.name,
    date: toCalendarDate(date),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function toCalendarDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": contentTypes[".json"] });
  response.end(JSON.stringify(body));
}

async function sendStaticFile(response, requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (path.relative(PUBLIC_DIR, filePath).startsWith("..")) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
    });
    response.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    sendJson(response, 500, { error: "Server error" });
  }
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/holidays") {
    sendJson(response, 200, Object.keys(holidays).map((id) => ({ id, name: holidays[id].name })));
    return;
  }

  if (url.pathname.startsWith("/api/holiday/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/holiday/", ""));
    sendJson(response, 200, getUpcomingHoliday(id));
    return;
  }

  sendStaticFile(response, url.pathname);
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Holiday countdown is running at http://${HOST}:${PORT}`);
  });
}

module.exports = { server, getUpcomingHoliday };

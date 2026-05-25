const holidaySelect = document.querySelector("#holidaySelect");
const statusText = document.querySelector("#statusText");
const holidayName = document.querySelector("#holidayName");
const holidayDate = document.querySelector("#holidayDate");
const daysValue = document.querySelector("#days");
const hoursValue = document.querySelector("#hours");
const minutesValue = document.querySelector("#minutes");
const secondsValue = document.querySelector("#seconds");

const STORAGE_KEY = "selectedHoliday";
const THEME_IDS = [
  "christmas",
  "thanksgiving",
  "easter",
  "new-year",
  "halloween",
  "independence-day",
  "valentines-day",
];
let selectedHoliday = null;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function splitDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function formatUnit(value, length = 2) {
  return String(value).padStart(length, "0");
}

function renderCountdown() {
  if (!selectedHoliday) {
    return;
  }

  const now = new Date();
  const targetDate = getLocalHolidayDate(selectedHoliday);
  const remaining = splitDuration(targetDate.getTime() - now.getTime());

  document.title = `${selectedHoliday.name} Countdown`;
  applyHolidayTheme(selectedHoliday.id);
  statusText.textContent = targetDate.getFullYear() === now.getFullYear()
    ? "Next public holiday"
    : "Next occurrence";
  holidayName.textContent = selectedHoliday.name;
  holidayDate.textContent = dateFormatter.format(targetDate);
  holidayDate.dateTime = targetDate.toISOString();
  daysValue.textContent = formatUnit(remaining.days, 3);
  hoursValue.textContent = formatUnit(remaining.hours);
  minutesValue.textContent = formatUnit(remaining.minutes);
  secondsValue.textContent = formatUnit(remaining.seconds);
}

function applyHolidayTheme(id) {
  const themeId = THEME_IDS.includes(id) ? id : "christmas";

  document.body.dataset.theme = themeId;
}

function getLocalHolidayDate(holiday) {
  return new Date(holiday.year, holiday.month - 1, holiday.day, 0, 0, 0, 0);
}

async function loadHoliday() {
  const id = holidaySelect.value;
  const response = await fetch(`/api/holiday/${id}`);

  if (!response.ok) {
    throw new Error(`Holiday API returned ${response.status}`);
  }

  selectedHoliday = await response.json();
  renderCountdown();
}

function restoreSelection() {
  const storedHoliday = localStorage.getItem(STORAGE_KEY);

  if (storedHoliday && holidaySelect.querySelector(`option[value="${storedHoliday}"]`)) {
    holidaySelect.value = storedHoliday;
  }
}

holidaySelect.addEventListener("change", () => {
  localStorage.setItem(STORAGE_KEY, holidaySelect.value);
  loadHoliday().catch(() => {
    statusText.textContent = "Could not load holiday";
  });
});

restoreSelection();
loadHoliday().catch(() => {
  statusText.textContent = "Could not load holiday";
});
setInterval(renderCountdown, 1000);
setInterval(loadHoliday, 60 * 60 * 1000);

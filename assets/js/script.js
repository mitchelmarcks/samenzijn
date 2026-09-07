const dayNames = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const monthNames = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december"
];

const countdownEls = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  status: document.getElementById("countdownStatus"),
  targetDateText: document.getElementById("targetDateText")
};

const mapPhaseEl = document.getElementById("mapPhase");
const mapNoteEl = document.getElementById("mapNote");
const recenterMapBtn = document.getElementById("recenterMapBtn");
const galleryItems = document.querySelectorAll(".gallery-item");
const lightboxEl = document.getElementById("imageLightbox");
const lightboxImageEl = document.getElementById("lightboxImage");
const lightboxCaptionEl = document.getElementById("lightboxCaption");
const lightboxCloseBtn = document.getElementById("lightboxCloseBtn");

const map = L.map("map", {
  zoomControl: true,
  attributionControl: true
}).setView([54.5, 15], 4);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let focusMarker = null;
let lastStageKey = null;

const locations = {
  europe: { center: [54.5, 15], zoom: 4, phase: "Ergens in Europa...", note: "Brede aanloop: we tonen Europa." },
  benelux: { center: [50.85, 4.35], zoom: 6, phase: "Benelux", note: "Halverwege de aanloop: focus op de Benelux." },
  country: {
    center: [51.1657, 10.4515],
    zoom: 7,
    phase: "Bestemmingsland",
    note: "Vier maanden vooraf tonen we het land van bestemming."
  },
  region: { center: [50.97, 6.95], zoom: 8, phase: "Regio", note: "Per maand zoomen we verder in op de regio." },
  province: { center: [50.94, 6.96], zoom: 9, phase: "Omgeving", note: "Nog dichterbij: de omgeving wordt zichtbaar." },
  city: { center: [50.9375, 6.9603], zoom: 10, phase: "Stadsniveau", note: "Laatste maand: richting stadsniveau." },
  exact: { center: [50.9413, 6.9583], zoom: 12, phase: "Exacte zone", note: "Bijna zover: locatiegebied in detail." }
};

function getEasterSunday(year) {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getEditionDates(year) {
  const easterSunday = getEasterSunday(year);
  const pentecostSunday = addDays(easterSunday, 49);
  const pentecostMonday = addDays(easterSunday, 50);
  const fridayBeforePentecost = addDays(easterSunday, 47);

  const pentecostMondayEnd = new Date(
    pentecostMonday.getFullYear(),
    pentecostMonday.getMonth(),
    pentecostMonday.getDate(),
    23,
    59,
    59,
    999
  );

  return {
    fridayBeforePentecost,
    pentecostMonday,
    pentecostMondayEnd
  };
}

function getTargetEdition(now = new Date()) {
  const currentYearDates = getEditionDates(now.getFullYear());

  if (now <= currentYearDates.pentecostMondayEnd) {
    return { year: now.getFullYear(), ...currentYearDates };
  }

  const nextYearDates = getEditionDates(now.getFullYear() + 1);
  return { year: now.getFullYear() + 1, ...nextYearDates };
}

function formatDateNl(date) {
  return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function getRemainingParts(targetDate, now) {
  const diff = targetDate.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { diff, days, hours, minutes, seconds };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function resolveMapStage(daysToFriday) {
  const monthsToFriday = daysToFriday / 30.44;

  if (monthsToFriday > 6) {
    return locations.europe;
  }

  if (monthsToFriday > 4) {
    return locations.benelux;
  }

  if (monthsToFriday > 3) {
    return locations.country;
  }

  if (monthsToFriday > 2) {
    return locations.region;
  }

  if (monthsToFriday > 1) {
    return locations.province;
  }

  if (daysToFriday > 0) {
    return locations.city;
  }

  return locations.exact;
}

function getStageKey(daysToFriday) {
  const monthsToFriday = daysToFriday / 30.44;

  if (monthsToFriday > 6) {
    return "europe";
  }

  if (monthsToFriday > 4) {
    return "benelux";
  }

  if (monthsToFriday > 3) {
    return "country";
  }

  if (monthsToFriday > 2) {
    return "region";
  }

  if (monthsToFriday > 1) {
    return "province";
  }

  if (daysToFriday > 0) {
    return "city";
  }

  return "exact";
}

function centerMapOnStage(stage) {
  map.setView(stage.center, stage.zoom, { animate: true, duration: 1.2 });
}

function updateMapForDate(targetEdition, now = new Date(), options = {}) {
  const { forceCenter = false } = options;
  const daysToFriday = (targetEdition.fridayBeforePentecost.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const stageKey = getStageKey(daysToFriday);
  const stage = resolveMapStage(daysToFriday);

  const stageChanged = stageKey !== lastStageKey;
  if (forceCenter || stageChanged) {
    centerMapOnStage(stage);
  }

  lastStageKey = stageKey;
  mapPhaseEl.textContent = `Fase: ${stage.phase}`;
  mapNoteEl.textContent = stage.note;

  const revealPointDays = 31;
  if (daysToFriday <= revealPointDays) {
    if (!focusMarker) {
      focusMarker = L.marker(stage.center).addTo(map);
    } else {
      focusMarker.setLatLng(stage.center);
    }
  } else if (focusMarker) {
    map.removeLayer(focusMarker);
    focusMarker = null;
  }
}

function updateCountdown() {
  const now = new Date();
  const targetEdition = getTargetEdition(now);

  const friday = targetEdition.fridayBeforePentecost;
  const mondayEnd = targetEdition.pentecostMondayEnd;

  //countdownEls.targetDateText.textContent = `Doelmoment: vrijdag ${formatDateNl(friday)} (${targetEdition.year})`;
  countdownEls.targetDateText.textContent = `Doelmoment: pinksteren ${targetEdition.year}`;

  if (now < friday) {
    const remaining = getRemainingParts(friday, now);

    countdownEls.days.textContent = pad(remaining.days);
    countdownEls.hours.textContent = pad(remaining.hours);
    countdownEls.minutes.textContent = pad(remaining.minutes);
    countdownEls.seconds.textContent = pad(remaining.seconds);
    countdownEls.status.textContent = `Aftellen naar de start van SamenZijn ${targetEdition.year}.`;
  } else if (now <= mondayEnd) {
    countdownEls.days.textContent = "00";
    countdownEls.hours.textContent = "00";
    countdownEls.minutes.textContent = "00";
    countdownEls.seconds.textContent = "00";
    countdownEls.status.textContent = "SamenZijn is nu bezig. Na pinkstermaandag start de teller opnieuw.";
  } else {
    const nextEdition = getTargetEdition(addDays(now, 370));
    const remaining = getRemainingParts(nextEdition.fridayBeforePentecost, now);

    countdownEls.days.textContent = pad(remaining.days);
    countdownEls.hours.textContent = pad(remaining.hours);
    countdownEls.minutes.textContent = pad(remaining.minutes);
    countdownEls.seconds.textContent = pad(remaining.seconds);
    //countdownEls.targetDateText.textContent = `Doelmoment: vrijdag ${formatDateNl(nextEdition.fridayBeforePentecost)} (${nextEdition.year})`;
    countdownEls.targetDateText.textContent = `Doelmoment: pinksteren ${nextEdition.year}`;
    countdownEls.status.textContent = "Nieuwe editie actief: aftellen is opnieuw gestart.";
  }

  updateMapForDate(targetEdition, now);
}

updateCountdown();
setInterval(updateCountdown, 1000);

if (recenterMapBtn) {
  recenterMapBtn.addEventListener("click", () => {
    const now = new Date();
    const targetEdition = getTargetEdition(now);
    updateMapForDate(targetEdition, now, { forceCenter: true });
  });
}

function openLightbox(src, caption) {
  if (!lightboxEl || !lightboxImageEl || !lightboxCaptionEl) {
    return;
  }

  lightboxImageEl.src = src;
  lightboxImageEl.alt = caption;
  lightboxCaptionEl.textContent = caption;
  lightboxEl.classList.add("is-open");
  lightboxEl.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  if (!lightboxEl || !lightboxImageEl || !lightboxCaptionEl) {
    return;
  }

  lightboxEl.classList.remove("is-open");
  lightboxEl.setAttribute("aria-hidden", "true");
  lightboxImageEl.src = "";
  lightboxImageEl.alt = "";
  lightboxCaptionEl.textContent = "";
}

galleryItems.forEach((item) => {
  item.addEventListener("click", () => {
    const fullSrc = item.getAttribute("data-full-src");
    const caption = item.getAttribute("data-caption") || "Sfeerbeeld vorige editie";

    if (fullSrc) {
      openLightbox(fullSrc, caption);
    }
  });
});

if (lightboxCloseBtn) {
  lightboxCloseBtn.addEventListener("click", closeLightbox);
}

if (lightboxEl) {
  lightboxEl.addEventListener("click", (event) => {
    if (event.target === lightboxEl) {
      closeLightbox();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightboxEl && lightboxEl.classList.contains("is-open")) {
    closeLightbox();
  }
});

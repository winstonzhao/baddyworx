const { parse } = require("node-html-parser");
const moment = require("moment");
const fs = require("fs");
const express = require("express");
const app = express();
const cors = require('cors')
app.use(cors())

const getStatusForDate = async (d) => {
  const date = d.utc().startOf("day").toDate();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getYear() + 1900;
  const res = await fetch(
    `https://badmintoncentre-botany.yepbooking.com.au/ajax/ajax.schema.php?day=${day}&month=${month}&year=${year}&id_sport=1`
  );
  const text = await res.text();
  const root = parse(text);
  const cells = root.querySelectorAll(".tooltip");
  const statuses = cells
    .map((c) => c._rawAttrs.title)
    .filter((t) => t.includes(" - "));
  const first = statuses[0].substring(0, "1:00pm–2:00".length);
  const numTimes = statuses.findIndex(
    (s, i) => s.substring(0, "1:00pm–2:00".length) === first && i != 0
  );
  const numCourts = statuses.length / numTimes;
  const result = {};
  for (let i = 0; i < numCourts; ++i) {
    result[i + 1] = [];
    for (let j = 0; j < numTimes; ++j) {
      const idx = i * numTimes + j;
      const status = statuses[idx];
      const startDate = new Date(date.getTime());
      const endDate = new Date(date.getTime());

      const times = status.split(" - ")[0].split("–");
      const [start, end] = times.map((t) => {
        let pm = t.substring(t.length - 2, t.length) === "pm";
        t = t.substring(0, t.length - 2);
        const [hour, minute] = t.split(":");
        pm = parseInt(hour) === 12 || parseInt(hour) === 24 ? !pm : pm;
        return {
          hour: pm ? parseInt(hour) + 12 : parseInt(hour),
          minute: parseInt(minute),
        };
      });
      startDate.setHours(start.hour - 1 + 12);
      startDate.setMinutes(start.minute);
      startDate.setSeconds(0);
      startDate.setMilliseconds(0);
      endDate.setHours(end.hour - 1 + 12);
      endDate.setMinutes(end.minute);
      endDate.setSeconds(0);
      endDate.setMilliseconds(0);
      const available = status.toLowerCase().includes("available");

      result[i + 1].push({
        startDate,
        endDate,
        available,
      });
    }
  }

  return result;
};

const getStatusForDays = async (days) => {
  const out = {};
  let date = moment().startOf("day");
  const dates = [];
  for (let i = 0; i < days; ++i) {
    dates.push(date);
    date = moment(date.add(1, "d"));
  }

  const results = await Promise.all(dates.map((d) => getStatusForDate(d)));
  results.forEach((r, i) => {
    out[dates[i]] = r;
  });
  return out;
};

const syncDbAndGetChanges = async (lookbackDays) => {
  const results = JSON.parse(JSON.stringify(await getStatusForDays(lookbackDays)));
  const changed = [];

  //   if (!fs.existsSync("db.json")) {
  //     fs.writeFileSync("db.json", JSON.stringify(results));
  //     for (const key of Object.keys(results)) {
  //       const newData = results[key];
  //       for (const key of Object.keys(newData)) {
  //         for (let i = 0; i < newData[key].length; ++i) {
  //           changed.push({ new: newData[key][i], old: null });
  //         }
  //       }
  //     }
  //     return { changed, availability: results };
  //   }

  //   const existing = JSON.parse(fs.readFileSync("db.json"));
  //   for (const key of Object.keys(results)) {
  //     const newData = results[key];
  //     const oldData = existing[key];
  //     if (oldData) {
  //       for (const key of Object.keys(newData)) {
  //         for (let i = 0; i < newData[key].length; ++i) {
  //           if (
  //             JSON.stringify(newData[key][i]) !== JSON.stringify(oldData[key][i])
  //           ) {
  //             changed.push({ new: newData[key][i], old: oldData[key][i] });
  //           }
  //         }
  //       }
  //     } else {
  //       Object.keys(newData).forEach((d) =>
  //         changed.push({ newData: newData[d], oldData: null })
  //       );
  //     }
  //   }

  return { changed, availability: results };
};

const getAvailabilityWithFilter = async (filter) => {
  const freeCourts = [];
  const {changed, availability} = await syncDbAndGetChanges(filter.lookbackDays);
  for (const key of Object.keys(availability)) {
    const time = moment(key);
    const weekDay = time.format("dddd");
    if (!filter.days.includes(weekDay)) continue;
    for (const court of Object.keys(availability[key])) {
      for (const slot of availability[key][court]) {
        const start = moment(slot.startDate).add(-11, "h").hour();
        const end = moment(slot.endDate).add(-11, "h").hour();
        if (
          start >= filter.hourStart &&
          end <= filter.hourEnd &&
          slot.available
        ) {
          freeCourts.push({ court, slot });
        }
      }
    }
  }
  return freeCourts;
};

let cache = null;

const filters = [
  {
    label: "Weekday Evenings",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    hourStart: 19,
    hourEnd: 22,
    lookbackDays: 7
  },
];

app.use(express.json());
app.post("/availabilities", async (req, res) => {
  const filter = req.body;
  const freeCourts = await getAvailabilityWithFilter(filter);
  res.send(JSON.stringify(freeCourts));
});
app.use(express.static('frontend/build'));
// let the react app to handle any unknown routes 
// serve up the index.html if express does'nt recognize the route
const path = require('path');
app.get('*', (req, res) => {
res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
});
app.listen(8001);

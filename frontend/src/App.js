import badminton from "./badminton.svg";
import "./App.css";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import InputGroup from "react-bootstrap/InputGroup";
import React, { useState } from "react";
import Alert from "react-bootstrap/Alert";
import moment from "moment";

function App() {
  const [formState, setFormState] = useState({
    lookaheadDays: 7,
    timeRange: "19:00 - 22:00",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    errorMessage: null,
  });

  const [availabilitiesState, setAvailabilitiesState] = useState(null);
  const [intervalState, setIntervalState] = useState(null);
  const [checkedState, setCheckedState] = useState(null);

  const onCheckBoxChange = (e) => {
    const currentDays = formState.days;
    const checked = e.target.checked;
    const day = e.target.name;
    if (checked && !currentDays.includes(day)) {
      currentDays.push(day);
    } else if (!checked && currentDays.includes(day)) {
      const idx = currentDays.findIndex((d) => d === day);
      currentDays.splice(idx, 1);
    }
    setFormState({ ...formState, days: [...currentDays] });
    console.log(formState);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-container">
          <img
            style={{ transform: "translate(40px, -30px)", zIndex: -1 }}
            src={badminton}
            width="100"
            height="50"
          />
          <b>Baddy</b> Worx
        </div>
        <Form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (formState.lookaheadDays <= 0) {
              setFormState({
                ...formState,
                errorMessage: "Must look ahead atleast 1 day",
              });
              return;
            }
            if (formState.lookaheadDays >= 35) {
              setFormState({
                ...formState,
                errorMessage: "Cannot look ahead more than 35 days",
              });
              return;
            }
            if (formState.days.length === 0) {
              setFormState({
                ...formState,
                errorMessage: "Must select atleast one day",
              });
              return;
            }
            const pattern = /(\d{2}):(\d{2}) - (\d{2}):(\d{2})/;
            const match = formState.timeRange.match(pattern);
            if (!match) {
              setFormState({
                ...formState,
                errorMessage: "Invalid time range format must be HH:MM - HH:MM",
              });
              return;
            }
            const startHour = parseInt(match[1], 10);
            const startMinute = parseInt(match[2], 10);
            const endHour = parseInt(match[3], 10);
            const endMinute = parseInt(match[4], 10);

            if (startHour <= 0 || startHour > 24) {
              setFormState({
                ...formState,
                errorMessage: "Start time hours out of range",
              });
              return;
            }
            if (startMinute < 0 || startMinute >= 60) {
              setFormState({
                ...formState,
                errorMessage: "Start time minutes out of range",
              });
              return;
            }
            if (endHour <= 0 || endHour > 24) {
              setFormState({
                ...formState,
                errorMessage: "End time hours out of range",
              });
              return;
            }
            if (endMinute < 0 || endMinute >= 60) {
              setFormState({
                ...formState,
                errorMessage: "End time minutes out of range",
              });
              return;
            }

            setFormState({ ...formState, errorMessage: null });
            fetch("/availabilities", {
              method: "post",
              body: JSON.stringify({
                ...formState,
                hourStart: startHour,
                hourEnd: endHour,
                lookbackDays: formState.lookaheadDays,
              }),
              headers: { "content-type": "application/json" },
            }).then((res) => res.json().then(setAvailabilitiesState));
            setCheckedState(moment().format("hh:mm:ss"));

            if (intervalState) {
              clearInterval(intervalState);
            }

            setIntervalState(
              setInterval(() => {
                fetch("/availabilities", {
                  method: "post",
                  body: JSON.stringify({
                    ...formState,
                    hourStart: startHour,
                    hourEnd: endHour,
                    lookbackDays: formState.lookaheadDays,
                  }),
                  headers: { "content-type": "application/json" },
                }).then((res) =>
                  res.json().then((d) => {
                    setCheckedState(moment().format("hh:mm:ss"));
                    setAvailabilitiesState(d);
                  })
                );
              }, 10000)
            );
          }}
        >
          <Form.Group
            as={Row}
            className="mb-3"
            controlId="exampleForm.ControlInput1"
          >
            <Form.Label column sm={2}>
              Lookahead Days
            </Form.Label>
            <Col sm={10}>
              <Form.Control
                name="lookahead_days"
                type="number"
                placeholder="7"
                value={formState.lookaheadDays}
                onChange={(e) => {
                  setFormState({ ...formState, lookaheadDays: e.target.value });
                }}
              />
            </Col>
          </Form.Group>
          <Form.Group
            as={Row}
            className="mb-3"
            controlId="exampleForm.ControlTextarea1"
          >
            <Form.Label column sm={2}>
              Time Range
            </Form.Label>
            <Col sm={10}>
              <InputGroup hasValidation>
                <Form.Control
                  name="time_range"
                  type="text"
                  placeholder="19:00 - 22:00"
                  value={formState.timeRange}
                  onChange={(e) => {
                    setFormState({ ...formState, timeRange: e.target.value });
                  }}
                />
              </InputGroup>
            </Col>
          </Form.Group>
          <Form.Group
            as={Row}
            className="mb-3"
            controlId="exampleForm.ControlTextarea1"
          >
            <Form.Label column sm={2}>
              Days of the Week
            </Form.Label>
            <Col sm={10}>
              <Form.Check
                name="Monday"
                onChange={onCheckBoxChange}
                checked={formState.days.includes("Monday")}
                type="checkbox"
                label={`Monday`}
              />
              <Form.Check
                name="Tuesday"
                onChange={onCheckBoxChange}
                checked={formState.days.includes("Tuesday")}
                type="checkbox"
                label={`Tuesday`}
              />
              <Form.Check
                name="Wednesday"
                onChange={onCheckBoxChange}
                checked={formState.days.includes("Wednesday")}
                type="checkbox"
                label={`Wednesday`}
              />
              <Form.Check
                name="Thursday"
                onChange={onCheckBoxChange}
                checked={formState.days.includes("Thursday")}
                type="checkbox"
                label={`Thursday`}
              />
              <Form.Check
                name="Friday"
                onChange={onCheckBoxChange}
                checked={formState.days.includes("Friday")}
                type="checkbox"
                label={`Friday`}
              />
              <Form.Check
                name="Saturday"
                onChange={onCheckBoxChange}
                checked={formState.days.includes("Saturday")}
                type="checkbox"
                label={`Saturday`}
              />
              <Form.Check
                name="Sunday"
                onChange={onCheckBoxChange}
                checked={formState.days.includes("Sunday")}
                type="checkbox"
                label={`Sunday`}
              />
            </Col>
          </Form.Group>
          <Form.Group
            as={Row}
            className="mb-3"
            controlId="exampleForm.ControlTextarea1"
          >
            <Form.Label style={{ color: "#f44336" }} row>
              {formState.errorMessage}
            </Form.Label>
          </Form.Group>
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </Form>
        <div className="availabilities">
          {intervalState && (
            <div style={{ marginBottom: "20px" }}>
              Will continue polling for availabilities. Last checked {checkedState}.
            </div>
          )}
          {JSON.stringify(availabilitiesState) === "[]" && (
            <Alert variant="danger">No availabilities found.</Alert>
          )}
          {availabilitiesState &&
            availabilitiesState.map((avail, i) => {
              const date = moment(avail.slot.startDate).utc().startOf("day");
              const now = moment().utc().add(11, "h").startOf("day");
              const daysFromNow = (date - now) / (172800000 / 2);
              const startTime = moment(avail.slot.startDate).utc().format("hA");
              const endTime = moment(avail.slot.endDate).utc().format("hA");
              const msg = `${startTime} - ${endTime} ${date
                .utc()
                .format(
                  "dddd Mo MMMM"
                )} - ${daysFromNow} days from now - Court ${avail.court}`;
              return (
                <Alert key={i} variant="success">
                  {msg}
                </Alert>
              );
            })}
        </div>
      </header>
    </div>
  );
}

export default App;

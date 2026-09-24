import test from "node:test";
import assert from "node:assert/strict";
import { latestResultsByItem, normalizeDraftState, normalizeSetLogs, romeWeekStart } from "./workout-records.js";

test("keeps a previous result for each duplicate exercise row", () => {
  const workout = { days: [{ id: "day-a", items: [
    { id: "warmup", exerciseId: "squat", loadType: "body" },
    { id: "work", exerciseId: "squat", loadType: "weight" },
    { id: "repeat", exerciseId: "squat", loadType: "weight" },
  ] }] };
  const session = { date: "2026-09-20T10:00:00Z", workoutDayId: "day-a" };
  const logs = [
    { workoutItemId: "warmup", exerciseId: "squat", loadUnit: "body", completed: true, session, sets: [{ setIndex: 0, repsDone: 10 }] },
    { workoutItemId: "work", exerciseId: "squat", loadUnit: "weight", completed: true, session, loadUsed: "60 kg", sets: [{ setIndex: 0, loadValue: 60, repsDone: 8 }] },
  ];
  const result = latestResultsByItem(workout, logs);
  assert.equal(result.warmup.sets[0].repsDone, 10);
  assert.equal(result.work.sets[0].loadValue, 60);
  assert.equal(result.repeat.loadUsed, "60 kg");
});

test("prefers the same row over a newer result from a different day", () => {
  const workout = { days: [{ id: "day-a", items: [{ id: "a", exerciseId: "curl", loadType: "weight" }] }] };
  const logs = [
    { workoutItemId: "b", exerciseId: "curl", loadUnit: "weight", completed: true, session: { date: "2026-09-23", workoutDayId: "day-b" }, loadUsed: "30 kg" },
    { workoutItemId: "a", exerciseId: "curl", loadUnit: "weight", completed: true, session: { date: "2026-09-20", workoutDayId: "day-a" }, loadUsed: "25 kg" },
  ];
  assert.equal(latestResultsByItem(workout, logs).a.loadUsed, "25 kg");
});

test("an empty completed row does not hide the last recorded score", () => {
  const workout = { days: [{ id: "day-a", items: [{ id: "a", exerciseId: "curl", loadType: "weight" }] }] };
  const logs = [
    { workoutItemId: "a", exerciseId: "curl", loadUnit: "weight", completed: true, session: { date: "2026-09-23", workoutDayId: "day-a" }, perceivedDifficulty: 6, sets: [] },
    { workoutItemId: "a", exerciseId: "curl", loadUnit: "weight", completed: true, session: { date: "2026-09-20", workoutDayId: "day-a" }, loadUsed: "25 kg", sets: [{ setIndex: 0, loadValue: 25, repsDone: 8 }] },
  ];
  assert.equal(latestResultsByItem(workout, logs).a.loadUsed, "25 kg");
});

test("validates and sorts structured sets", () => {
  assert.deepEqual(normalizeSetLogs([
    { setIndex: 1, loadValue: "62,5", repsDone: "7" },
    { setIndex: 0, loadValue: "60", repsDone: "8" },
  ], "weight", 2), [
    { setIndex: 0, loadValue: 60, repsDone: 8, durationSeconds: null },
    { setIndex: 1, loadValue: 62.5, repsDone: 7, durationSeconds: null },
  ]);
  assert.throws(() => normalizeSetLogs([{ setIndex: 0 }, { setIndex: 0 }], "body", 2));
});

test("keeps only draft data belonging to the selected day", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const draft = normalizeDraftState({
    submissionId: id,
    logs: { "item-a": { completed: true, draftSetLoads: ["60", "62,5"], draftSetReps: ["8", "7"], draftActiveSetIdx: 1 } },
    phase: "done",
    unlockedThrough: 2,
  }, new Map([["item-a", { loadType: "weight", sets: 2 }]]));
  assert.deepEqual(draft.logs["item-a"].draftSetReps, ["8", "7"]);
  assert.equal(draft.phase, "done");
  assert.throws(() => normalizeDraftState({ submissionId: id, logs: { "other-day": {} } }, new Map([["item-a", { loadType: "weight", sets: 2 }]])));
  assert.throws(() => normalizeDraftState({ submissionId: "bad", logs: {} }, new Map()));
});

test("preserves completed set scores in a cross-device draft", () => {
  const draft = normalizeDraftState({
    submissionId: "123e4567-e89b-42d3-a456-426614174000",
    logs: { squat: {
      completed: true, loadUsed: "60 kg / 62,5 kg", repsDone: "8 / 7",
      sets: [{ setIndex: 0, loadValue: "60", repsDone: "8" }, { setIndex: 1, loadValue: "62,5", repsDone: "7" }],
    } },
  }, new Map([["squat", { loadType: "weight", sets: 2 }]]));
  assert.equal(draft.logs.squat.repsDone, "8 / 7");
  assert.deepEqual(draft.logs.squat.sets.map(({ loadValue, repsDone }) => [loadValue, repsDone]), [[60, 8], [62.5, 7]]);
});

test("uses the Monday of the Rome calendar week", () => {
  assert.equal(romeWeekStart(new Date("2026-09-20T23:30:00Z")).toISOString(), "2026-09-21T00:00:00.000Z");
});

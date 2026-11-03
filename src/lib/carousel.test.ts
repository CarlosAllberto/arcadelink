import assert from "node:assert/strict";
import { test } from "node:test";
import { circularOffset, randomOther, wrapIndex } from "./carousel.ts";

test("wrapIndex dá a volta nos dois sentidos", () => {
  assert.equal(wrapIndex(-1, 5), 4);
  assert.equal(wrapIndex(5, 5), 0);
});

test("circularOffset escolhe o caminho mais curto", () => {
  assert.equal(circularOffset(0, 0, 5), 0);
  assert.equal(circularOffset(1, 0, 5), 1);
  assert.equal(circularOffset(4, 0, 5), -1);
  assert.equal(circularOffset(0, 4, 5), 1);
  assert.equal(circularOffset(3, 0, 5), -2);
});

test("randomOther nunca repete o atual e cobre os demais", () => {
  assert.equal(randomOther(1, 0), 0);
  for (const random of [0, 0.5, 0.99]) assert.notEqual(randomOther(3, 1, () => random), 1);
  assert.equal(randomOther(3, 1, () => 0), 0);
  assert.equal(randomOther(3, 1, () => 0.99), 2);
});

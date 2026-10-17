import { describe, expect, it } from 'vitest';
import { DEFAULTS, EXAMPLE_SALARY, MAX_THING_NAME, MAX_THINGS, parseSettings, taxInputs } from './settings';

describe('parseSettings', () => {
  it('falls back to defaults for anything that is not a saved object', () => {
    expect(parseSettings(null)).toEqual(DEFAULTS);
    expect(parseSettings('{"salary": 1}')).toEqual(DEFAULTS);
  });

  it('keeps valid fields', () => {
    const s = parseSettings({
      salary: 120_000,
      filingStatus: 'married_joint',
      stateRate: 0.05,
      overrides: { federal: 0.18 },
      clock: { kind: 'work', hoursPerWeek: 37.5, weeksPerYear: 48 },
      coin: 0.1,
      timeUnit: 'week',
      combineTaxes: true,
      things: [{ name: 'Groceries', amount: 120 }],
      skin: 'arcade',
      sound: true,
    });
    expect(s).toEqual({
      salary: 120_000,
      filingStatus: 'married_joint',
      stateRate: 0.05,
      overrides: { federal: 0.18 },
      clock: { kind: 'work', hoursPerWeek: 37.5, weeksPerYear: 48 },
      workWeek: { hoursPerWeek: 37.5, weeksPerYear: 48 },
      coin: 0.1,
      timeUnit: 'week',
      combineTaxes: true,
      things: [{ name: 'Groceries', amount: 120 }],
      skin: 'arcade',
      sound: true,
    });
  });

  it('keeps the work week while the 24-hour clock is on', () => {
    const s = parseSettings({ clock: { kind: 'around' }, workWeek: { hoursPerWeek: 30, weeksPerYear: 46 } });
    expect(s.clock).toEqual({ kind: 'around' });
    expect(s.workWeek).toEqual({ hoursPerWeek: 30, weeksPerYear: 46 });
  });

  it('falls back to the default work week when neither the save nor its clock has one', () => {
    expect(parseSettings({ workWeek: { hoursPerWeek: 200, weeksPerYear: 52 } }).workWeek).toEqual(
      DEFAULTS.workWeek,
    );
  });

  it('caps the list of things and the length of their names', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: `Thing ${String(i)}`, amount: 1 }));
    const s = parseSettings({ things: [{ name: 'x'.repeat(80), amount: 3 }, ...many] });
    expect(s.things).toHaveLength(MAX_THINGS);
    expect(s.things[0]?.name).toHaveLength(MAX_THING_NAME);
  });

  it('replaces each bad field with its default, field by field', () => {
    const s = parseSettings({
      salary: -5,
      filingStatus: 'pirate',
      stateRate: 3,
      overrides: { federal: 2, medicare: 0.03, bogus: 1 },
      clock: { kind: 'work', hoursPerWeek: 0, weeksPerYear: 52 },
      coin: 0.25,
      timeUnit: 'fortnight',
      combineTaxes: 'yes',
      things: [{ name: 'Ok', amount: 5 }, { name: 'No amount' }, 'junk'],
      sound: 'yes',
    });
    expect(s.salary).toBeNull();
    expect(s.filingStatus).toBe('single');
    expect(s.stateRate).toBeNull();
    expect(s.overrides).toEqual({ medicare: 0.03 });
    expect(s.clock).toEqual({ kind: 'around' });
    expect(s.coin).toBe('auto');
    expect(s.timeUnit).toBe('hour');
    expect(s.combineTaxes).toBe(false);
    expect(s.things).toEqual([{ name: 'Ok', amount: 5 }]);
    expect(s.sound).toBe(false);
  });

  it('keeps an explicitly empty salary', () => {
    expect(parseSettings({ salary: null }).salary).toBeNull();
  });

  it('tells "no state tax" apart from "not answered yet"', () => {
    expect(parseSettings({ stateRate: 0 }).stateRate).toBe(0);
    expect(parseSettings({}).stateRate).toBeNull();
  });
});

describe('taxInputs', () => {
  it('computes the example while no salary is typed', () => {
    expect(taxInputs(DEFAULTS).salary).toBe(EXAMPLE_SALARY);
    expect(taxInputs({ ...DEFAULTS, salary: 0 }).salary).toBe(0);
  });

  it('computes no state tax until a rate is given', () => {
    expect(taxInputs(DEFAULTS).stateRate).toBe(0);
    expect(taxInputs({ ...DEFAULTS, stateRate: 0.05 }).stateRate).toBe(0.05);
  });
});

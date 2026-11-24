import { useEffect, useId, useState } from "react";
import type { Filters } from "../lib/searchParams.ts";
import { EMPTY_FILTERS } from "../lib/searchParams.ts";
import { US_STATES } from "../lib/states.ts";

type SearchFiltersProps = {
  value: Filters;
  onSubmit: (filters: Filters) => void;
};

export function SearchFilters({ value, onSubmit }: SearchFiltersProps) {
  const [draft, setDraft] = useState<Filters>(value);
  const formId = useId();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function update<K extends keyof Filters>(key: K, next: Filters[K]) {
    setDraft((current) => ({ ...current, [key]: next }));
  }

  return (
    <form
      className="filters"
      aria-labelledby={`${formId}-legend`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...draft, page: 1 });
      }}
      onReset={(event) => {
        event.preventDefault();
        onSubmit({ ...EMPTY_FILTERS });
      }}
    >
      <div className="filters__header">
        <h2 id={`${formId}-legend`} className="filters__title">
          Search recalls
        </h2>
        <p className="filters__hint">
          Search looks at the product description and the reason for the recall.
        </p>
      </div>

      <div className="filters__grid">
        <p className="field field--search">
          <label htmlFor={`${formId}-q`}>Search</label>
          <input
            id={`${formId}-q`}
            type="search"
            name="q"
            value={draft.q}
            onChange={(event) => update("q", event.target.value)}
            placeholder="e.g. ibuprofen or labeling"
            autoComplete="off"
          />
        </p>

        <p className="field">
          <label htmlFor={`${formId}-classification`}>Classification</label>
          <select
            id={`${formId}-classification`}
            name="classification"
            value={draft.classification}
            onChange={(event) => update("classification", event.target.value)}
          >
            <option value="">All classes</option>
            <option value="Class I">Class I</option>
            <option value="Class II">Class II</option>
            <option value="Class III">Class III</option>
          </select>
        </p>

        <p className="field">
          <label htmlFor={`${formId}-state`}>State</label>
          <select
            id={`${formId}-state`}
            name="state"
            value={draft.state}
            onChange={(event) => update("state", event.target.value)}
          >
            <option value="">All states</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.code} — {state.name}
              </option>
            ))}
          </select>
        </p>

        <p className="field">
          <label htmlFor={`${formId}-from`}>Report date from</label>
          <input
            id={`${formId}-from`}
            type="date"
            name="from"
            value={draft.from}
            onChange={(event) => update("from", event.target.value)}
          />
        </p>

        <p className="field">
          <label htmlFor={`${formId}-to`}>Report date to</label>
          <input
            id={`${formId}-to`}
            type="date"
            name="to"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) => update("to", event.target.value)}
          />
        </p>
      </div>

      <div className="filters__actions">
        <button type="submit" className="button">
          Apply filters
        </button>
        <button type="reset" className="button button--secondary">
          Reset
        </button>
      </div>
    </form>
  );
}

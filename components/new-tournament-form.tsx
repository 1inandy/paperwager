"use client";

import { useState } from "react";
import { createTournamentAction } from "@/lib/actions";
import { STARTING_BALANCE } from "@/lib/constants";
import { TOURNAMENT_DURATION_OPTIONS, type TournamentDuration } from "@/lib/tournaments/duration";

interface NewTournamentFormProps {
  defaultStart: string;
  defaultCustomEnd: string;
}

export function NewTournamentForm({
  defaultStart,
  defaultCustomEnd,
}: NewTournamentFormProps) {
  const [duration, setDuration] = useState<TournamentDuration>("1w");

  return (
    <form action={createTournamentAction} className="card space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-muted">
          Tournament name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="input"
          placeholder="Weekend NFL Challenge"
        />
      </div>
      <div>
        <label htmlFor="startingBalance" className="mb-1 block text-sm text-muted">
          Starting balance
        </label>
        <input
          id="startingBalance"
          name="startingBalance"
          type="number"
          defaultValue={STARTING_BALANCE}
          min={100}
          step={100}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="startsAt" className="mb-1 block text-sm text-muted">
          Starts
        </label>
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={defaultStart}
          className="input"
        />
      </div>
      <fieldset>
        <legend className="mb-2 block text-sm text-muted">Tournament length</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TOURNAMENT_DURATION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-lg border border-border bg-background/60 px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:border-border-strong has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
            >
              <input
                type="radio"
                name="duration"
                value={option.value}
                checked={duration === option.value}
                onChange={() => setDuration(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {duration === "custom" && (
        <div>
          <label htmlFor="endsAt" className="mb-1 block text-sm text-muted">
            Custom end
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={defaultCustomEnd}
            className="input"
          />
        </div>
      )}
      <button type="submit" className="btn-primary w-full">
        Create tournament
      </button>
    </form>
  );
}

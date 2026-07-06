"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTournamentAction,
  transferTournamentOwnerAction,
  updateTournamentParticipantRoleAction,
  updateTournamentSettingsAction,
} from "@/lib/actions";
import {
  isEndlessTournamentEnd,
  TOURNAMENT_DURATION_OPTIONS,
  type TournamentDuration,
} from "@/lib/tournaments/duration";
import { formatCurrency } from "@/lib/betting/odds";
import type { TournamentRole, TournamentStatus } from "@/lib/types";

interface ManagementTournament {
  id: string;
  creator_id: string;
  name: string;
  starting_balance: number;
  starts_at: string;
  ends_at: string;
  status: TournamentStatus;
}

interface ManagementParticipant {
  id: string;
  user_id: string;
  role: TournamentRole;
  joined_at: string;
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
  scorecards?:
    | { balance: number; starting_balance: number }
    | { balance: number; starting_balance: number }[]
    | null;
}

interface TournamentManagementPanelProps {
  tournament: ManagementTournament;
  participants: ManagementParticipant[];
  currentUserId: string;
  isOwner: boolean;
}

type ActionResponse = { error?: string; success?: true } | void;
type TournamentAction = (formData: FormData) => Promise<ActionResponse>;

interface ConfirmationRequest {
  title: string;
  body: string;
  confirmLabel: string;
  action: TournamentAction;
  formData: FormData;
  successMessage: string;
  tone?: "default" | "danger";
  closeAfterSuccess?: boolean;
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function firstValue<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getParticipantName(participant: ManagementParticipant) {
  return firstValue(participant.profiles)?.display_name ?? "Anonymous";
}

function getParticipantBalance(participant: ManagementParticipant) {
  return firstValue(participant.scorecards)?.balance ?? 0;
}

export function TournamentManagementPanel({
  tournament,
  participants,
  currentUserId,
  isOwner,
}: TournamentManagementPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const [duration, setDuration] = useState<TournamentDuration>(
    isEndlessTournamentEnd(tournament.ends_at) ? "infinite" : "custom",
  );
  const transferTargets = participants.filter(
    (participant) => participant.user_id !== tournament.creator_id,
  );
  const playerCountLabel = `${participants.length} player${
    participants.length === 1 ? "" : "s"
  }`;

  function closeModal() {
    if (pending) return;
    setIsOpen(false);
    setMessage(null);
    setConfirmation(null);
  }

  function requestConfirmation(request: ConfirmationRequest) {
    setMessage(null);
    setConfirmation(request);
  }

  function confirmAction() {
    if (!confirmation) return;

    const request = confirmation;
    startTransition(async () => {
      const result = await request.action(request.formData);

      if (result?.error) {
        setMessage(result.error);
        setConfirmation(null);
        return;
      }

      setMessage(request.successMessage);
      setConfirmation(null);
      if (request.closeAfterSuccess) {
        setIsOpen(false);
      }
      router.refresh();
    });
  }

  function requestSettingsSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestConfirmation({
      title: "Save tournament settings?",
      body: "These changes go live for everyone in this tournament.",
      confirmLabel: "Save changes",
      action: updateTournamentSettingsAction,
      formData: new FormData(event.currentTarget),
      successMessage: "Tournament updated",
    });
  }

  function requestRoleSave(
    event: FormEvent<HTMLFormElement>,
    participantName: string,
  ) {
    event.preventDefault();
    requestConfirmation({
      title: "Update role?",
      body: `${participantName}'s tournament permissions will change immediately.`,
      confirmLabel: "Update role",
      action: updateTournamentParticipantRoleAction,
      formData: new FormData(event.currentTarget),
      successMessage: "Role updated",
    });
  }

  function requestOwnershipTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newOwnerUserId = formData.get("newOwnerUserId");
    const newOwner = transferTargets.find(
      (participant) => participant.user_id === newOwnerUserId,
    );
    if (!newOwner) {
      setMessage("Choose a new owner");
      return;
    }

    requestConfirmation({
      title: "Transfer ownership?",
      body: `${getParticipantName(newOwner)} will become the tournament owner.`,
      confirmLabel: "Transfer",
      action: transferTournamentOwnerAction,
      formData,
      successMessage: "Ownership transferred",
    });
  }

  function requestDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestConfirmation({
      title: "Delete tournament?",
      body: "This removes the tournament, leaderboard entries, tournament scorecards, and related bets.",
      confirmLabel: "Delete",
      tone: "danger",
      action: deleteTournamentAction,
      formData: new FormData(event.currentTarget),
      successMessage: "Tournament deleted",
      closeAfterSuccess: true,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-secondary px-3 py-2 text-xs"
      >
        Manage
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:py-10">
          <div className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-panel shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 className="text-xl font-semibold">Manage tournament</h2>
                <p className="mt-1 text-sm text-muted">{tournament.name}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="btn-secondary px-3 py-2 text-xs"
              >
                Close
              </button>
            </div>

            {message && (
              <div className="mx-5 mt-5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
                {message}
              </div>
            )}

            <form onSubmit={requestSettingsSave} className="border-b border-border p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Settings</h3>
                <span className="badge-upcoming">Admin</span>
              </div>
              <input type="hidden" name="tournamentId" value={tournament.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="tournament-name" className="mb-1 block text-sm text-muted">
                    Name
                  </label>
                  <input
                    id="tournament-name"
                    name="name"
                    type="text"
                    required
                    defaultValue={tournament.name}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="tournament-status" className="mb-1 block text-sm text-muted">
                    Status
                  </label>
                  <select
                    id="tournament-status"
                    name="status"
                    defaultValue={tournament.status}
                    className="input"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tournament-starting-balance"
                    className="mb-1 block text-sm text-muted"
                  >
                    New entry balance
                  </label>
                  <input
                    id="tournament-starting-balance"
                    name="startingBalance"
                    type="number"
                    min={100}
                    step={100}
                    defaultValue={tournament.starting_balance}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="tournament-starts-at" className="mb-1 block text-sm text-muted">
                    Starts
                  </label>
                  <input
                    id="tournament-starts-at"
                    name="startsAt"
                    type="datetime-local"
                    required
                    defaultValue={toDateTimeLocalValue(tournament.starts_at)}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="tournament-duration" className="mb-1 block text-sm text-muted">
                    Length
                  </label>
                  <select
                    id="tournament-duration"
                    name="duration"
                    value={duration}
                    onChange={(event) =>
                      setDuration(event.target.value as TournamentDuration)
                    }
                    className="input"
                  >
                    {TOURNAMENT_DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {duration === "custom" && (
                  <div>
                    <label htmlFor="tournament-ends-at" className="mb-1 block text-sm text-muted">
                      Ends
                    </label>
                    <input
                      id="tournament-ends-at"
                      name="endsAt"
                      type="datetime-local"
                      required
                      defaultValue={toDateTimeLocalValue(tournament.ends_at)}
                      className="input"
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button type="submit" disabled={pending} className="btn-primary">
                  Save settings
                </button>
              </div>
            </form>

            <section className="border-b border-border p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Roles</h3>
                <span className="text-sm text-muted">{playerCountLabel}</span>
              </div>

              <div className="divide-y divide-border">
                {participants.map((participant) => {
                  const participantName = getParticipantName(participant);
                  const isCurrentOwner = participant.user_id === tournament.creator_id;
                  const isCurrentUser = participant.user_id === currentUserId;
                  const balance = getParticipantBalance(participant);

                  return (
                    <form
                      key={participant.id}
                      onSubmit={(event) => requestRoleSave(event, participantName)}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <input type="hidden" name="tournamentId" value={tournament.id} />
                      <input type="hidden" name="participantId" value={participant.id} />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{participantName}</p>
                          {isCurrentUser && (
                            <span className="text-xs text-primary">(you)</span>
                          )}
                          {isCurrentOwner && (
                            <span className="badge-upcoming">Owner</span>
                          )}
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted">
                          {formatCurrency(Number(balance))}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          name="role"
                          defaultValue={participant.role}
                          disabled={isCurrentOwner || pending}
                          className="input w-40"
                        >
                          <option value="admin">Admin/owner</option>
                          <option value="member">Member</option>
                        </select>
                        <button
                          type="submit"
                          disabled={isCurrentOwner || pending}
                          className="btn-secondary px-3 py-2"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  );
                })}
              </div>
            </section>

            {isOwner && (
              <section className="grid gap-5 p-5 md:grid-cols-2">
                <form onSubmit={requestOwnershipTransfer} className="space-y-4">
                  <h3 className="text-lg font-semibold">Transfer ownership</h3>
                  <input type="hidden" name="tournamentId" value={tournament.id} />
                  <select
                    name="newOwnerUserId"
                    className="input"
                    defaultValue=""
                    required
                    disabled={transferTargets.length === 0 || pending}
                  >
                    <option value="" disabled>
                      Choose member
                    </option>
                    {transferTargets.map((participant) => (
                      <option key={participant.id} value={participant.user_id}>
                        {getParticipantName(participant)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={transferTargets.length === 0 || pending}
                    className="btn-secondary"
                  >
                    Transfer
                  </button>
                </form>

                <form onSubmit={requestDelete} className="space-y-4">
                  <h3 className="text-lg font-semibold text-danger">
                    Delete tournament
                  </h3>
                  <input type="hidden" name="tournamentId" value={tournament.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg border border-danger/40 px-5 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                  >
                    Delete
                  </button>
                </form>
              </section>
            )}
          </div>
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">{confirmation.title}</h3>
            <p className="mt-2 text-sm text-muted">{confirmation.body}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={pending}
                className="btn-secondary px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={pending}
                className={
                  confirmation.tone === "danger"
                    ? "rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                    : "btn-primary px-4 py-2"
                }
              >
                {pending ? "Working..." : confirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";

interface TournamentShareLinkProps {
  inviteCode: string;
  shareUrl: string;
}

export function TournamentShareLink({
  inviteCode,
  shareUrl,
}: TournamentShareLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="card mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-muted">Share invite</h2>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-primary">
            {inviteCode}
          </p>
        </div>
        <button type="button" onClick={handleCopy} className="btn-primary">
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <input
        type="text"
        readOnly
        value={shareUrl}
        onFocus={(event) => event.currentTarget.select()}
        className="input font-mono text-xs"
      />
      <p className="mt-2 text-xs text-muted">
        Send this link to friends so they can open the invite and join the tournament.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Phone, Search, Star, Video } from "lucide-react";
import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { CallsSidebar, useCallEntries } from "@/components/layout/CallsSidebar";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { contactsApi } from "@/lib/api/contacts";
import { User } from "@/lib/api/users";
import { useFavorites } from "@/hooks/useFavorites";
import { useOpenDm } from "@/hooks/useOpenDm";
import { useCallStore } from "@/hooks/useCall";

/** Two soft tiles — a handset and a camera — with a little sparkle. */
function CallIllustration() {
  return (
    <svg viewBox="0 0 400 220" className="mx-auto h-52 w-auto" aria-hidden="true">
      <ellipse cx="200" cy="120" rx="150" ry="88" fill="var(--accent)" opacity="0.12" />
      <g transform="rotate(-8 140 110)">
        <rect x="80" y="45" width="130" height="130" rx="34" fill="var(--surface)" stroke="var(--border-strong)" />
        <path
          d="M122 84c4-4 10-3 13 1l8 11c3 4 2 9-1 12l-5 4c4 9 11 17 20 21l4-5c3-3 8-4 12-1l11 8c4 3 5 9 1 13l-6 6c-6 6-16 7-24 3-21-10-37-27-46-48-4-8-2-17 4-23z"
          fill="var(--accent)"
        />
      </g>
      <g transform="rotate(6 260 125)">
        <rect x="195" y="62" width="130" height="130" rx="34" fill="var(--surface)" stroke="var(--border-strong)" />
        <rect x="226" y="106" width="50" height="40" rx="10" fill="var(--accent)" />
        <path d="M280 120l18-11v34l-18-11z" fill="var(--accent)" />
      </g>
      <g stroke="var(--accent)" strokeWidth="6" strokeLinecap="round">
        <path d="M318 22l-4 14" />
        <path d="M342 32l-13 12" />
        <path d="M352 58l-17 3" />
      </g>
    </svg>
  );
}

function StartCallPicker({
  type,
  onClose,
  people,
}: {
  type: "audio" | "video" | null;
  onClose: () => void;
  people: User[];
}) {
  const { openDm } = useOpenDm();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = people.filter(
    (u) => !q || u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
  );

  return (
    <Modal isOpen={type !== null} onClose={onClose} title={type === "video" ? "Start a video call" : "Start a voice call"}>
      <label className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-muted focus-within:ring-2 focus-within:ring-accent/40">
        <Search className="h-5 w-5 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="w-full bg-transparent text-[15px] text-fg placeholder:text-muted focus:outline-none"
        />
      </label>
      <ul className="mt-3 max-h-80 overflow-y-auto">
        {matches.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted">
            {people.length === 0 ? (
              <>
                No contacts yet.{" "}
                <Link href="/contacts" onClick={onClose} className="text-accent">Find people</Link>
              </>
            ) : (
              "No contacts match."
            )}
          </li>
        ) : (
          matches.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => {
                  onClose();
                  openDm(u.id, type!);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-surface-2 transition-colors"
              >
                <Avatar src={u.avatarUrl} name={u.displayName} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-fg truncate">{u.displayName}</span>
                  <span className="block text-sm text-muted truncate">@{u.username}</span>
                </span>
                {type === "video" ? <Video className="h-5 w-5 text-accent" /> : <Phone className="h-5 w-5 text-accent" />}
              </button>
            </li>
          ))
        )}
      </ul>
    </Modal>
  );
}

function CallsHome() {
  const [picker, setPicker] = useState<"audio" | "video" | null>(null);
  const favorites = useFavorites();
  const { openDm } = useOpenDm();
  const { entries } = useCallEntries();
  const callState = useCallStore((s) => s.callState);

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.getContacts(),
  });
  const people = [
    ...new Map(
      (contactsData?.contacts || [])
        .filter((c) => c.status === "accepted" && c.contactUser)
        .map((c) => [c.contactUser!.id, c.contactUser!])
    ).values(),
  ];

  // Starred contacts; until there are any, fall back to who you call most.
  const starred = people.filter((u) => favorites.ids.includes(u.id));
  const frequency = new Map<string, { user: User; n: number }>();
  for (const e of entries) {
    if (!e.peer) continue;
    const f = frequency.get(e.peer.id) || { user: e.peer, n: 0 };
    f.n++;
    frequency.set(e.peer.id, f);
  }
  const frequent = [...frequency.values()].sort((a, b) => b.n - a.n).map((f) => f.user);
  const shortlist = (starred.length ? starred : frequent).slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 select-none">
      <header>
        <h1 className="text-[36px] font-semibold leading-tight text-fg tracking-tight">Calls</h1>
        <p className="text-lg text-muted">Make a call, catch up, or meet face-to-face on Pebble.</p>
      </header>

      <section className="mx-auto mt-4 max-w-xl text-center">
        <CallIllustration />
        <h2 className="mt-2 text-[34px] font-semibold leading-tight text-fg tracking-tight">
          Stay close, wherever you are
        </h2>
        <p className="mt-2 text-lg text-muted leading-relaxed">
          High-quality voice and video calls for quick check-ins, focused work, and everything in between.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setPicker("audio")}
            disabled={callState !== "idle"}
            className="flex items-center justify-center gap-3 rounded-2xl bg-accent py-4 text-lg font-medium text-accent-fg shadow-[0_12px_30px_-14px_var(--accent)] hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <Phone className="h-6 w-6" strokeWidth={1.8} />
            Start a voice call
          </button>
          <button
            onClick={() => setPicker("video")}
            disabled={callState !== "idle"}
            className="flex items-center justify-center gap-3 rounded-2xl bg-surface-2 py-4 text-lg font-medium text-accent hover:bg-surface-3 transition-colors disabled:opacity-50"
          >
            <Video className="h-6 w-6" strokeWidth={1.8} />
            Start a video call
          </button>
        </div>
      </section>

      {shortlist.length > 0 && (
        <section className="mx-auto mt-10 max-w-3xl">
          <div className="flex items-center justify-between">
            <h3 className="text-[22px] font-semibold text-fg">
              {starred.length ? "Favorite contacts" : "Frequent contacts"}
            </h3>
            <Link href="/contacts" className="flex items-center gap-1 text-[15px] text-accent hover:text-accent-hover">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {shortlist.map((u) => (
              <div key={u.id} className="relative rounded-2xl bg-surface-2/60 p-4 text-center">
                {starred.length > 0 && (
                  <Star className="absolute right-4 top-4 h-4 w-4 fill-warning text-warning" />
                )}
                <Avatar src={u.avatarUrl} name={u.displayName} size="xl" className="mx-auto" />
                <p className="mt-2.5 font-semibold text-fg truncate">{u.displayName}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => openDm(u.id, "audio")}
                    disabled={callState !== "idle"}
                    className="flex h-10 w-12 items-center justify-center rounded-xl bg-surface text-accent hover:bg-surface-3 transition-colors disabled:opacity-40"
                    title={`Call ${u.displayName}`}
                  >
                    <Phone className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={() => openDm(u.id, "video")}
                    disabled={callState !== "idle"}
                    className="flex h-10 w-12 items-center justify-center rounded-xl bg-surface text-accent hover:bg-surface-3 transition-colors disabled:opacity-40"
                    title={`Video call ${u.displayName}`}
                  >
                    <Video className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <StartCallPicker type={picker} onClose={() => setPicker(null)} people={people} />
    </div>
  );
}

export default function CallsIndexPage() {
  return (
    <TwoPaneLayout
      sidebar={<CallsSidebar />}
      main={<CallsHome />}
      showMainOnMobile={false}
    />
  );
}

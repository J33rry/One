"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Search,
  UserPlus,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Star,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Video,
  UserMinus,
  ShieldAlert,
  Users,
  Clock,
  Loader2,
} from "lucide-react";
import { contactsApi, Contact } from "@/lib/api/contacts";
import { chatsApi } from "@/lib/api/chats";
import { usersApi, User } from "@/lib/api/users";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { useFavorites } from "@/hooks/useFavorites";
import { useOpenDm } from "@/hooks/useOpenDm";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatLastSeen } from "@/lib/utils/presence";

type ContactFilter = "all" | "online" | "favorite";

const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[15px] font-medium text-accent-fg hover:bg-accent-hover transition-colors disabled:opacity-60";
const softBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-4 py-2 text-[15px] font-medium text-accent hover:bg-surface-3 transition-colors disabled:opacity-60";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { isOnline, getLastSeen } = usePresence();
  const { toast } = useToast();
  const favorites = useFavorites();
  const { openDm } = useOpenDm();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [filter, setFilter] = useState<ContactFilter>("all");
  const [menuId, setMenuId] = useState<string | null>(null);

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.getContacts(),
  });
  const contacts = contactsData?.contacts;

  const { data: blockedData } = useQuery({
    queryKey: ["blocked"],
    queryFn: () => contactsApi.getBlockedUsers(),
  });
  const blockedUsers = blockedData?.blocked;

  // Already loaded by the nav rail; used to suggest people you share chats with.
  const { data: chatsData } = useQuery({
    queryKey: ["chats"],
    queryFn: () => chatsApi.getChats(),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        usersApi
          .search(searchQuery.replace(/^@/, ""))
          .then((results) => setSearchResults(results.users || []))
          .catch(console.error)
          .finally(() => setIsSearching(false));
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => contactsApi.sendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast("Contact request sent!", "success");
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to send contact request", "error");
    },
  });

  const respondRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" }) =>
      contactsApi.respondToRequest(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast(`Contact request ${variables.status}`, "info");
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: (userId: string) => contactsApi.blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["blocked"] });
      toast("User blocked", "info");
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: (userId: string) => contactsApi.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["blocked"] });
      toast("User unblocked", "success");
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactsApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast("Contact removed", "info");
    },
  });

  const incomingRequests =
    contacts?.filter((c) => c.status === "pending" && c.contactId === currentUser?.id) || [];
  const outgoingRequests =
    contacts?.filter((c) => c.status === "pending" && c.userId === currentUser?.id) || [];
  const acceptedContacts = (contacts?.filter((c) => c.status === "accepted") || []).filter(
    (contact, index, self) => {
      if (!contact.contactUser) return false;
      return index === self.findIndex((c) => c.contactUser?.id === contact.contactUser?.id);
    }
  );

  const onlineContacts = acceptedContacts.filter((c) => isOnline(c.contactUser?.id));
  const favoriteContacts = acceptedContacts.filter((c) => favorites.ids.includes(c.contactUser!.id));
  const visibleContacts =
    filter === "online" ? onlineContacts : filter === "favorite" ? favoriteContacts : acceptedContacts;

  // Suggestions: people you share chats with who aren't contacts (or pending,
  // or blocked) yet, ranked by how many chats you have in common.
  const knownIds = new Set<string>([
    currentUser?.id || "",
    ...(contacts || []).flatMap((c) => [c.userId, c.contactId]),
    ...(blockedUsers || []).map((b) => b.blockedUserId),
  ]);
  const shared = new Map<string, { user: User; count: number }>();
  for (const chat of chatsData?.chats || []) {
    for (const p of chat.participants || []) {
      if (!p.user || knownIds.has(p.userId)) continue;
      const entry = shared.get(p.userId) || { user: p.user, count: 0 };
      entry.count++;
      shared.set(p.userId, entry);
    }
  }
  const suggestions = [...shared.values()].sort((a, b) => b.count - a.count);
  const visibleSuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, 5);

  const visibleRequests = showAllRequests ? incomingRequests : incomingRequests.slice(0, 3);

  const relationFor = (userId: string) => {
    if (userId === currentUser?.id) return "self";
    if (blockedUsers?.some((b) => b.blockedUserId === userId)) return "blocked";
    const existing = contacts?.find((c) => c.contactId === userId || c.userId === userId);
    return existing?.status === "accepted" ? "connected" : existing?.status === "pending" ? "pending" : "none";
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg select-none">
      <div className="mx-auto grid max-w-[1400px] gap-6 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-7">
          <header>
            <h1 className="text-[40px] font-semibold leading-tight text-fg tracking-tight">Find people</h1>
            <p className="text-lg text-muted">Connect with your team, collaborators, and others on Pebble.</p>
          </header>

          {/* Username search */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-2xl bg-surface-2 px-5 py-3.5 text-muted focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
              <Search className="h-6 w-6 shrink-0" strokeWidth={1.8} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username (e.g., @jasminepark)"
                className="w-full bg-transparent text-[17px] text-fg placeholder:text-muted focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-1 rounded-lg hover:text-fg" title="Clear search">
                  <X className="h-5 w-5" />
                </button>
              )}
            </label>

            {searchQuery.trim() && (
              <div className="rounded-3xl border border-border bg-surface p-2 shadow-[var(--shadow-md)]">
                {isSearching ? (
                  <div className="space-y-3 p-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="p-5 text-center text-sm text-muted">
                    No users found matching &quot;{searchQuery}&quot;
                  </p>
                ) : (
                  <ul>
                    {searchResults.map((user) => {
                      const relation = relationFor(user.id);
                      return (
                        <li key={user.id} className="flex items-center gap-3.5 rounded-2xl p-3 hover:bg-surface-2/60">
                          <Avatar src={user.avatarUrl} name={user.displayName} size="lg" showPresence isOnline={isOnline(user.id)} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-fg truncate">{user.displayName}</p>
                            <p className="text-sm text-muted truncate">@{user.username}</p>
                          </div>
                          {relation === "self" ? (
                            <span className="text-sm text-muted">You</span>
                          ) : relation === "blocked" ? (
                            <span className="text-sm text-danger">Blocked</span>
                          ) : relation === "connected" ? (
                            <button onClick={() => openDm(user.id)} className={softBtn}>
                              <MessageCircle className="h-4 w-4" /> Message
                            </button>
                          ) : relation === "pending" ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                              <Clock className="h-4 w-4" /> Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => sendRequestMutation.mutate(user.id)}
                              disabled={sendRequestMutation.isPending}
                              className={softBtn}
                            >
                              <UserPlus className="h-4 w-4" /> Connect
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-52 w-full rounded-3xl" />
              <Skeleton className="h-72 w-full rounded-3xl" />
            </div>
          ) : (
            <>
              {/* Incoming requests */}
              {incomingRequests.length > 0 && (
                <section className="rounded-3xl bg-surface-2/60 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="flex items-center gap-2.5 text-[24px] font-semibold text-fg tracking-tight">
                        Contact requests
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-danger px-1.5 text-[13px] font-semibold text-danger-fg">
                          {incomingRequests.length}
                        </span>
                      </h2>
                      <p className="text-muted">People who want to connect with you.</p>
                    </div>
                    {incomingRequests.length > 3 && (
                      <button
                        onClick={() => setShowAllRequests((v) => !v)}
                        className="flex items-center gap-1 text-[15px] text-accent hover:text-accent-hover whitespace-nowrap"
                      >
                        {showAllRequests ? "Show fewer" : "View all requests"}
                        <ChevronRight className={clsx("h-4 w-4 transition-transform", showAllRequests && "rotate-90")} />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {visibleRequests.map((contact) => {
                      const u = contact.contactUser;
                      return (
                        <div key={contact.id} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]">
                          <div className="flex gap-3.5">
                            <Avatar src={u?.avatarUrl} name={u?.displayName} size="xl" className="[&>div]:!w-[72px] [&>div]:!h-[72px]" />
                            <div className="min-w-0">
                              <p className="text-[17px] font-semibold text-fg truncate">{u?.displayName}</p>
                              <p className="text-sm text-muted truncate">@{u?.username}</p>
                              {u?.bio && <p className="mt-1.5 text-sm text-muted line-clamp-2">{u.bio}</p>}
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => respondRequestMutation.mutate({ id: contact.id, status: "accepted" })}
                              disabled={respondRequestMutation.isPending}
                              className={primaryBtn}
                            >
                              <Check className="h-4 w-4" /> Accept
                            </button>
                            <button
                              onClick={() => respondRequestMutation.mutate({ id: contact.id, status: "rejected" })}
                              disabled={respondRequestMutation.isPending}
                              className={clsx(softBtn, "!text-fg")}
                            >
                              <X className="h-4 w-4" /> Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Your contacts */}
              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] font-semibold text-fg tracking-tight">Your contacts</h2>
                    <p className="text-muted">
                      {acceptedContacts.length} contact{acceptedContacts.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div role="tablist" className="flex rounded-2xl bg-surface-2 p-1 text-[15px]">
                    {(
                      [
                        ["all", "All", acceptedContacts.length],
                        ["online", "Online", onlineContacts.length],
                        ["favorite", "Favorite", favoriteContacts.length],
                      ] as const
                    ).map(([value, label, count]) => (
                      <button
                        key={value}
                        role="tab"
                        aria-selected={filter === value}
                        onClick={() => setFilter(value)}
                        className={clsx(
                          "rounded-xl px-4 py-1.5 transition-colors",
                          filter === value ? "bg-surface text-accent shadow-[var(--shadow-sm)]" : "text-muted hover:text-fg"
                        )}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>
                </div>

                {visibleContacts.length === 0 ? (
                  <p className="mt-6 rounded-2xl bg-surface-2/50 p-8 text-center text-muted">
                    {filter === "all"
                      ? "You have no contacts yet. Search above to find people."
                      : filter === "online"
                        ? "None of your contacts are online right now."
                        : "Star a contact to add them to your favorites."}
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {visibleContacts.map((contact) => (
                      <ContactRow
                        key={contact.id}
                        contact={contact}
                        online={isOnline(contact.contactUser?.id)}
                        lastSeen={formatLastSeen(getLastSeen(contact.contactUser!.id) || contact.contactUser!.lastSeenAt)}
                        favorite={favorites.ids.includes(contact.contactUser!.id)}
                        onToggleFavorite={() => favorites.toggle(contact.contactUser!.id)}
                        menuOpen={menuId === contact.id}
                        onMenu={(open) => setMenuId(open ? contact.id : null)}
                        onMessage={() => openDm(contact.contactUser!.id)}
                        onCall={(type) => openDm(contact.contactUser!.id, type)}
                        onRemove={() => deleteContactMutation.mutate(contact.id)}
                        onBlock={() => blockUserMutation.mutate(contact.contactUser!.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* Sent requests */}
              {outgoingRequests.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-fg">Awaiting response</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {outgoingRequests.map((contact) => (
                      <li key={contact.id} className="flex items-center gap-2.5 rounded-2xl bg-surface-2/60 py-1.5 pl-1.5 pr-2">
                        <Avatar src={contact.contactUser?.avatarUrl} name={contact.contactUser?.displayName} size="sm" />
                        <span className="text-sm font-medium text-fg">{contact.contactUser?.displayName}</span>
                        <button
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                          className="rounded-lg p-1 text-muted hover:bg-surface-3 hover:text-fg"
                          title="Cancel request"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Blocked users */}
              {blockedUsers && blockedUsers.length > 0 && (
                <section id="blocked">
                  <h3 className="text-lg font-semibold text-fg">Blocked</h3>
                  <ul className="mt-2 divide-y divide-border">
                    {blockedUsers.map((blocked) => (
                      <li key={blocked.id} className="flex items-center gap-3.5 py-3">
                        <Avatar
                          src={blocked.blockedUser?.avatarUrl}
                          name={blocked.blockedUser?.displayName}
                          size="md"
                          className="opacity-60"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-fg truncate">{blocked.blockedUser?.displayName}</p>
                          <p className="text-sm text-muted truncate">@{blocked.blockedUser?.username}</p>
                        </div>
                        <button onClick={() => unblockUserMutation.mutate(blocked.blockedUserId)} className={softBtn}>
                          Unblock
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {/* Suggestions */}
        <aside className="h-fit rounded-3xl bg-surface p-6 shadow-[var(--shadow-md)] border border-border xl:sticky xl:top-8">
          <h2 className="text-[24px] font-semibold text-fg tracking-tight">Suggested people</h2>
          <p className="text-muted">People you share chats with on Pebble.</p>

          {suggestions.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-surface-2/60 p-5 text-sm text-muted leading-relaxed">
              No suggestions right now. People you meet in group chats will show up here.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {visibleSuggestions.map(({ user, count }) => (
                <li key={user.id} className="flex items-center gap-3.5 py-4">
                  <Avatar src={user.avatarUrl} name={user.displayName} size="xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold text-fg truncate">{user.displayName}</p>
                    <p className="text-sm text-muted truncate">@{user.username}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted whitespace-nowrap">
                      <Users className="h-4 w-4 shrink-0" />
                      {count} shared chat{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    onClick={() => sendRequestMutation.mutate(user.id)}
                    disabled={sendRequestMutation.isPending && sendRequestMutation.variables === user.id}
                    className={clsx(softBtn, "!px-3 !py-1.5")}
                  >
                    {sendRequestMutation.isPending && sendRequestMutation.variables === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Connect
                  </button>
                </li>
              ))}
            </ul>
          )}

          {suggestions.length > 5 && (
            <button
              onClick={() => setShowAllSuggestions((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 py-3 text-[15px] font-medium text-accent hover:bg-surface-3 transition-colors"
            >
              {showAllSuggestions ? "Show fewer" : "Show more suggestions"}
              <ChevronDown className={clsx("h-4 w-4 transition-transform", showAllSuggestions && "rotate-180")} />
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function ContactRow({
  contact,
  online,
  lastSeen,
  favorite,
  onToggleFavorite,
  menuOpen,
  onMenu,
  onMessage,
  onCall,
  onRemove,
  onBlock,
}: {
  contact: Contact;
  online: boolean;
  lastSeen: string;
  favorite: boolean;
  onToggleFavorite: () => void;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onMessage: () => void;
  onCall: (type: "audio" | "video") => void;
  onRemove: () => void;
  onBlock: () => void;
}) {
  const target = contact.contactUser!;
  const menuItem = "w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-surface-2";

  return (
    <li className="flex items-center gap-3 sm:gap-4 py-2.5">
      <button
        onClick={onToggleFavorite}
        className={clsx("p-1.5 rounded-lg transition-colors", favorite ? "text-accent" : "text-muted hover:text-fg")}
        title={favorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorite}
      >
        <Star className={clsx("h-5 w-5", favorite && "fill-current")} />
      </button>

      <Avatar src={target.avatarUrl} name={target.displayName} size="xl" className="[&>div]:!w-14 [&>div]:!h-14" />

      <div className="min-w-0 flex-1 sm:flex-none sm:w-56">
        <p className="flex items-center gap-2 text-[17px] font-semibold text-fg">
          <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", online ? "bg-success" : "bg-faint/60")} />
          <span className="truncate">{target.displayName}</span>
        </p>
        <p className="pl-[18px] text-[15px] text-muted truncate">@{target.username}</p>
      </div>

      <div className="hidden lg:block min-w-0 flex-1">
        {target.bio && <p className="text-[15px] text-fg truncate">{target.bio}</p>}
        <p className="text-sm text-muted truncate">{online ? "Online" : lastSeen}</p>
      </div>

      <button onClick={onMessage} className={clsx(softBtn, "hidden sm:inline-flex")}>
        <MessageCircle className="h-4 w-4" /> Message
      </button>

      <div className="relative">
        <button
          onClick={() => onMenu(!menuOpen)}
          className="p-2 rounded-xl text-fg hover:bg-surface-2 transition-colors"
          title="More"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => onMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-30 w-48 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm text-muted">
              <button onClick={() => { onMenu(false); onMessage(); }} className={clsx(menuItem, "sm:hidden hover:text-fg")}>
                <MessageCircle className="h-4 w-4" /> Message
              </button>
              <button onClick={() => { onMenu(false); onCall("audio"); }} className={clsx(menuItem, "hover:text-fg")}>
                <Phone className="h-4 w-4" /> Voice call
              </button>
              <button onClick={() => { onMenu(false); onCall("video"); }} className={clsx(menuItem, "hover:text-fg")}>
                <Video className="h-4 w-4" /> Video call
              </button>
              <div className="my-1 h-px bg-border" />
              <button onClick={() => { onMenu(false); onRemove(); }} className={clsx(menuItem, "hover:text-danger")}>
                <UserMinus className="h-4 w-4" /> Remove contact
              </button>
              <button onClick={() => { onMenu(false); onBlock(); }} className={clsx(menuItem, "hover:text-danger")}>
                <ShieldAlert className="h-4 w-4" /> Block
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

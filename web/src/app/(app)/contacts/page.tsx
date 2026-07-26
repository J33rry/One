"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "@/lib/api/contacts";
import { usersApi, User } from "@/lib/api/users";
import {
  Search,
  UserPlus,
  UserMinus,
  UserCheck,
  ShieldAlert,
  Clock,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePresence } from "@/hooks/usePresence";
import { useToast } from "@/components/ui/Toast";
import { formatLastSeen } from "@/lib/utils/presence";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { isOnline, getLastSeen } = usePresence();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        usersApi
          .search(searchQuery)
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
    onError: (error: any) => {
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

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-950 select-none">
      {/* User Search Panel */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 border-r border-zinc-800/80 bg-zinc-950/80 flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-zinc-800/80 shrink-0">
          <h2 className="text-xl font-bold text-white tracking-tight">Find People</h2>
        </div>

        <div className="p-4 border-b border-zinc-800/60 shrink-0">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/40">
              {searchResults.map((user) => {
                const isSelf = currentUser?.id === user.id;
                const existingContact = contacts?.find(
                  (c) => c.contactId === user.id || c.userId === user.id
                );
                const isBlocked = blockedUsers?.some((b) => b.blockedUserId === user.id);
                const isUserOnline = isOnline(user.id);

                return (
                  <li
                    key={user.id}
                    className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.avatarUrl}
                        name={user.displayName}
                        size="md"
                        showPresence
                        isOnline={isUserOnline}
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">{user.displayName}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-zinc-500 font-mono">@{user.username}</span>
                          <span className="text-zinc-700">•</span>
                          {isUserOnline ? (
                            <span className="text-emerald-400 font-medium text-[11px]">Online</span>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">
                              {formatLastSeen(getLastSeen(user.id) || (user as any).lastSeenAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelf ? (
                      <Badge variant="zinc">You</Badge>
                    ) : isBlocked ? (
                      <Badge variant="red">Blocked</Badge>
                    ) : existingContact?.status === "accepted" ? (
                      <Badge variant="emerald" className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Connected
                      </Badge>
                    ) : existingContact?.status === "pending" ? (
                      <Badge variant="amber">Pending</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<UserPlus className="w-4 h-4 text-emerald-400" />}
                        isLoading={sendRequestMutation.isPending}
                        onClick={() => sendRequestMutation.mutate(user.id)}
                        title="Add Contact"
                      />
                    )}
                  </li>
                );
              })}
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No users found matching "{searchQuery}"
                </div>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Main Contacts Area */}
      <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto p-6 sm:p-10">
        <div className="max-w-4xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Contacts Directory</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Manage your connections, pending requests, and blocked users.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-60 w-full rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Incoming Requests Section */}
              {incomingRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Pending Contact Requests ({incomingRequests.length})
                    </h3>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-zinc-800/60">
                      {incomingRequests.map((contact) => (
                        <li key={contact.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <Avatar
                              src={contact.contactUser?.avatarUrl}
                              name={contact.contactUser?.displayName}
                              size="md"
                              showPresence
                              isOnline={isOnline(contact.contactUser?.id)}
                            />
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {contact.contactUser?.displayName}
                              </p>
                              <p className="text-xs text-zinc-500 font-mono">
                                @{contact.contactUser?.username}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() =>
                                respondRequestMutation.mutate({
                                  id: contact.id,
                                  status: "accepted",
                                })
                              }
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                respondRequestMutation.mutate({
                                  id: contact.id,
                                  status: "rejected",
                                })
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Outgoing Sent Requests */}
              {outgoingRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                      Sent Requests ({outgoingRequests.length})
                    </h3>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-zinc-800/60">
                      {outgoingRequests.map((contact) => (
                        <li key={contact.id} className="p-4 flex items-center justify-between opacity-80">
                          <div className="flex items-center gap-3.5">
                            <Avatar
                              src={contact.contactUser?.avatarUrl}
                              name={contact.contactUser?.displayName}
                              size="md"
                            />
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {contact.contactUser?.displayName}
                              </p>
                              <p className="text-xs text-zinc-500 font-mono">
                                @{contact.contactUser?.username}
                              </p>
                            </div>
                          </div>
                          <Badge variant="amber">Awaiting response...</Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Accepted Connected Contacts */}
              <Card>
                <CardHeader>
                  <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" /> Connected Contacts ({acceptedContacts.length})
                  </h3>
                </CardHeader>
                <CardContent className="p-0">
                  {acceptedContacts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      You have no contacts yet. Search for users in the sidebar to add them.
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-800/60">
                      {acceptedContacts.map((contact) => {
                        const target = contact.contactUser;
                        if (!target) return null;
                        const targetOnline = isOnline(target.id);

                        return (
                          <li
                            key={contact.id}
                            className="p-4 flex items-center justify-between group hover:bg-zinc-900/40 transition-colors"
                          >
                            <div className="flex items-center gap-3.5">
                              <Avatar
                                src={target.avatarUrl}
                                name={target.displayName}
                                size="md"
                                showPresence
                                isOnline={targetOnline}
                              />
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {target.displayName}
                                </p>
                                <p className="text-xs text-zinc-500 font-mono">
                                  @{target.username}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<UserMinus className="w-4 h-4 text-red-400" />}
                                onClick={() => deleteContactMutation.mutate(contact.id)}
                                title="Remove Contact"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<ShieldAlert className="w-4 h-4 text-red-400" />}
                                onClick={() => blockUserMutation.mutate(contact.contactId)}
                                title="Block User"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Blocked Users Section */}
              {blockedUsers && blockedUsers.length > 0 && (
                <Card className="border-red-900/30">
                  <CardHeader>
                    <h3 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Blocked Users ({blockedUsers.length})
                    </h3>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-zinc-800/60">
                      {blockedUsers.map((blocked) => (
                        <li key={blocked.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3.5 opacity-60">
                            <Avatar
                              src={blocked.blockedUser?.avatarUrl}
                              name={blocked.blockedUser?.displayName}
                              size="md"
                            />
                            <div>
                              <p className="text-sm font-semibold text-white line-through">
                                {blocked.blockedUser?.displayName}
                              </p>
                              <p className="text-xs text-zinc-500 font-mono">
                                @{blocked.blockedUser?.username}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => unblockUserMutation.mutate(blocked.blockedUserId)}
                          >
                            Unblock
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

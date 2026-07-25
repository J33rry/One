"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "@/lib/api/contacts";
import { usersApi, User } from "@/lib/api/users";
import { Loader2, Search, User as UserIcon, UserPlus, UserMinus, UserCheck, ShieldAlert } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.getContacts(),
  });
  const contacts = contactsData?.contacts;

  const { data: blockedData } = useQuery({
    queryKey: ['blocked'],
    queryFn: () => contactsApi.getBlockedUsers(),
  });
  const blockedUsers = blockedData?.blocked;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        setFeedbackMsg("");
        usersApi.search(searchQuery)
          .then(results => setSearchResults(results.users || []))
          .catch(console.error)
          .finally(() => setIsSearching(false));
      } else {
        setSearchResults([]);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // The useEffect will handle the search automatically
  };

  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => contactsApi.sendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setFeedbackMsg("Contact request sent!");
      setTimeout(() => setFeedbackMsg(""), 4000);
    },
    onError: (error: any) => {
      setFeedbackMsg(error.message || "Failed to send contact request");
      setTimeout(() => setFeedbackMsg(""), 4000);
    }
  });

  const respondRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'accepted' | 'rejected' }) => contactsApi.respondToRequest(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  const blockUserMutation = useMutation({
    mutationFn: (userId: string) => contactsApi.blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['blocked'] });
    }
  });

  const unblockUserMutation = useMutation({
    mutationFn: (userId: string) => contactsApi.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['blocked'] });
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactsApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  const incomingRequests = contacts?.filter(c => c.status === 'pending' && c.contactId === currentUser?.id) || [];
  const outgoingRequests = contacts?.filter(c => c.status === 'pending' && c.userId === currentUser?.id) || [];
  const acceptedContacts = (contacts?.filter(c => c.status === 'accepted') || [])
    .filter((contact, index, self) => {
      if (!contact.contactUser) return false;
      return index === self.findIndex((c) => c.contactUser?.id === contact.contactUser?.id);
    });

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Search Sidebar */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-zinc-800 bg-zinc-950/50 flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold text-white">Find People</h2>
        </div>
        
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <button type="submit" className="hidden">Search</button>
          </form>
        </div>

        {feedbackMsg && (
          <div className="mx-4 my-2 p-2.5 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
            {feedbackMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/50">
              {searchResults.map(user => {
                const isSelf = currentUser?.id === user.id;
                const existingContact = contacts?.find(c => c.contactId === user.id || c.userId === user.id);
                const isBlocked = blockedUsers?.some(b => b.blockedUserId === user.id);

                return (
                  <li key={user.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-zinc-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{user.displayName}</p>
                        <p className="text-xs text-zinc-500">@{user.username}</p>
                      </div>
                    </div>

                    {isSelf ? (
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">You</span>
                    ) : isBlocked ? (
                      <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Blocked</span>
                    ) : existingContact?.status === 'accepted' ? (
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Connected
                      </span>
                    ) : existingContact?.status === 'pending' ? (
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Pending</span>
                    ) : (
                      <button 
                        onClick={() => sendRequestMutation.mutate(user.id)}
                        disabled={sendRequestMutation.isPending}
                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-full transition-colors"
                        title="Add Contact"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                );
              })}
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No users found matching "{searchQuery}"
                </div>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Main Content Area: My Contacts & Blocked */}
      <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold text-white mb-8">My Contacts</h1>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl">
            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Contact Requests</h3>
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                  <ul className="divide-y divide-zinc-800">
                    {incomingRequests.map(contact => (
                      <li key={contact.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {contact.contactUser?.avatarUrl ? <img src={contact.contactUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-zinc-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{contact.contactUser?.displayName}</p>
                            <p className="text-xs text-zinc-500">@{contact.contactUser?.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => respondRequestMutation.mutate({ id: contact.id, status: 'accepted' })}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => respondRequestMutation.mutate({ id: contact.id, status: 'rejected' })}
                            className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded text-xs font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Sent Requests</h3>
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                  <ul className="divide-y divide-zinc-800">
                    {outgoingRequests.map(contact => (
                      <li key={contact.id} className="p-4 flex items-center justify-between opacity-70">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {contact.contactUser?.avatarUrl ? <img src={contact.contactUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-zinc-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{contact.contactUser?.displayName}</p>
                            <p className="text-xs text-zinc-500">@{contact.contactUser?.username}</p>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500 italic">Pending...</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Accepted Contacts */}
            <section>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Accepted Contacts</h3>
              {acceptedContacts.length === 0 ? (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-8 text-center text-zinc-400">
                  You have no contacts yet. Search for users in the sidebar to add them.
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                  <ul className="divide-y divide-zinc-800">
                    {acceptedContacts.map(contact => (
                      <li key={contact.id} className="p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {contact.contactUser?.avatarUrl ? <img src={contact.contactUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-zinc-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{contact.contactUser?.displayName}</p>
                            <p className="text-xs text-zinc-500">@{contact.contactUser?.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => deleteContactMutation.mutate(contact.id)}
                            className="p-2 text-zinc-400 hover:text-red-400 rounded"
                            title="Remove Contact"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => blockUserMutation.mutate(contact.contactId)}
                            className="p-2 text-zinc-400 hover:text-red-400 rounded"
                            title="Block User"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Blocked Users */}
            {blockedUsers && blockedUsers.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Blocked Users</h3>
                <div className="bg-zinc-900 rounded-lg border border-red-900/30 overflow-hidden">
                  <ul className="divide-y divide-zinc-800">
                    {blockedUsers.map(blocked => (
                      <li key={blocked.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden opacity-50">
                            {blocked.blockedUser?.avatarUrl ? <img src={blocked.blockedUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-zinc-400" />}
                          </div>
                          <div className="opacity-50">
                            <p className="text-sm font-medium text-white line-through">{blocked.blockedUser?.displayName}</p>
                            <p className="text-xs text-zinc-500">@{blocked.blockedUser?.username}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => unblockUserMutation.mutate(blocked.blockedUserId)}
                          className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded"
                        >
                          Unblock
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

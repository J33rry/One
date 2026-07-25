import { apiClient } from './client';
import { User } from './users';

export interface Contact {
  id: string;
  userId: string;
  contactId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  createdAt: string;
  updatedAt: string;
  // Included by the backend
  contactUser?: User; 
}

export interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  createdAt: string;
  // Included by the backend
  blockedUser?: User;
}

export const contactsApi = {
  // Contacts
  getContacts: () => apiClient<{ contacts: Contact[] }>('/contacts'),
  
  sendRequest: (contactId: string) => apiClient<{ contact: Contact }>('/contacts', {
    method: 'POST',
    body: JSON.stringify({ contactId }),
  }),
  
  respondToRequest: (contactId: string, status: 'accepted' | 'rejected') => apiClient<{ contact: Contact }>(`/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  
  deleteContact: (contactId: string) => apiClient<void>(`/contacts/${contactId}`, {
    method: 'DELETE',
  }),

  // Blocked Users
  getBlockedUsers: () => apiClient<{ blocked: BlockedUser[] }>('/blocked'),

  blockUser: (blockedUserId: string) => apiClient<{ block: BlockedUser }>('/blocked', {
    method: 'POST',
    body: JSON.stringify({ blockedUserId }),
  }),

  unblockUser: (blockedUserId: string) => apiClient<void>(`/blocked/${blockedUserId}`, {
    method: 'DELETE',
  }),
};

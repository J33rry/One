import { apiClient } from './client';
import { User } from './users';

export const authApi = {
  // Registration
  register: (data: Record<string, unknown>) => apiClient<{ user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Login (Password step)
  loginPassword: (data: Record<string, unknown>) => apiClient<{ user: User }>('/auth/login/password', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Login (Google)
  loginGoogle: (idToken: string) => apiClient<{ user: User }>('/auth/login/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  }),

  // Password reset & change
  changePassword: (data: Record<string, unknown>) => apiClient<void>('/auth/password/change', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  forgotPassword: (email: string) => apiClient<void>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  resetPassword: (data: { resetToken: string, newPassword: string }) => apiClient<void>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Logout
  logout: () => apiClient<void>('/auth/logout', {
    method: 'POST',
  }),
};

import type { 
  PublicKeyCredentialCreationOptionsJSON, 
  PublicKeyCredentialRequestOptionsJSON, 
  RegistrationResponseJSON, 
  AuthenticationResponseJSON 
} from '@simplewebauthn/browser';
import { apiClient } from './client';
import { User } from './users';

export interface Passkey {
  id: string;
  userId: string;
  credentialId: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export const authApi = {
  // Registration
  register: (data: any) => apiClient<{ user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Registration passkey options
  getRegisterPasskeyOptions: () => apiClient<{ options: PublicKeyCredentialCreationOptionsJSON }>('/auth/register/passkey/options', {
    method: 'POST',
  }),

  // Registration passkey verify
  verifyRegisterPasskey: (data: RegistrationResponseJSON) => apiClient<{ passkey: Passkey }>('/auth/register/passkey/verify', {
    method: 'POST',
    body: JSON.stringify({ credential: data }),
  }),

  // Login (Password step)
  loginPassword: (data: any) => apiClient<{ mfaToken: string }>('/auth/login/password', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Login (WebAuthn options)
  getLoginWebauthnOptions: (mfaToken: string) => apiClient<{ options: PublicKeyCredentialRequestOptionsJSON, mfaToken: string }>('/auth/login/webauthn/options', {
    method: 'POST',
    mfaToken,
  }),

  // Login (WebAuthn verify)
  verifyLoginWebauthn: (mfaToken: string, credential: AuthenticationResponseJSON) => apiClient<{ user: User }>('/auth/login/webauthn/verify', {
    method: 'POST',
    mfaToken,
    body: JSON.stringify({ credential }),
  }),

  // Passkeys Management
  getPasskeys: () => apiClient<{ passkeys: Passkey[] }>('/auth/passkeys', { method: 'GET' }),
  
  getAddPasskeyOptions: () => apiClient<{ options: PublicKeyCredentialCreationOptionsJSON }>('/auth/passkeys/register/options', {
    method: 'POST'
  }),
  
  verifyAddPasskey: (data: RegistrationResponseJSON) => apiClient<{ passkey: Passkey }>('/auth/passkeys/register/verify', {
    method: 'POST',
    body: JSON.stringify({ credential: data }),
  }),

  renamePasskey: (passkeyId: string, deviceName: string) => apiClient<Passkey>(`/auth/passkeys/${passkeyId}`, {
    method: 'PATCH',
    body: JSON.stringify({ deviceName }),
  }),

  deletePasskey: (passkeyId: string) => apiClient<void>(`/auth/passkeys/${passkeyId}`, {
    method: 'DELETE',
  }),

  // Password reset & change
  changePassword: (data: any) => apiClient<void>('/auth/password/change', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  forgotPassword: (email: string) => apiClient<void>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  getResetPasswordOptions: (resetToken: string) => apiClient<{ options: PublicKeyCredentialRequestOptionsJSON, mfaToken: string }>('/auth/password/reset/webauthn/options', {
    method: 'POST',
    body: JSON.stringify({ resetToken }),
  }),

  verifyResetPassword: (data: { mfaToken: string, credential: AuthenticationResponseJSON, newPassword: string }) => apiClient<void>('/auth/password/reset/webauthn/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Logout
  logout: () => apiClient<void>('/auth/logout', {
    method: 'POST',
  }),
};

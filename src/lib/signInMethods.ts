export type SignInMethodState = {
  passwordDisabled: boolean;
  hasPassword: boolean;
  oauthEnabled: boolean;
  ssoBound: boolean;
  passkeyCount: number;
};

export function remainingSignInMethods(state: SignInMethodState) {
  let count = 0;
  if (!state.passwordDisabled && state.hasPassword) count += 1;
  if (state.oauthEnabled && state.ssoBound) count += 1;
  if (state.passkeyCount > 0) count += 1;
  return count;
}

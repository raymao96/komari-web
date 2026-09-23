const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_STRENGTH = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export function passwordTooShort(password: string) {
  return password.length < PASSWORD_MIN_LENGTH;
}

export function passwordTooWeak(password: string) {
  return !PASSWORD_STRENGTH.test(password);
}

export function passwordsMismatch(password: string, repeat: string) {
  return password !== repeat;
}

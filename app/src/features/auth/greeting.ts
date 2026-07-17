import type { Role, User } from '@/features/auth/types';

const MANILA_OFFSET_HOURS = 8;

type TimeOfDay = 'umaga' | 'tanghali' | 'hapon' | 'gabi';

/** Hour of day at UTC+8, so the greeting matches the clock the API stamps readings with. */
function manilaHour(now: Date): number {
  return Math.floor(now.getTime() / 3_600_000 + MANILA_OFFSET_HOURS) % 24;
}

function timeOfDay(hour: number): TimeOfDay {
  switch (true) {
    case hour < 12:
      return 'umaga';
    case hour < 13:
      return 'tanghali';
    case hour < 18:
      return 'hapon';
    default:
      return 'gabi';
  }
}

function greetingFor(part: TimeOfDay): string {
  switch (part) {
    case 'umaga':
      return 'Magandang Umaga';
    case 'tanghali':
      return 'Magandang Tanghali';
    case 'hapon':
      return 'Magandang Hapon';
    case 'gabi':
      return 'Magandang Gabi';
  }
}

/** Falls back to the email local part so an account with blank names still greets sensibly. */
function displayName(user: User | null): string {
  const full = user?.fullName?.trim();
  if (full) return full;

  const local = user?.email?.split('@')[0];
  return local ? local : 'Guest';
}

function subtitleFor(role: Role | undefined): string {
  switch (role) {
    case 'admin':
      return 'Nasa iyo ang buong kontrol ng 1 KVA transformer.';
    case 'user':
      return 'Narito ang real-time na kalagayan ng 1 KVA transformer.';
    default:
      return 'Nagkokonekta sa 1 KVA transformer.';
  }
}

export function greet(user: User | null, now: Date = new Date()) {
  return {
    greeting: `${greetingFor(timeOfDay(manilaHour(now)))}, ${displayName(user)}`,
    subtitle: subtitleFor(user?.role),
  };
}

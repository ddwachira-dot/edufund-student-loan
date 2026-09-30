// Stored uploads are not served statically any more — they must be fetched through
// ownership-checked endpoints that take the JWT as ?token= (an <img>/<iframe>
// cannot send an Authorization header).

function token() {
  return localStorage.getItem('sl_token') || '';
}

export function avatarUrl(storedName) {
  return storedName ? `/api/avatars/${storedName}?token=${encodeURIComponent(token())}` : null;
}

export function docUrl(storedName) {
  return storedName ? `/api/docs/${storedName}?token=${encodeURIComponent(token())}` : null;
}

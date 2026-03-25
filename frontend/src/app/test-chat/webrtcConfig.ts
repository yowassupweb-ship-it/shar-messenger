const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

function parseCommaSeparated(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

export function getIceServers(): RTCIceServer[] {
  const turnUrls = parseCommaSeparated(process.env.NEXT_PUBLIC_WEBRTC_TURN_URLS);
  const turnUsername = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL;

  if (turnUrls.length === 0) {
    return DEFAULT_ICE_SERVERS;
  }

  return [
    ...DEFAULT_ICE_SERVERS,
    {
      urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
      username: turnUsername,
      credential: turnCredential,
    },
  ];
}
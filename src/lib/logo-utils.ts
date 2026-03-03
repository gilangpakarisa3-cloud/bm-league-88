/**
 * Utility to resolve team or player logos with robust fallbacks.
 * 
 * Priority:
 * 1. Direct URL from database
 * 2. Dynamic unique logo based on teamId/playerName (picsum)
 * 3. Minimalist initial-based placeholder (placehold.co)
 */
export function resolveLogo(logoUrl?: string | null, seedId?: string | null, nameFallback?: string): string {
  // 1. Return direct URL if it exists and is not empty
  if (logoUrl && typeof logoUrl === 'string' && logoUrl.trim() !== '') {
    return logoUrl;
  }
  
  // 2. Generate a stable, unique logo using fastly.picsum.photos
  // We use fastly.picsum.photos as it's specifically allowed in next.config.ts
  const seed = (seedId || nameFallback || 'default').toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  if (seed && seed !== 'tbd' && seed !== '') {
    return `https://fastly.picsum.photos/seed/team-${seed}/128/128`;
  }
  
  // 3. Absolute fallback using initials if all else fails
  const char = nameFallback ? nameFallback.trim().charAt(0).toUpperCase() : 'T';
  const text = encodeURIComponent(char);
  return `https://placehold.co/128x128/0A192F/CCFD01?text=${text}`;
}

/**
 * Returns the base path for Carreira routes based on the current hostname.
 * - On carreiraid.com.br → "" (routes at root)
 * - On atletaid.com.br → "/carreira" (routes under /carreira prefix)
 * - Localhost/preview → "/carreira" (default behavior)
 */

const CARREIRA_DOMAINS = ['carreiraid.com.br', 'www.carreiraid.com.br'];

export function isCarreiraDomain(): boolean {
  return CARREIRA_DOMAINS.includes(window.location.hostname);
}

export function getCarreiraBasePath(): string {
  return isCarreiraDomain() ? '' : '/carreira';
}

/**
 * Builds a carreira route path.
 * Usage: carreiraPath('/cadastro') → '/carreira/cadastro' or '/cadastro'
 * Usage: carreiraPath('/') or carreiraPath('') → '/carreira' or '/'
 */
export function carreiraPath(subPath: string = ''): string {
  const base = getCarreiraBasePath();
  if (!subPath || subPath === '/') return base || '/';
  return `${base}${subPath.startsWith('/') ? subPath : `/${subPath}`}`;
}

/**
 * Hook version for React components
 */
export function useCarreiraBasePath() {
  const base = getCarreiraBasePath();
  return {
    base,
    isCarreiraDomain: isCarreiraDomain(),
    path: carreiraPath,
  };
}

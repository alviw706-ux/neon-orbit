import { useEffect, useState } from 'react';

export type Route = {
  path: string;
  params: URLSearchParams;
};

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, query = ''] = raw.split('?');
  const path = pathPart.replace(/^\/+|\/+$/g, '') || 'home';
  return { path, params: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(to: string) {
  const target = to.startsWith('/') ? to : `/${to}`;
  if (window.location.hash === `#${target}`) return;
  window.location.hash = target;
  window.scrollTo({ top: 0 });
}

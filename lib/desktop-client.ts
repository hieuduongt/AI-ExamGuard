type DesktopWindow = Window & {
  pywebview?: { api?: { open_proctor: (hubUrl: string) => Promise<boolean> } };
};

export async function openProctorWindow(hubUrl: string) {
  const desktop = (window as DesktopWindow).pywebview?.api;
  if (desktop?.open_proctor) return desktop.open_proctor(hubUrl);
  const url = new URL('/giam-thi', window.location.origin);
  if (hubUrl) url.searchParams.set('hub', hubUrl);
  return Boolean(window.open(url.href, 'examguard-proctor'));
}

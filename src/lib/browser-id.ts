const BROWSER_ID_KEY = 'mafia_browser_id';

export function getBrowserId(): string {
  let browserId = localStorage.getItem(BROWSER_ID_KEY);
  
  if (!browserId) {
    browserId = crypto.randomUUID();
    localStorage.setItem(BROWSER_ID_KEY, browserId);
  }
  
  return browserId;
}

export function getNickname(): string | null {
  return localStorage.getItem('mafia_nickname');
}

export function setNickname(nickname: string): void {
  localStorage.setItem('mafia_nickname', nickname);
}

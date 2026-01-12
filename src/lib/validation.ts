/**
 * Input validation utilities for security
 */

export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  if (!nickname || nickname.trim().length < 1) {
    return { valid: false, error: 'Nickname cannot be empty' };
  }
  if (nickname.length > 50) {
    return { valid: false, error: 'Nickname must be 50 characters or less' };
  }
  return { valid: true };
}

export function validateMessage(content: string): { valid: boolean; error?: string } {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 1) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (content.length > 1000) {
    return { valid: false, error: 'Message must be 1000 characters or less' };
  }
  return { valid: true };
}

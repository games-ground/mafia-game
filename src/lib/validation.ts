/**
 * Input validation utilities for security
 */

// Pattern to block control characters and zero-width characters
const CONTROL_CHARS_PATTERN = /[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/;

// Pattern to block common XSS attack vectors (defense in depth)
const XSS_PATTERNS = /<script|<iframe|javascript:|onerror=/i;

export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  const trimmed = nickname.trim();
  
  if (!trimmed || trimmed.length < 1) {
    return { valid: false, error: 'Nickname cannot be empty' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Nickname must be 50 characters or less' };
  }
  
  // Block control characters and zero-width characters
  if (CONTROL_CHARS_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Nickname contains invalid characters' };
  }
  
  // Block common XSS patterns (defense in depth)
  if (XSS_PATTERNS.test(trimmed)) {
    return { valid: false, error: 'Nickname contains disallowed patterns' };
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
  
  // Block control characters (allow newlines and tabs for messages)
  if (/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/.test(content)) {
    return { valid: false, error: 'Message contains invalid characters' };
  }
  
  return { valid: true };
}

export type SensitiveCategory =
  | "credential"
  | "personal_id"
  | "contact"
  | "financial"
  | "infrastructure"
  | "config"
  | "other";

export interface SensitivePattern {
  id: string;
  description: string;
  category: SensitiveCategory;
  example?: string;
  regex: RegExp;
}

// Core catalog of sensitive information patterns.
// All detection happens locally; nothing is sent anywhere.
export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // === Credentials / API keys ===
  {
    id: "openai_api_key",
    description: "OpenAI secret key (sk-...)",
    category: "credential",
    example: "sk-abc123...",
    regex: /sk-[A-Za-z0-9]{20,}/g,
  },
  {
    id: "anthropic_api_key",
    description: "Anthropic / Claude API key (sk-ant-...)",
    category: "credential",
    example: "sk-ant-api03-...",
    regex: /sk-ant-[A-Za-z0-9_-]{20,}/g,
  },
  {
    id: "google_api_key",
    description: "Google-style API key (AIza...)",
    category: "credential",
    example: "AIzaSy...",
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
  },
  {
    id: "aws_access_key_id",
    description: "AWS access key id (AKIA/ASIA...)",
    category: "credential",
    example: "AKIA...",
    regex: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    id: "aws_secret_access_key",
    description: "AWS secret access key",
    category: "credential",
    regex:
      /\b(?:aws_)?secret(?:_access)?_key\s*[:=]\s*['"]?[A-Za-z0-9/+]{20,}['"]?/gi,
  },
  {
    id: "generic_bearer_token",
    description: "Generic bearer / OAuth token",
    category: "credential",
    regex:
      /\b(?:(?:access|id|refresh|bearer)_?token)\s*[:=]\s*['"]?[A-Za-z0-9\-_.]{16,}['"]?/gi,
  },
  {
    id: "token_keyword_followed_by_value",
    description: "Word 'token' / 'key' / 'secret' followed by alphanumeric value",
    category: "credential",
    regex: /\b(?:token|api[_-]?key|secret|auth\s*key)\s*[:=]?\s*['"]?[A-Za-z0-9\-_.]{6,}['"]?\b/gi,
  },
  {
    id: "password_assignment",
    description: "Password/passwd/pwd assignment",
    category: "credential",
    regex:
      /\b(?:password|passwd|pwd)\s*[:=]\s*['"]?[^'"\r\n]{4,}['"]?/gi,
  },
  {
    id: "github_token",
    description: "GitHub personal access token (ghp_...)",
    category: "credential",
    regex: /\bghp_[A-Za-z0-9]{36}\b/g,
  },
  {
    id: "gitlab_token",
    description: "GitLab personal access token (glpat-...)",
    category: "credential",
    regex: /\bglpat-[a-zA-Z0-9\-_]{20,}\b/g,
  },
  {
    id: "stripe_secret_key",
    description: "Stripe secret key (sk_live_... / sk_test_...)",
    category: "credential",
    regex: /\bsk_(?:live|test)_[a-zA-Z0-9]{24,}\b/g,
  },
  {
    id: "stripe_publishable_key",
    description: "Stripe publishable key (pk_live_... / pk_test_...)",
    category: "credential",
    regex: /\bpk_(?:live|test)_[a-zA-Z0-9]{24,}\b/g,
  },
  {
    id: "slack_webhook_url",
    description: "Slack webhook URL (contains secret)",
    category: "credential",
    regex: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9_-]+/g,
  },
  {
    id: "discord_webhook_url",
    description: "Discord webhook URL (contains secret)",
    category: "credential",
    regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+/g,
  },
  {
    id: "database_connection_string",
    description: "DB connection string with embedded user:password",
    category: "credential",
    regex:
      /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:[^@\s]+@[^\s'"]+/gi,
  },
  {
    id: "authorization_header_value",
    description: "Authorization / x-api-key header-style value",
    category: "credential",
    regex:
      /\b(?:authorization|x-api-key|X-Api-Key)\s*[:=]\s*['"]?[A-Za-z0-9\-_.]{20,}['"]?/gi,
  },
  {
    id: "sendgrid_api_key",
    description: "SendGrid API key (SG....)",
    category: "credential",
    regex: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g,
  },
  {
    id: "firebase_server_key",
    description: "Firebase/FCM server key (AAAA...)",
    category: "credential",
    regex: /\bAAAA[a-zA-Z0-9_-]{140,}\b/g,
  },
  {
    id: "twilio_auth_token",
    description: "Twilio-style auth token (32 hex)",
    category: "credential",
    regex: /\b(?:twilio[_-]?auth[_-]?token|TWILIO_AUTH_TOKEN)\s*[:=]\s*['"]?[a-fA-F0-9]{32}['"]?/gi,
  },
  {
    id: "jwt_token",
    description: "JWT token (header.payload.signature)",
    category: "credential",
    regex: /\beyJ[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\b/g,
  },
  {
    id: "private_key_block",
    description: "PEM private key block",
    category: "credential",
    regex:
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },

  // === Config / env-style secrets ===
  {
    id: "env_secret_like",
    description:
      "ENV-style secret (API_KEY, SECRET, PASSWORD, TOKEN, etc.) in assignments",
    category: "config",
    regex:
      /\b[A-Z0-9_]*(?:SECRET|PASSWORD|PASS|API_KEY|TOKEN|ACCESS_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*[:=]\s*['"][^'"\r\n]{4,}['"]/g,
  },

  // === Personal IDs & contact ===
  {
    id: "email_address",
    description: "Email address",
    category: "contact",
    example: "user@example.com",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    id: "phone_number_intl",
    description: "Phone number (international-ish)",
    category: "contact",
    example: "+65 9123 4567",
    regex:
      /\+?[0-9]{1,3}[\s-]?(?:\(?[0-9]{1,4}\)?[\s-]?)?[0-9]{3,4}[\s-]?[0-9]{3,4}\b/g,
  },
  {
    id: "national_id_generic",
    description:
      "Generic national ID / CMND / citizen ID (9-12 digits near ID keywords)",
    category: "personal_id",
    example: "CMND: 123456789",
    regex:
      /\b(?:cmnd|citizen\s*id|id\s*card|identity\s*no\.?|ssn)\b[^0-9]{0,10}([0-9]{9,12})/gi,
  },
  {
    id: "cccd_vietnam",
    description: "Vietnamese CCCD (12 digits, with or without keyword)",
    category: "personal_id",
    regex:
      /\b(?:cccd|can\s*cuoc|cccd)\s*[:.]?\s*[0-9]{12}\b|\b[0-9]{12}\s*(?:\(cccd\)|\(can cuoc\))/gi,
  },
  {
    id: "passport_number",
    description: "Passport number (keyword + alphanumeric)",
    category: "personal_id",
    regex: /\b(?:passport|so\s*hieu|number)\s*[:=]?\s*[A-Z0-9]{6,12}\b/gi,
  },
  {
    id: "otp_pin_code",
    description: "OTP / PIN / verification code (digits near keyword)",
    category: "credential",
    regex:
      /\b(?:otp|pin|ma\s*xac\s*nhan|verification\s*code|code)\s*[:=]?\s*[0-9]{4,8}\b/gi,
  },

  // === Financial data ===
  {
    id: "credit_card_number",
    description: "Credit/debit card number (13-19 digits with spaces/dashes)",
    category: "financial",
    regex:
      /\b(?:[0-9]{4}[- ]?){3}[0-9]{4}\b|\b[0-9]{13,19}\b/g,
  },
  {
    id: "iban_like",
    description: "IBAN-like bank account number",
    category: "financial",
    regex: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b/g,
  },
  {
    id: "bank_account_with_label",
    description: "Bank account number near bank keywords",
    category: "financial",
    regex:
      /\b(?:account\s*(?:no\.?|number)?|acct\.?|stk|so\s*tai\s*khoan)\b[^0-9]{0,10}([0-9]{6,20})/gi,
  },

  // === Infrastructure / network ===
  {
    id: "ipv4_address",
    description: "IPv4 address (may be sensitive in context)",
    category: "infrastructure",
    regex:
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  },
  {
    id: "url_with_token_param",
    description: "URL query param containing token/secret",
    category: "infrastructure",
    regex:
      /https?:\/\/[^\s]+?(?:token|access_token|api_key|auth)=[^\s&#]+/gi,
  },
  {
    id: "url_with_embedded_password",
    description: "URL with user:password@ (e.g. Redis, DB)",
    category: "infrastructure",
    regex: /[a-z][a-z0-9+.-]*:\/\/[^:\s]+:[^@\s]+@[^\s'"]+/gi,
  },

  // === Fallback generic secrets ===
  {
    id: "standalone_numeric_token",
    description: "Token/secret keyword followed by numeric value only",
    category: "credential",
    regex: /\b(?:token|secret|key|ma)\s+[0-9]{6,20}\b/gi,
  },
  {
    id: "hex_secret_long",
    description: "Long hex string (possible secret)",
    category: "credential",
    regex: /\b[0-9a-fA-F]{32,}\b/g,
  },
  {
    id: "base64_secret_long",
    description: "Long base64-like string (possible secret)",
    category: "credential",
    regex: /\b[A-Za-z0-9+/=]{40,}\b/g,
  },
];


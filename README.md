# prompt-guard

Local-only library for **sanitizing sensitive text** before it rời khỏi máy (HTTP request, log, AI call, v.v.), và (tùy trường hợp) khôi phục lại sau đó.

- **Input:** raw text (prompt, context, logs).
- **Output:**
  - `safeText`: sensitive data replaced by placeholders like `<SPG_EMAIL_ADDRESS_1>`.
  - `mappings`: list of `{ placeholder, value, patternId }` kept **only in memory** on the client.
- **Usage:**
  - Send **only** `safeText` to remote AI.
  - On response, run `desanitizeText(response, mappings)` to map placeholders back to originals.

It is intended to be used in three main ways:

- **As a library** inside your own code (backend, CLI, VS Code/Cursor extension, etc.)
- **As a Node wrapper (`guard`)** around your existing Node app (no code changes, just run through guard).
- **As a local HTTP proxy (`guard-proxy`)** that any client (web, mobile, desktop, tool) can call.

> ⚠️ **Important:** `prompt-guard` does **not** magically hook into closed‑source tools (Cursor, Antigravity, IDEs, etc.) unless:
> - They let you configure a **custom base URL / HTTP proxy**, and you point that to `guard-proxy`, or
> - They provide a **plugin/extension API** where you can call `sanitizeText` yourself.
>  
> It guards **all traffic you deliberately route through it**, but it cannot attach itself to processes you don’t control.

## Basic usage

```ts
import { sanitizeText, desanitizeText } from "prompt-guard";

const input = `Login with email chuong@example.com and token sk-abc123...`;

const { safeText, mappings } = sanitizeText(input);
// → safeText: "Login with email <SPG_EMAIL_ADDRESS_1> and token <SPG_OPENAI_API_KEY_1>"
// → mappings: [{ placeholder: "<SPG_EMAIL_ADDRESS_1>", value: "chuong@example.com", patternId: "email_address" }, ...]

// Gửi safeText ra ngoài (HTTP, AI, log, v.v.)

const aiResponse = "I will not store <SPG_EMAIL_ADDRESS_1> or <SPG_OPENAI_API_KEY_1>.";
const restored = desanitizeText(aiResponse, mappings);
// → "I will not store chuong@example.com or sk-abc123..."
```

## What is considered sensitive?

The library ships with a catalog of **sensitive patterns**, grouped by category. All matching is done via regex locally.

### 1. Credentials / API keys (`credential`)

- **OpenAI API key**
  - `id`: `openai_api_key`
  - Pattern: `sk-[A-Za-z0-9]{20,}`
- **Anthropic / Claude API key**
  - `id`: `anthropic_api_key`
  - Pattern: `sk-ant-[A-Za-z0-9_-]{20,}`
- **Google-style API key**
  - `id`: `google_api_key`
  - Pattern: `AIza[0-9A-Za-z-_]{35}`
- **AWS access key id**
  - `id`: `aws_access_key_id`
  - Pattern: `\\b(AKIA|ASIA)[A-Z0-9]{16}\\b`
- **AWS secret access key**
  - `id`: `aws_secret_access_key`
  - ENV-style assignment like `AWS_SECRET_ACCESS_KEY=...`
- **Generic bearer / OAuth tokens**
  - `id`: `generic_bearer_token`
  - Keys like `access_token=...`, `bearer_token=...` in code or JSON.
- **JWT tokens**
  - `id`: `jwt_token`
  - `header.payload.signature` starting with `eyJ...`
- **Private key blocks**
  - `id`: `private_key_block`
  - PEM blocks: `-----BEGIN ... PRIVATE KEY----- ... -----END ... PRIVATE KEY-----`.
- **Token/key/secret keyword + value**
  - `id`: `token_keyword_followed_by_value`
  - e.g. `token 123456789`, `api_key=xxx`, `secret: abc123`.
- **Password assignment**
  - `id`: `password_assignment`
  - `password=...`, `pwd: ...`.
- **GitHub token** (`ghp_...`), **GitLab token** (`glpat-...`).
- **Stripe keys** (`sk_live_...`, `pk_test_...`).
- **Slack webhook URL**, **Discord webhook URL**.
- **Database connection string** (postgres/mysql/mongodb with `user:password@`).
- **Authorization / x-api-key** header-style value.
- **SendGrid** (`SG.xxx`), **Firebase/FCM** (`AAAA...`), **Twilio auth token**.
- **OTP/PIN/verification code** (digits near keyword).
- **Standalone numeric token** (`token 123456789`, `secret 987654`).

### 2. Config / env-style secrets (`config`)

- **ENV-style assignments containing secrets**
  - `id`: `env_secret_like`
  - Keys containing `SECRET`, `PASSWORD`, `PASS`, `API_KEY`, `TOKEN`, `ACCESS_KEY`, `PRIVATE_KEY`, e.g.:
    - `API_KEY="..."`
    - `MY_APP_SECRET=...`
    - `DB_PASSWORD="..."`

### 3. Personal identifiers (`personal_id`, `contact`)

- **Email addresses**
  - `id`: `email_address`
  - Standard `local@domain.tld`.
- **Phone numbers (international-ish)**
  - `id`: `phone_number_intl`
  - E.g. `+65 9123 4567`, `090-123-4567`.
- **National ID / CMND / citizen ID / ID card / SSN (generic)**
  - `id`: `national_id_generic`
  - 9–12 digits near keywords:
    - `cmnd`, `citizen id`, `id card`, `identity no.`, `ssn`.
- **Vietnamese CCCD** (12 digits, keyword cccd/can cuoc).
- **Passport number** (keyword + alphanumeric).

### 4. Financial data (`financial`)

- **Credit / debit card numbers**
  - `id`: `credit_card_number`
  - 13–19 digits, with or without spaces/dashes.
- **IBAN-like bank accounts**
  - `id`: `iban_like`
  - `CCdd...` format (2 letters country, 2 digits, followed by alphanumerics).
- **Bank account with label**
  - `id`: `bank_account_with_label`
  - Numbers near keywords like `account no`, `acct`, `stk`, `so tai khoan`.

### 5. Infrastructure / network (`infrastructure`)

- **IPv4 addresses**
  - `id`: `ipv4_address`
  - E.g. `192.168.1.10`, `10.0.0.5`.
- **URLs containing tokens/secrets in query string**
  - `id`: `url_with_token_param`
  - Any `https://...?(token|access_token|api_key|auth)=...`.
- **URL with embedded password** (`scheme://user:password@host`).

### 6. Generic long secrets (`credential`)

- **Long hex strings**
  - `id`: `hex_secret_long`
  - 32+ hex chars (often keys/hashes).
- **Long base64-like strings**
  - `id`: `base64_secret_long`
  - 40+ chars in base64 alphabet.

> This catalog is intentionally broad to catch most secrets, so it may over-match benign data. In an integration you can choose which `patternId`s to enable or filter.

## API

```ts
import {
  sanitizeText,
  desanitizeText,
  SENSITIVE_PATTERNS,
  type SanitizeResult,
  type SanitizedChunk,
} from "prompt-guard";
```

- `sanitizeText(text, options?)` → `{ safeText, mappings }`
  - `placeholderPrefix` (default: `"SPG"`): custom prefix for placeholders.
- `desanitizeText(text, mappings)` → `string`
  - Replace placeholders back to original values using mappings.
- `SENSITIVE_PATTERNS`
  - Exported catalog for inspection or custom filtering.

## CLI: `guard` – chạy app đã được guard

Sau khi cài:

```bash
npm install prompt-guard --save-dev
```

Trong project của anh, đảm bảo `package.json` có 1 trong 2 script:

```jsonc
{
  "scripts": {
    "dev": "node index.js"
    // hoặc
    // "start": "node index.js"
  }
}
```

Bây giờ anh có thể chạy app qua lớp guard:

```bash
npx guard
```

Hành vi:

- `guard` sẽ:
  - Tìm script `dev` (ưu tiên) hoặc `start` trong `package.json`.
  - Chạy nó qua Node với `NODE_OPTIONS=-r prompt-guard/dist/register.js`.
  - Module `register` sẽ patch `global.fetch`:
    - Nếu `fetch` được gọi với `body` dạng string → nội dung body được `sanitizeText` trước khi gửi ra ngoài.
- Code của anh **không cần thay đổi**; chỉ cần dùng `fetch` như bình thường.

Ví dụ:

```ts
// code app của anh
const resp = await fetch("https://api.example.com/log", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Token của anh là 123456789" }),
});
```

Khi chạy bằng:

```bash
npx guard
```

thì body thật gửi ra sẽ giống kiểu:

```json
{ "message": "Token của anh là <SPG_STANDALONE_NUMERIC_TOKEN_1>" }
```

→ Server bên ngoài **không bao giờ thấy số thật**, mà chỉ thấy placeholder.

## Local HTTP proxy: `guard-proxy` (cho mọi platform)

Nếu anh muốn một HTTP proxy mà **mọi client** (web, mobile, desktop, backend) có thể gọi tới:

1. Cài:

```bash
npm install -g prompt-guard   # hoặc dùng npx: npx guard-proxy
```

2. Chạy proxy:

```bash
guard-proxy
# hoặc
npx guard-proxy
```

Mặc định proxy lắng nghe tại: `http://127.0.0.1:8787`.

3. Từ bất kỳ app nào (web, mobile, backend), gửi request tới proxy, kèm header:

- `x-guard-target`: URL thật của API anh muốn gọi (ví dụ: `https://api.example.com/path`).

Ví dụ (pseudo code, mọi ngôn ngữ đều tương tự):

```ts
// Gửi tới proxy
await fetch("http://127.0.0.1:8787", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-guard-target": "https://api.example.com/log"
  },
  body: JSON.stringify({
    message: "Token của anh là 123456789",
    db: "postgres://user:pass@host/db"
  })
});
```

Hành vi:

- Proxy sẽ:
  - Đọc body request.
  - Chạy `sanitizeText` để mask token/secret/ID/... rồi forward tới `x-guard-target`.
  - Nhận response từ upstream, chạy `desanitizeText` trước khi trả lại cho client.
- Kết quả:
  - **Upstream API** chỉ thấy body đã mask (placeholders).
  - **Client (app của anh)** thấy response đã được khôi phục (nếu upstream echo placeholders về).

Với cách này:

- Bất kỳ project nào (web, mobile, backend, CLI) chỉ cần:
  - Đổi base URL sang `http://127.0.0.1:8787`.
  - Thêm header `x-guard-target` là URL thật.
- Không phụ thuộc vào runtime (Node/Flutter/Swift/Kotlin, v.v.) miễn là gọi được HTTP tới proxy.


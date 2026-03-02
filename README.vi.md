# prompt-guard (Tiếng Việt)

`prompt-guard` là thư viện/local middleware giúp **lọc và ẩn danh dữ liệu nhạy cảm** trước khi nó rời khỏi máy của bạn (HTTP request, log, AI call, v.v.), và (khi cần) khôi phục lại sau đó.

- **Input:** text gốc (prompt, context, logs, payload HTTP, v.v.).
- **Output:**
  - `safeText`: text đã được thay thế các dữ liệu nhạy cảm bằng placeholder như `<SPG_EMAIL_ADDRESS_1>`.
  - `mappings`: danh sách `{ placeholder, value, patternId }` chỉ được giữ **trong bộ nhớ local** trên máy.
- **Cách dùng chung:**
  - Khi gửi ra ngoài → chỉ gửi `safeText`.
  - Khi nhận response (và nếu cần) → dùng `desanitizeText(response, mappings)` để map placeholder về giá trị gốc.

Thư viện được thiết kế để dùng theo 3 cách chính:

- **Dùng trực tiếp trong code** (backend, CLI, VS Code/Cursor extension, v.v.).
- **Dùng như một lớp bọc Node (`guard`)** quanh app Node hiện tại (không cần sửa code, chỉ đổi command chạy).
- **Dùng như một HTTP proxy local (`guard-proxy`)** mà bất kỳ client nào (web, mobile, desktop, tool) có thể gọi tới.

> ⚠️ **Lưu ý:** `prompt-guard` **không tự động nhảy vào** các tool đóng (Cursor, Antigravity, IDE, v.v.) trừ khi:
> - Chúng cho phép cấu hình **base URL / HTTP proxy** và bạn trỏ nó về `guard-proxy`, hoặc
> - Chúng có **plugin/extension API** để bạn chủ động gọi `sanitizeText` trong pipeline.
>
> Nó chỉ guard **traffic mà bạn cố ý route qua nó**, chứ không thể hook vào process mà bạn không control.

---

## Dùng như thư viện

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

---

## Dữ liệu nào được coi là nhạy cảm?

Thư viện đi kèm một danh mục pattern nhạy cảm, chia theo nhóm. Toàn bộ matching diễn ra bằng regex **local**, không gửi đâu cả.

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
  - Gán ENV kiểu `AWS_SECRET_ACCESS_KEY=...`
- **Generic bearer / OAuth tokens**
  - `id`: `generic_bearer_token`
  - Key như `access_token=...`, `bearer_token=...` trong code/JSON.
- **JWT tokens**
  - `id`: `jwt_token`
  - Dạng `header.payload.signature` bắt đầu bằng `eyJ...`
- **Private key blocks**
  - `id`: `private_key_block`
  - Khối PEM: `-----BEGIN ... PRIVATE KEY----- ... -----END ... PRIVATE KEY-----`.
- **Token/key/secret keyword + value**
  - `id`: `token_keyword_followed_by_value`
  - Ví dụ: `token 123456789`, `api_key=xxx`, `secret: abc123`.
- **Password assignment**
  - `id`: `password_assignment`
  - `password=...`, `pwd: ...`.
- **GitHub token** (`ghp_...`), **GitLab token** (`glpat-...`).
- **Stripe keys** (`sk_live_...`, `pk_test_...`).
- **Slack webhook URL**, **Discord webhook URL**.
- **Database connection string** (postgres/mysql/mongodb với `user:password@`).
- **Authorization / x-api-key** header-style value.
- **SendGrid** (`SG.xxx`), **Firebase/FCM** (`AAAA...`), **Twilio auth token**.
- **OTP/PIN/verification code** (số gần từ khóa).
- **Standalone numeric token** (`token 123456789`, `secret 987654`).

### 2. Config / env-style secrets (`config`)

- Gán ENV chứa secrets
  - `id`: `env_secret_like`
  - Key chứa `SECRET`, `PASSWORD`, `PASS`, `API_KEY`, `TOKEN`, `ACCESS_KEY`, `PRIVATE_KEY`, ví dụ:
    - `API_KEY="..."`
    - `MY_APP_SECRET=...`
    - `DB_PASSWORD="..."`

### 3. Personal identifiers (`personal_id`, `contact`)

- **Email addresses**
  - `id`: `email_address`
  - Dạng chuẩn `local@domain.tld`.
- **Số điện thoại (quốc tế tương đối)**
  - `id`: `phone_number_intl`
  - Ví dụ: `+65 9123 4567`, `090-123-4567`.
- **National ID / CMND / citizen ID / ID card / SSN (generic)**
  - `id`: `national_id_generic`
  - 9–12 chữ số xuất hiện gần từ khóa:
    - `cmnd`, `citizen id`, `id card`, `identity no.`, `ssn`.
- **CCCD Việt Nam** (12 số, có keyword cccd/căn cước).
- **Passport number** (keyword + alphanumeric).

### 4. Financial data (`financial`)

- **Số thẻ credit/debit**
  - `id`: `credit_card_number`
  - 13–19 chữ số, có/không có dấu cách/gạch.
- **IBAN-like bank accounts**
  - `id`: `iban_like`
  - Dạng `CCdd...` (2 ký tự country, 2 số, theo sau là alphanumerics).
- **Số tài khoản gần keyword**
  - `id`: `bank_account_with_label`
  - Gần các từ như `account no`, `acct`, `stk`, `so tai khoan`.

### 5. Infrastructure / network (`infrastructure`)

- **IPv4 addresses**
  - `id`: `ipv4_address`
  - Ví dụ: `192.168.1.10`, `10.0.0.5`.
- **URLs chứa token/secrets trong query string**
  - `id`: `url_with_token_param`
  - Bất kỳ `https://...?(token|access_token|api_key|auth)=...`.
- **URL có user:password@** (`scheme://user:password@host`).

### 6. Generic long secrets (`credential`)

- **Chuỗi hex dài**
  - `id`: `hex_secret_long`
  - 32+ ký tự hex (thường là key/hash).
- **Chuỗi base64-like dài**
  - `id`: `base64_secret_long`
  - ≥40 ký tự alphabet base64.

> Danh mục này cố tình bao phủ rộng để bắt được đa số secret, nên đôi khi có thể match nhầm dữ liệu vô hại. Trong integration của bạn, có thể chọn lọc theo `patternId` hoặc filter thêm nếu cần.

---

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
  - `placeholderPrefix` (mặc định `"SPG"`): prefix cho placeholder.
- `desanitizeText(text, mappings)` → `string`
  - Thay placeholder về lại giá trị gốc.
- `SENSITIVE_PATTERNS`
  - Danh mục pattern nếu bạn muốn inspect hoặc custom filter.

---

## CLI: `guard` – chạy app Node đã được guard

Sau khi cài trong project Node:

```bash
npm install prompt-guard --save-dev
```

Đảm bảo `package.json` của app có 1 trong 2 script:

```jsonc
{
  "scripts": {
    "dev": "node index.js"
    // hoặc
    // "start": "node index.js"
  }
}
```

Chạy app qua lớp guard:

```bash
npx guard
```

Hành vi:

- `guard` sẽ:
  - Tìm script `dev` (ưu tiên) hoặc `start` trong `package.json`.
  - Chạy nó với `NODE_OPTIONS=-r prompt-guard/dist/register.js`.
  - Module `register` patch `global.fetch`:
    - Nếu `fetch` được gọi với `body` dạng string → nội dung sẽ được `sanitizeText` trước khi gửi ra ngoài.
- Code app **không cần sửa**; chỉ cần dùng `fetch` như bình thường, miễn là anh chạy bằng `npx guard` thay vì `npm run dev` trực tiếp.

Ví dụ:

```ts
// code app
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

body thực gửi ra sẽ giống kiểu:

```json
{ "message": "Token của anh là <SPG_STANDALONE_NUMERIC_TOKEN_1>" }
```

→ Server bên ngoài **không bao giờ thấy số thật**, chỉ thấy placeholder.

---

## HTTP proxy local: `guard-proxy` (cho mọi platform)

Nếu bạn muốn một HTTP proxy mà **mọi client** (web, mobile, desktop, backend) có thể gọi tới:

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

- `x-guard-target`: URL thật của API bạn muốn gọi (ví dụ: `https://api.example.com/path`).

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
  - Nhận response từ upstream, chạy `desanitizeText` (nếu có placeholder) trước khi trả lại cho client.
- Kết quả:
  - **Upstream API** chỉ thấy body đã mask (placeholders).
  - **Client (app của bạn)** thấy response đã được khôi phục (nếu upstream echo placeholders về).

Với cách này:

- Bất kỳ project nào (web, mobile, backend, CLI) chỉ cần:
  - Đổi base URL sang `http://127.0.0.1:8787`.
  - Thêm header `x-guard-target` là URL thật.
- Không phụ thuộc vào runtime (Node/Flutter/Swift/Kotlin, v.v.) miễn là gọi được HTTP tới proxy.


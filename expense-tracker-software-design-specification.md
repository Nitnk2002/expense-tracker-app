# Expense Tracker Platform — Software Design Specification

**Prepared for:** UI generation handoff (Gemini / Figma AI) and engineering roadmap
**System under review:** 4 repositories — `expense-services`, `ds-services`, `Auth-Services`, `expense-tracker-app`
**Document type:** Architecture Analysis + Software Design Specification (AS-IS + TO-BE)
**Method:** Full source-tree read of every file in all four repositories (no assumptions, no fabricated modules)

> **Reading note on methodology.** This document draws a hard line between what the code **actually does today (AS-IS)** and what a mature product **should do (TO-BE)**. The codebase is an early-stage / prototype system — three lightweight Spring Boot services and one React Native shell app. Sections that request features not present in the code (Categories, Income, Reports, Budgets, Notifications, etc.) are clearly labeled as **recommended additions**, not documented as existing behavior. This is what lets Gemini/Figma AI generate a UI that is both grounded in the real API surface and forward-compatible with the target product vision.

---

## 1. Executive Summary

### 1.1 What this system is
The Expense Tracker Platform is a **polyglot microservice system** that captures a user's spending — either through manual entry (planned) or automatically from bank SMS notifications (already partially built) — and surfaces it back to the user through a mobile app. It consists of:

| Repository | Real role (from code) | Stack |
|---|---|---|
| `Auth-Services` | Identity provider: signup, login, JWT issuance, refresh tokens, role storage | Java 21, Spring Boot 3, Spring Security, JJWT, MySQL |
| `expense-services` | System of record for expense line items; Kafka consumer + minimal read API | Java 21, Spring Boot 3, Spring Kafka, Spring Data JPA, MySQL |
| `ds-services` | **Not** a service-discovery/Eureka server. It is a Python **Data Science / NLP microservice** that classifies bank SMS text and uses an LLM (Mistral, with OpenAI fallback) to extract structured expense data, then publishes it to Kafka | Python 3.11, Flask, LangChain, kafka-python |
| `expense-tracker-app` | Cross-platform mobile client (Android + iOS via one codebase) | React Native 0.81, TypeScript, React Navigation, Gluestack UI, AsyncStorage |

> **Naming correction for the record:** the repository named "Discovery Service" (`ds-services`) contains no Eureka server, no service registry, and no `spring-cloud-netflix-eureka` dependency. Its `setup.py`/`requirements.txt` show it is an SMS-parsing / LLM-extraction service (`dsService` = "Data Science Service"). There is currently **no service registry, no API Gateway, and no config server** anywhere in the four repositories. This is documented as a gap in Section 2.4 and a recommendation in Section 24.

### 1.2 Purpose
Give users a low-friction way to know where their money goes, by combining:
1. **Passive capture** — parsing transactional SMS from banks so the user never has to manually log every purchase.
2. **Active capture** — manual expense entry (UI planned, backend endpoint not yet built).
3. **A single mobile surface** — login, dashboard, and (in the target state) reports/insights.

### 1.3 Business problem
Manual expense trackers fail because of data-entry fatigue: users stop logging within days. The architectural bet here is that **SMS-based passive ingestion + LLM extraction** removes that fatigue. The system is deliberately event-driven (Kafka) so the ingestion pipeline (DS service) and the system-of-record (Expense service) are decoupled and independently scalable.

### 1.4 Target users
- **Primary:** individuals in markets with high SMS-based bank transaction alerts (the extraction prompt and regex keywords — "spent", "bank", "card" — imply an Indian/South-Asian banking SMS pattern, consistent with `INR` being the default currency in `ExpenseService.setCurrency()`).
- **Secondary (future):** small business owners tracking card spend, households wanting shared budget visibility.

### 1.5 Expected workflow (current code path, end to end)
1. User signs up / logs in via `Auth-Services` → receives `accessToken` (1-minute lived JWT, see Section 6) + `refreshToken`.
2. A bank SMS is captured on-device (mobile-side listener not yet implemented in the repo) and forwarded to `ds-services` at `POST /v1/ds/message`.
3. `ds-services` checks if the message is bank-related (`MessagesUtil.isBankSms`), and if so runs it through `LLMService` (Mistral → OpenAI fallback) to extract `amount`, `merchant`, `currency` into a structured `Expense` object.
4. `ds-services` publishes the serialized object to the Kafka topic `expense_service`.
5. `expense-services`' `ExpenseConsumer` listens on that same topic, deserializes into `ExpenseDto`, and calls `ExpenseService.createExpense()`, persisting a row to the `expenses` table in MySQL.
6. The mobile app can later call `GET /expense/v1/` to retrieve the user's expenses (query parameter `userId`).
7. User views expenses on the `Home` screen (currently rendered from **mock/hardcoded data**, not yet wired to the real API — see Section 8).

### 1.6 Goals of this document
Produce a specification detailed enough that an AI UI generator can build pixel-accurate, production-grade screens that (a) match the real REST contracts so the frontend never has to guess field names, and (b) anticipate the near-term roadmap (categories, budgets, charts) so the design system doesn't need to be reworked in three months.

---

## 2. Complete System Architecture

### 2.1 Component diagram (AS-IS)

```
┌─────────────────────────┐
│   expense-tracker-app    │  React Native (Android/iOS)
│  Login / SignUp / Home   │
└────────────┬─────────────┘
             │ REST (JSON over HTTPS/HTTP)
             │ Bearer <JWT>
             ▼
┌─────────────────────────┐        ┌──────────────────────────┐
│      Auth-Services        │       │       ds-services          │
│  :9898  Spring Boot       │       │  :8010  Flask/LangChain    │
│  /auth/v1/signup           │       │  POST /v1/ds/message       │
│  /auth/v1/login            │       │  (SMS -> LLM -> Expense)   │
│  /auth/v1/refreshToken     │       └─────────────┬──────────────┘
│  MySQL: authservice DB     │                     │ publishes JSON
└─────────────────────────┘                     ▼
                                     ┌──────────────────────────┐
                                     │   Kafka topic:            │
                                     │   "expense_service"       │
                                     └─────────────┬──────────────┘
                                                    │ consumes
                                                    ▼
                                     ┌──────────────────────────┐
                                     │    expense-services        │
                                     │  :9820  Spring Boot        │
                                     │  Kafka consumer            │
                                     │  GET /expense/v1/          │
                                     │  MySQL: expenseservice DB  │
                                     └──────────────────────────┘
```

**Key architectural observation:** `Auth-Services` is a synchronous REST dependency for the mobile app, while `ds-services` → Kafka → `expense-services` is a fully asynchronous, event-driven pipeline. These are two structurally different integration styles living in the same system — intentional for the ingestion path (durability, backpressure handling of SMS bursts) but currently **not connected to the auth layer at all**: neither `expense-services` nor `ds-services` validates a JWT. There is no propagation of `user_id` through the SMS pipeline either — `ds-services`' `Expense` Pydantic model has no `user_id` field, meaning **today the pipeline cannot attribute a parsed SMS expense to a specific user**. This is the single most important functional gap to close before the passive-capture feature is usable (flagged again in Sections 6, 10, and 22).

### 2.2 Frontend
Single React Native codebase compiled for both Android and iOS (native `android/` and `ios/` projects present, both currently using default RN scaffolding — no custom native modules). Screens communicate directly with backend services via `fetch()`; there is no shared API client/service layer yet (each screen inlines its own `fetch` calls with hardcoded URLs — one screen uses `10.31.183.185:9898`, another uses `localhost:9898`, indicating environment configuration is not yet centralized).

### 2.3 Backend
Two independently deployable Spring Boot 3 / Java 21 services (`Auth-Services`, `expense-services`) plus one Python Flask service (`ds-services`). No shared parent POM/build, no shared DTO library — `ExpenseDto` is duplicated conceptually between the Python `Expense` Pydantic model and the Java `ExpenseDto`, matched only by convention (`amount`, `merchant`, `currency` field names) and Kafka JSON serialization.

### 2.4 Service discovery / API Gateway
**Not implemented.** No Eureka server, no Spring Cloud Gateway, no config server exist in any of the four repos. Each service currently must be called directly by IP:port; the mobile app hardcodes both a LAN IP and `localhost`, which will break outside development. **Recommendation (Section 24):** introduce Spring Cloud Gateway or an Nginx reverse proxy as a single ingress, plus a config server or environment-based `.env`/`application-{profile}.yml` split.

### 2.5 Database
Two separate MySQL schemas today: `authservice` (owned by Auth-Services) and `expenseservice` (owned by expense-services). This is correct microservice practice (database-per-service) but means any "join" between user identity and expense data must happen at the application layer, and currently doesn't (no service-to-service call exists to enrich expenses with user profile data).

### 2.6 Authentication
Stateless JWT via Spring Security, HMAC-SHA256 signed, hardcoded secret in `JwtService` (flagged in Section 22). No authorization/role-checks are implemented on any endpoint beyond Spring Security's own `authenticated()` catch-all in `Auth-Services`; `expense-services` and `ds-services` have **no Spring Security / auth dependency at all**, so their endpoints are open to any caller today.

### 2.7 Request/response/data flow
- **Synchronous path:** Mobile → Auth-Services (REST/JSON) → MySQL (`authservice`) → JWT response.
- **Asynchronous path:** Mobile/SMS-source → ds-services (REST/JSON) → LangChain/LLM (Mistral/OpenAI, external HTTPS call) → Kafka producer → Kafka topic `expense_service` → Kafka consumer in expense-services → MySQL (`expenseservice`).
- **Read path:** Mobile → expense-services `GET /expense/v1/` → MySQL (`expenseservice`) → JSON list of `ExpenseDto`.

### 2.8 Communication protocols summary

| Link | Protocol | Format | Auth today |
|---|---|---|---|
| Mobile ↔ Auth-Services | HTTP REST | JSON | None on signup/login/refresh (by design — public endpoints); Bearer JWT expected elsewhere but no protected endpoint exists yet |
| Mobile ↔ ds-services | HTTP REST | JSON | None |
| ds-services → Kafka | Kafka protocol | JSON | Cluster-level only (no SASL configured) |
| Kafka → expense-services | Kafka protocol | JSON (custom `ExpenseDeserializer`) | Cluster-level only |
| Mobile ↔ expense-services | HTTP REST | JSON | None (gap) |
| ds-services → LLM providers | HTTPS | JSON | API key (Mistral/OpenAI) |

---

## 3. Repository Analysis

### 3.1 `Auth-Services`

**Purpose:** Identity provider — user registration, credential verification, JWT + refresh-token issuance.

**Package structure** (`org.example`):
```
org.example
├── App.java                      (@SpringBootApplication entry point)
├── auth/
│   ├── JwtAuthFilter.java        (OncePerRequestFilter — extracts & validates Bearer token)
│   ├── SecurityConfig.java       (SecurityFilterChain, stateless sessions, permitAll on auth endpoints)
│   └── UserConfig.java           (BCryptPasswordEncoder bean)
├── controller/
│   ├── AuthController.java       (POST /auth/v1/signup)
│   └── TokenController.java      (POST auth/v1/login, POST auth/v1/refreshToken)
├── entities/
│   ├── UserInfo.java              (@Entity "users")
│   ├── UserRole.java              (@Entity "roles")
│   └── RefreshToken.java          (@Entity "Tokens")
├── model/
│   └── UserInfoDto.java           (extends UserInfo; snake_case Jackson naming)
├── repository/
│   ├── UserRepository.java
│   └── RefreshTokenRepository.java
├── request/
│   ├── AuthRequestDTO.java        (username, password)
│   └── JwtResponseDTO.java        (accessToken, token)
├── response/
│   └── RefreshTokenRequestDTO.java (token)
└── service/
    ├── CustomUserDetails.java     (Spring Security UserDetails adapter)
    ├── JwtService.java            (HS256 sign/verify, 60-second expiry — see 3.1.1)
    ├── RefreshTokenService.java   (create/verify/find refresh tokens)
    └── UserDetailsServiceImpl.java (signup + Spring Security UserDetailsService)
```

**Dependencies (from `app/build.gradle`):** Spring Boot Web, Spring Security, Spring Data JPA, `io.jsonwebtoken` (JJWT), MySQL connector, Lombok.

**3.1.1 Notable implementation details / defects to design around:**
- `JwtService.createToken()` sets expiration to `System.currentTimeMillis() + 1000*60*1` — **the access token expires after 60 seconds.** This is almost certainly a bug (likely meant `*60*60` for 1 hour), but the UI must be designed **assuming very short-lived access tokens** — i.e., silent refresh-on-launch (which the mobile `Login.tsx` already attempts) and graceful "session expired" states are not optional UX, they are load-bearing.
- `RefreshToken.userInfo` join column is declared as `@JoinColumn(name = "id", referencedColumnName = "user_id")` — `UserInfo` has no column named `id`, only `user_id`; this mapping is inconsistent and should be corrected to `name = "user_id"`.
- `RefreshTokenService.verifyExpiration()` has inverted logic: it deletes the token and throws "expired" when `expiryDate.compareTo(now) > 0` (i.e., when the token is **still valid**). This is a functional defect — flag for backend remediation, and design the mobile refresh flow to treat *any* non-200 response from `/refreshToken` as "must re-login," since today a valid, unexpired token can be incorrectly rejected.
- The JWT signing secret is a hardcoded string literal in source — a critical security finding (Section 22).
- No role/authority claims are embedded in the JWT itself; roles live only in the DB and are attached to the Spring Security context on each request via `CustomUserDetails`, so cross-service authorization (e.g., expense-services checking a role) is not currently possible without a shared token-introspection call.

### 3.2 `expense-services`

**Purpose:** System of record for expense line items; ingests events from Kafka, exposes a minimal read API.

**Package structure** (`com.nit.ExpenseServices`):
```
com.nit.ExpenseServices
├── ExpenseServicesApplication.java
├── consumer/
│   ├── ExpenseConsumer.java       (@KafkaListener on ${spring.kafka.topic-json.name})
│   └── ExpenseDeserializer.java   (custom Kafka Deserializer<ExpenseDto>)
├── controller/
│   └── ExpenseController.java     (GET /expense/v1/)
├── dto/
│   └── ExpenseDto.java            (snake_case Jackson naming; externalId, amount, userId, merchant, currency, createdAt)
├── entities/
│   └── Expense.java               (@Entity "expenses"; auto-generates externalId UUID + createdAt on persist)
├── repository/
│   └── ExpenseRepository.java     (CrudRepository; findByUserId, findByUserIdAndCreatedAtBetween, findByUserIdAndExternalId)
└── service/
    └── ExpenseService.java        (createExpense, updateExpense, getExpenses; defaults currency to "inr")
```

**Dependencies:** Spring Boot Web, Spring Data JPA, Spring Kafka, MySQL connector, Lombok.

**3.2.1 Notable implementation details:**
- `amount` is stored and transmitted as a **String**, not a numeric/decimal type, both in the DTO and the JPA entity. This has direct UI implications: the client must parse/validate amount strings defensively (currency formatting, sorting, and summation all need explicit numeric coercion) — flagged as a data-modeling risk to fix server-side (should be `BigDecimal`).
- `ExpenseController.getExpenses()` uses `@PathParam("userId")` from `jakarta.websocket.server` (not `@RequestParam`) — this is very likely non-functional as a query-parameter binding annotation for a Spring MVC `@GetMapping`; treat the current read endpoint as **unreliable/likely broken** until the backend fixes this (should be `@RequestParam`). Design the UI to handle an empty/error response gracefully rather than assuming the endpoint always returns data.
- `updateExpense()` exists in the service layer but has **no controller route** exposing it — there is currently no way to edit an expense via the API. This is a gap for any "edit expense" UI affordance (Section 25 marks it as a planned action, not a live one).
- There is no `DELETE` endpoint and no `POST` (manual-create) endpoint — the only way an expense enters the system today is via the Kafka/SMS pipeline.
- No pagination on `GET /expense/v1/` — returns the full list for a user every time.

### 3.3 `ds-services` (SMS/LLM extraction microservice — not a discovery server)

**Purpose:** Classify inbound SMS text as a bank transaction message, extract structured expense data via an LLM, and publish it to Kafka for `expense-services` to persist.

**Folder structure:**
```
src/app/
├── __init__.py            (Flask app factory + Kafka producer + route registration)
├── config.py               (empty — no config loaded today)
├── service/
│   ├── Expense.py           (Pydantic model: amount, merchant, currency + .serialize())
│   ├── llmService.py        (LangChain pipeline: ChatMistralAI primary, ChatOpenAI fallback on HTTP 429)
│   └── messageService.py    (orchestrates classification + extraction)
└── utils/
    └── messagesUtil.py      (regex keyword classifier: "spent"|"bank"|"card")
```

**Routes:**
- `POST /v1/ds/message` — body `{ "message": "<sms text>" }` → classifies, extracts, publishes to Kafka topic `expense_service`, returns the extracted `{amount, merchant, currency}` JSON.
- `GET /` — health-check style ("Hello world").

**Dependencies (`requirements.txt`/`setup.py`):** Flask, LangChain + `langchain-community`/`langchain-core`, `langchain-mistralai`, `langchain-openai`, `kafka-python`, `pydantic`, `python-dotenv`.

**3.3.1 Notable implementation details:**
- The classifier (`MessagesUtil.isBankSms`) is a **3-keyword regex** ("spent", "bank", "card") — high false-positive/false-negative risk in production; note this in Section 21/23 as an area needing a proper ML classifier or expanded rule set.
- `Expense` (Python) has **no `user_id` and no `external_id`** field — the message that reaches Kafka cannot currently be tied to a specific end user. This must be fixed before the passive-capture feature can work multi-tenant; the mobile client will need to include a user/session identifier in the `POST /v1/ds/message` call, and `ds-services` will need to pass it through to the Kafka payload.
- If `result` is `None` (message isn't a bank SMS), the code still calls `result.serialize()` **before** the `if result is None` check in `__init__.py` — this is a null-reference bug that will raise an exception rather than returning the intended 400 response. Flag for backend fix.
- No retry/dead-letter handling around the Kafka `producer.send()` call.
- API keys for Mistral/OpenAI are read from environment variables (`load_dotenv()`), which is correct practice — unlike the other two services, this one does **not** hardcode secrets.

### 3.4 `expense-tracker-app`

**Purpose:** Cross-platform mobile client for signup, login, and (currently mocked) expense viewing.

**Folder structure:**
```
├── App.tsx                          (NavigationContainer + native-stack: Login → SignUp → Home)
├── android/, ios/                    (default RN scaffolding, no custom native modules)
└── src/app/
    ├── components/
    │   ├── CustomBox.tsx             (Gluestack Box wrapper; neo-brutalist offset-shadow box)
    │   └── CustomText.tsx             (Text wrapper, Helvetica, black)
    └── pages/
        ├── Login.tsx                  (username/password form; token check + refresh-on-mount; calls Auth-Services)
        ├── SignUp.tsx                  (firstName/lastName/userName/email/password/phoneNo form; calls Auth-Services)
        └── Home.tsx                    (dashboard with **mock/hardcoded** expense list + bar chart; local logout state only)
```

**Key dependencies (`package.json`):** `react-native` 0.81.1, `react` 19.1.0, `@react-navigation/native` + `native-stack` 7.x, `@gluestack-ui/themed` + `@gluestack-style/react` (Tailwind-like RN styling system), `@react-native-async-storage/async-storage`, `react-native-svg`, `react-native-safe-area-context`, `react-native-screens`.

**3.4.1 Notable implementation details:**
- **No centralized API/network layer.** Each screen calls `fetch()` directly with inline URLs (`http://10.31.183.185:9898/...` in one file, `http://localhost:9898/...` in another) — no `.env`/base-URL config, no shared `apiClient.ts`, no interceptor for attaching the Bearer token automatically. This is the single highest-leverage refactor for the codebase and should be assumed as an implicit requirement in Section 24/25 (a real API client layer, not shown in current source, is required before the UI can be functionally wired).
- **State management:** purely local `React.useState` per screen; no Redux/Zustand/Context/React Query. `Home.tsx`'s `isLoggedIn` state is local to that screen and not derived from the token in `AsyncStorage`, so navigating back to Home after a fresh login always shows `isLoggedIn = true` regardless of actual auth state — a state-management gap to design around (global auth context recommended in Section 8).
- **Navigation:** a single native stack with three unconditional routes; there is no auth-gated navigator split (e.g., `AuthStack` vs `AppStack`), so `Home` is reachable in the stack even when not authenticated (guarded only by the `isLoggedIn` local boolean's fallback render, not by navigation itself).
- **SignUp field-naming mismatch:** the app sends `{ firstName, lastName, userName, email, password, phoneNo }` in camelCase, but the backend `UserInfoDto` is annotated `@JsonNaming(SnakeCaseStrategy.class)`, meaning Spring expects `first_name`, `last_name`, `user_name`, `phone_number`. As written, most of these fields will **not bind** on the backend and will arrive as `null`. Also, `UserInfoDto` doesn't declare a `firstName`/`phoneNo` field at all (only `userName`, `lastName`, `phoneNumber`, `email` — extending `UserInfo` for `username`/`password`). This is a real integration bug between repos; the UI generator should treat the SignUp contract as needing alignment (documented precisely in Section 5) rather than copying the current buggy call verbatim.
- `Home.tsx` defines its **own internal duplicate** of `CustomBox` rather than importing the shared one from `src/app/components/CustomBox.tsx` — a code-duplication smell, not a UI-visible issue, but worth flagging for engineering hygiene.
- Visual style already established in code: a **neo-brutalist "offset shadow box"** pattern (solid black border, hard drop shadow via an absolutely positioned gray/dark layer behind a white content layer, no blur) appears in `CustomBox.tsx`, `Login.tsx`, and `SignUp.tsx`. `Home.tsx` uses a **softer elevation-based Material-ish style** (rounded corners, `elevation`, slate palette) that visually contradicts the neo-brutalist auth screens. Section 16 resolves this inconsistency into one coherent design system.


## 4. Database Analysis

### 4.1 Entities found in code (AS-IS)

**`authservice` schema (owned by Auth-Services):**

| Entity | Table | Fields | Notes |
|---|---|---|---|
| `UserInfo` | `users` | `user_id` (PK, String/UUID), `username`, `password` (BCrypt hash), `roles` (M:M) | No email/phone/name columns on the base entity itself |
| `UserRole` | `roles` | `role_id` (PK, auto), `name` | |
| (junction) | `users_roles` | `user_id` (FK→users), `role_id` (FK→roles) | Declared via `@JoinTable` on `UserInfo.roles` |
| `RefreshToken` | `Tokens` | `id` (PK, auto), `token`, `expiryDate` (Instant), `userInfo` (1:1, mis-mapped FK — see 3.1.1) | Table name capitalized inconsistently with others |

**`expenseservice` schema (owned by expense-services):**

| Entity | Table | Fields | Notes |
|---|---|---|---|
| `Expense` | `expenses` | `id` (PK, auto), `external_id` (String UUID, auto-generated on persist), `amount` (String), `user_id` (String, **no FK constraint** — cross-service reference by convention only), `merchant`, `currency`, `created_at` (Timestamp, auto-set on persist) | `amount` as String is a modeling defect (Section 3.2.1) |

### 4.2 Entity relationship diagram (AS-IS, across both schemas — logical, not enforced at DB level since they are separate databases)

```
┌───────────────┐        ┌──────────────────┐        ┌────────────────┐
│   UserRole     │        │     UserInfo      │        │  RefreshToken   │
│ role_id (PK)   │◄──────►│ user_id (PK)       │◄──────►│ id (PK)         │
│ name           │  M:M   │ username           │  1:1   │ token           │
└───────────────┘ (users_ │ password           │ (buggy │ expiryDate      │
                   roles)  └──────────────────┘  FK)    │ userInfo_id(FK) │
                                    │                    └────────────────┘
                                    │ user_id (logical, unenforced,
                                    │ cross-database reference)
                                    ▼
                           ┌──────────────────┐
                           │     Expense        │
                           │ id (PK)             │
                           │ external_id         │
                           │ user_id (no FK)     │
                           │ amount (String)     │
                           │ merchant            │
                           │ currency            │
                           │ created_at          │
                           └──────────────────┘
```

### 4.3 SQL schema (AS-IS, reconstructed from JPA annotations)

```sql
-- authservice database
CREATE TABLE users (
    user_id     VARCHAR(36) PRIMARY KEY,
    username    VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL
);

CREATE TABLE roles (
    role_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL
);

CREATE TABLE users_roles (
    user_id     VARCHAR(36) NOT NULL REFERENCES users(user_id),
    role_id     BIGINT NOT NULL REFERENCES roles(role_id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE Tokens (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    token       VARCHAR(255) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    user_id     VARCHAR(36) REFERENCES users(user_id)  -- corrected FK
);

-- expenseservice database
CREATE TABLE expenses (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(36) NOT NULL,
    amount      VARCHAR(255) NOT NULL,     -- recommend migrating to DECIMAL(12,2)
    user_id     VARCHAR(36) NOT NULL,       -- recommend adding index; no FK across DBs
    merchant    VARCHAR(255),
    currency    VARCHAR(10) DEFAULT 'inr',
    created_at  TIMESTAMP
);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_user_created ON expenses(user_id, created_at);
```

### 4.4 Recommended TO-BE schema additions
To support Sections 7, 9, 17, 19 (reports, categories, budgets), the following **new** entities are recommended — not present in code today:

```sql
CREATE TABLE categories (
    category_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       VARCHAR(36),               -- NULL = system default category
    name          VARCHAR(100) NOT NULL,
    icon          VARCHAR(50),
    color_hex     VARCHAR(7),
    is_default    BOOLEAN DEFAULT FALSE
);

ALTER TABLE expenses
    ADD COLUMN category_id BIGINT REFERENCES categories(category_id),
    ADD COLUMN source ENUM('sms','manual','import') DEFAULT 'manual',
    MODIFY COLUMN amount DECIMAL(12,2) NOT NULL;

CREATE TABLE incomes (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(36) NOT NULL,
    user_id     VARCHAR(36) NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    source      VARCHAR(255),
    currency    VARCHAR(10) DEFAULT 'inr',
    created_at  TIMESTAMP
);

CREATE TABLE budgets (
    budget_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       VARCHAR(36) NOT NULL,
    category_id   BIGINT REFERENCES categories(category_id),
    monthly_limit DECIMAL(12,2) NOT NULL,
    month         DATE NOT NULL
);
```

### 4.5 NoSQL note
No NoSQL datastore exists in the current system. If notification/activity-feed features (Section 21) are added at scale, a document store (e.g., MongoDB/DynamoDB) for append-only notification events would avoid write-amplification on the relational `expenses` table, but this is a future-scale recommendation, not a current requirement.

---

## 5. REST API Documentation

> Endpoints are grouped by service. "As implemented" columns describe exact current behavior, including the defects noted in Section 3, so the UI generator can build defensive states (loading/error/empty) rather than only happy-path screens.

### 5.1 Auth-Services — base `http://<host>:9898`

#### `POST /auth/v1/signup`
- **Auth required:** No (public)
- **Request body:**
```json
{
  "username": "string",
  "password": "string"
}
```
  *(Note: `UserInfoDto` also declares `userName`, `lastName`, `phoneNumber`, `email` as snake_case-serialized fields — `user_name`, `last_name`, `phone_number`, `email` — but only `username`/`password` are guaranteed to persist since `UserInfo` itself has no columns for the others. Treat first/last name and phone as **not currently persisted** even if accepted in the payload.)*
- **Response 200:**
```json
{ "access_token": "eyJhbGciOi...", "token": "3fa85f64-...refresh-uuid..." }
```
  *(Field names are camelCase in the Java DTO (`accessToken`, `token`) — no `@JsonNaming` annotation on `JwtResponseDTO`, so actual wire format is camelCase: `{"accessToken": "...", "token": "..."}`.)*
- **Errors:** `400 Bad Request` — body `"Already Exist"` (username taken). `500 Internal Server Error` — body `"Exception in User service"`.

#### `POST /auth/v1/login`
- **Auth required:** No (public)
- **Request body:** `{ "username": "string", "password": "string" }`
- **Response 200:** `{ "accessToken": "...", "token": "<refresh-token-uuid>" }`
- **Errors:** `500 Internal Server Error` — body `"Exception in user Service"` (returned even for plain bad-credentials cases, since Spring Security throws `BadCredentialsException` before the controller's `else` branch is reachable — design a generic "invalid credentials" UI message, not a technical error banner).
- **Token lifetime:** Access token expires in **60 seconds** per current code (see 3.1.1) — UI must silently refresh or expect frequent 401s.

#### `POST /auth/v1/refreshToken`
- **Auth required:** No (public route, but requires a valid stored refresh token)
- **Request body:** `{ "token": "<refresh-token-uuid>" }`
- **Response 200:** `{ "accessToken": "...", "token": "<same-refresh-token>" }`
- **Errors:** `RuntimeException` "Refresh Token is not in DB" (unhandled — surfaces as `500`). Due to the inverted-logic defect in `verifyExpiration()` (3.1.1), a **valid** token may also incorrectly throw "expired." UI should treat any non-200 as "please log in again."

#### All other Auth-Services routes
- `anyRequest().authenticated()` — any endpoint not explicitly listed above requires a valid `Authorization: Bearer <accessToken>` header. No other endpoints (e.g., `GET /users/me`, `/ping`) are implemented in the current controllers, even though `Login.tsx` calls a `/ping` endpoint that does not exist in the backend source — this call will 404 today.

### 5.2 expense-services — base `http://<host>:9820`

#### `GET /expense/v1/`
- **Auth required:** No enforcement in code today (gap — should require Bearer JWT)
- **Query parameter:** `userId` (string) — **implementation caveat:** bound via `@PathParam` from `jakarta.websocket.server`, which is very unlikely to correctly bind a query parameter in a standard Spring MVC `@GetMapping`; treat as **potentially non-functional** until fixed to `@RequestParam("userId") String userId`.
- **Response 200:**
```json
[
  {
    "external_id": "b6b0...",
    "amount": "450.00",
    "user_id": "8f21...",
    "merchant": "Swiggy",
    "currency": "inr",
    "created_at": "2026-06-30T18:22:00.000+00:00"
  }
]
```
  *(snake_case wire format, per `@JsonNaming(SnakeCaseStrategy.class)` on `ExpenseDto`.)*
- **Errors:** `404 Not Found` with `null` body on any exception (broad catch-all — no distinction between "user not found" and "server error").

#### Endpoints referenced in the service layer but **not exposed** via any controller (do not design as callable today; list as roadmap items):
- Create expense manually (`ExpenseService.createExpense` exists, no `POST` route)
- Update expense (`ExpenseService.updateExpense` exists, no `PUT/PATCH` route)
- Delete expense (no method, no route)

### 5.3 ds-services — base `http://<host>:8010`

#### `POST /v1/ds/message`
- **Auth required:** No
- **Request body:** `{ "message": "Your account has been debited INR 450 spent at Swiggy via card ending 1234" }`
- **Response 200:**
```json
{ "amount": "450", "merchant": "Swiggy", "currency": "INR" }
```
- **Response 400:** `{ "error": "Not a bank SMS or could not process message" }` — **caveat:** current code calls `.serialize()` on `result` before checking `result is None` (Section 3.3.1), so in practice a non-bank SMS will raise an unhandled server exception (`AttributeError`) rather than cleanly returning this 400. Design the client to treat any non-2xx (including 500) as "message not recognized."
- **Note:** This endpoint has **no `user_id` in the request or response contract today.** Any UI flow that lets a user "forward" or paste an SMS for parsing must be designed as informational/preview-only until the backend adds user attribution end-to-end.

#### `GET /`
- Returns plain text `"Hello world"` — health check only, not for UI use.

### 5.4 Standard error shape (recommended TO-BE)
None of the three backend services currently share a common error envelope (each returns ad hoc strings or nulls). For the UI generator, assume this **target** shape once backend work catches up, and build error-state components against it:
```json
{ "timestamp": "...", "status": 400, "error": "VALIDATION_ERROR", "message": "...", "path": "/auth/v1/login" }
```


## 6. Authentication Flow

### 6.1 Registration
1. User submits username/password (and optionally name/phone/email, though not persisted today — see 5.1) via `POST /auth/v1/signup`.
2. `UserDetailsServiceImpl.signupUser()` checks for an existing username; if found, returns `false` → controller responds `400 Already Exist`.
3. Password is hashed with BCrypt (`PasswordEncoder`), a random UUID is generated as `user_id`, and a `UserInfo` row is saved with an **empty role set**.
4. A refresh token is created and an access token is generated immediately (auto-login after signup).
5. Client stores both tokens (mobile app already does this via `AsyncStorage.setItem`).

### 6.2 Login
1. `POST /auth/v1/login` invokes `AuthenticationManager.authenticate()` with a `UsernamePasswordAuthenticationToken`.
2. Spring Security's `DaoAuthenticationProvider` delegates to `UserDetailsServiceImpl.loadUserByUsername()`, wraps the result in `CustomUserDetails` (which also maps DB roles to `GrantedAuthority`s), and verifies the BCrypt hash.
3. On success, a new refresh token row is created (note: **old refresh tokens are never invalidated** — every login adds a new row, so a user can accumulate many valid refresh tokens; no revocation-on-login-elsewhere behavior exists) and a fresh access token is issued.

### 6.3 JWT structure and lifetime
- Algorithm: HS256, secret is a **hardcoded string constant** in `JwtService` (critical finding, Section 22).
- Claims: subject = username only. **No roles, no user_id, no expiry buffer claims are embedded** beyond the standard `iat`/`exp`.
- Lifetime: `System.currentTimeMillis() + 1000*60*1` = **60 seconds** (see 3.1.1 — almost certainly an unintended bug, but must be designed around as-is).
- Because the JWT carries no `user_id` claim, downstream services (expense-services) cannot derive the authenticated user from the token even if they started validating it — they rely entirely on a client-supplied `user_id`/`userId` parameter today, which is a trust boundary weakness (Section 22).

### 6.4 Refresh token
- Stored server-side in the `Tokens` table, referenced by opaque UUID string, no expiry enforcement working correctly today (3.1.1 defect), default expiry window set to `600000` ms = **10 minutes** in `RefreshTokenService.createRefreshToken()`.
- Refresh flow: client calls `POST /auth/v1/refreshToken` with the stored refresh token → server looks it up, "verifies" expiration (buggy), and issues a new access token while **reusing the same refresh token** (no rotation) — a refresh-token-rotation upgrade is recommended (Section 22).

### 6.5 Authorization / role-based access
- Roles exist as a data model (`UserRole`, `users_roles`) and are attached to the Spring Security `Authentication` object via `CustomUserDetails.getAuthorities()`.
- **No controller in any of the three backend services currently uses `@PreAuthorize` or role checks.** `@EnableMethodSecurity` is declared in `SecurityConfig` but not exercised. Treat role-based UI gating (e.g., an "admin" view) as a **future capability**, not a current one — there is no admin role seeded or referenced anywhere in the code.

### 6.6 Session flow (client-side, target behavior given the constraints above)
```
App Launch
   │
   ▼
Read accessToken + refreshToken from AsyncStorage
   │
   ├─ accessToken present & valid (ping/whoami succeeds) ──► Home
   │
   ├─ accessToken missing/expired, refreshToken present
   │     └─ POST /auth/v1/refreshToken
   │           ├─ 200 ──► store new accessToken ──► Home
   │           └─ non-200 ──► clear storage ──► Login
   │
   └─ no tokens at all ──► Login
```
Given the 60-second access-token lifetime, the client should treat **every** authenticated API call as a candidate for a transparent refresh-and-retry on `401`, not just refresh at app launch.


## 7. Expense Service Analysis (feature-by-feature)

| Requested feature | Status in code | Design guidance |
|---|---|---|
| **Expense capture (SMS/passive)** | Partially built — `ds-services` extracts amount/merchant/currency and publishes to Kafka; `expense-services` consumes and persists. **Missing:** user attribution end-to-end (6.3, 3.3.1). | Design the "recent expenses" list to render an entry the moment it's parsed, with a subtle "auto-detected" badge distinguishing SMS-sourced rows once `source` field (4.4) is added. |
| **Expense capture (manual)** | Not built — no `POST` endpoint exists. | Design a manual "Add Expense" form (amount, merchant, category, date, note) as a forward-compatible screen; wire to a new endpoint the backend team will need to add. |
| **Income tracking** | Not built — no entity, no endpoint. | Design as a parallel flow mirroring expenses (Section 4.4 schema), toggled via a segmented control (Income/Expense) on the add-transaction screen. |
| **Categories** | Not built — no entity; expenses currently have no category field at all. | Recommend the `categories` table in 4.4; UI should let users pick from defaults (Food, Transport, Utilities, Health, Fun — these five appear as illustrative mock data in `Home.tsx`, a reasonable seed set) or create custom ones. |
| **Reports** | Not built. | Monthly/weekly summary screens (Section 17) are pure roadmap; back them with a new aggregation endpoint (`GET /expense/v1/summary?period=month`). |
| **Statistics/Charts** | `Home.tsx` renders a **static mock bar chart** (pure `View`/`StyleSheet`, no chart library) comparing 5 hardcoded expense amounts. Not backed by real data or a charting library yet. | Recommend `react-native-svg`-based (already a dependency) or `victory-native`/`recharts`-equivalent chart components once real time-series data exists. |
| **History** | The `GET /expense/v1/` endpoint returns a flat list (no date-range filtering exposed, despite `findByUserIdAndCreatedAtBetween` existing in the repository layer with no controller route). | Add a `startDate`/`endDate` query param to the existing endpoint before building a history/filter UI. |
| **CRUD** | Only **Create** (via Kafka, not REST) and **Read** exist. Update method exists unused; Delete doesn't exist. | Full CRUD screens can be designed now (forward-compatible), but implementation-status badges in this doc make clear which actions are live vs. mocked when handed to engineering. |

## 8. Mobile App Analysis

### 8.1 Architecture
Simple, flat React Native structure: no feature-based module split, no state-management library, no navigation type-safety (route params are untyped `any`-shaped objects), no shared API layer. This is a **prototype-stage codebase** — appropriate to note explicitly since the UI generator should propose the *target* architecture below rather than mirror the current flatness.

### 8.2 Recommended target mobile architecture
```
src/
├── api/                 (axios/fetch client, interceptors for JWT attach + refresh-on-401)
│   ├── client.ts
│   ├── authApi.ts
│   └── expenseApi.ts
├── app/
│   ├── navigation/
│   │   ├── AuthStack.tsx     (Login, SignUp)
│   │   ├── AppStack.tsx      (Home/Dashboard, AddExpense, Reports, Settings)
│   │   └── RootNavigator.tsx (switches stacks based on auth state)
│   ├── screens/               (one folder per screen: index + styles + hooks)
│   ├── components/            (shared design-system primitives)
│   └── context/
│       └── AuthContext.tsx    (global isAuthenticated/user state, replaces Home.tsx's local isLoggedIn)
├── store/                (if adopting Redux/Zustand for cross-screen state e.g. expense list cache)
└── types/                 (shared TS interfaces mirroring backend DTOs exactly, incl. snake_case wire fields)
```

### 8.3 Navigation (AS-IS → TO-BE)
- **AS-IS:** one flat `Stack.Navigator` with Login/SignUp/Home, no auth gating at the navigator level.
- **TO-BE:** root switch between `AuthStack` and `AppStack` driven by `AuthContext`, plus a bottom tab navigator inside `AppStack` (Dashboard, Add, Reports, Settings) per Section 18.

### 8.4 Screens (current)
1. **Login** — username/password inputs, "Submit" and "Goto Sign Up" buttons, auto-attempts silent login/refresh on mount.
2. **SignUp** — first name, last name, username, email, password, phone number inputs (see field-mapping bug, 3.4.1).
3. **Home** — profile header (name, email, avatar initial, logout button), "Recent Expenses" list (5 mock items with emoji icons), a hand-rolled bar chart, and a total. Toggles a "logged out" empty state locally.

### 8.5 Network calls (current, verbatim endpoints called from the app)
| Screen | Call | Target |
|---|---|---|
| Login | `GET /ping` | `http://10.31.183.185:9898/ping` — **endpoint does not exist on the backend**, will 404 |
| Login | `POST /auth/v1/login` | `http://localhost:9898/auth/v1/login` |
| Login | `POST /auth/v1/refreshToken` | `http://localhost:9898/auth/v1/refreshToken` |
| SignUp | `POST /auth/v1/signup` | `http://10.31.183.185:9898/auth/v1/signup` |

Note the inconsistent host between `localhost` and a LAN IP within the *same app* — confirms the "no centralized config" finding (3.4.1). The generated UI/config should centralize this into one `API_BASE_URL`.

### 8.6 View models / repositories / models (mobile)
None exist as named patterns in the current code (no MVVM layer, no repository-pattern wrapper around `fetch`). TO-BE recommendation: a thin `api/expenseApi.ts` module exposing typed functions (`getExpenses(userId): Promise<Expense[]>`) that screens call, keeping `fetch`/error-handling out of component bodies.

### 8.7 API integration
Direct, per-screen, no shared types. TO-BE: define TypeScript interfaces matching the exact wire format in Section 5 (snake_case fields for `ExpenseDto`, camelCase for `JwtResponseDTO`) to prevent silent mapping bugs like the SignUp field-naming mismatch already present.

## 9. User Journey (current + target, end to end)

```
Splash (recommended addition — none exists today)
   │  auto-attempt silent auth (accessToken/refreshToken check)
   ▼
Login ──(no account)──► SignUp ──(success, auto-login)──► Home/Dashboard
   │ (success)
   ▼
Home/Dashboard
   ├─ View recent transactions (mock today → real API once fixed)
   ├─ View spend-by-category chart (target; no category data exists yet)
   ├─ Add Expense (target; no manual-create endpoint exists yet)
   ├─ Reports (target; no aggregation endpoint exists yet)
   ├─ Settings (target; no profile-update endpoint exists yet)
   └─ Logout ──► clears AsyncStorage tokens ──► Login
```

## 10. Functional Requirements

**FR-1** Users shall be able to register with a unique username and password.
**FR-2** Users shall be able to log in and receive an access token and refresh token.
**FR-3** The system shall silently refresh an expired access token without forcing re-login, as long as the refresh token is valid.
**FR-4** The system shall classify inbound SMS text as bank-transaction-related or not.
**FR-5** For bank-transaction SMS, the system shall extract amount, merchant, and currency using an LLM pipeline, with a fallback provider if the primary is rate-limited.
**FR-6** Extracted expenses shall be attributed to the authenticated user (**gap — requires backend change**, see 6.3/3.3.1).
**FR-7** Users shall be able to view a list of their expenses.
**FR-8** *(Target)* Users shall be able to manually add, edit, and delete an expense.
**FR-9** *(Target)* Users shall be able to categorize expenses.
**FR-10** *(Target)* Users shall be able to view spend summaries by day/week/month and by category.
**FR-11** *(Target)* Users shall be able to set monthly budgets per category and see progress toward them.
**FR-12** Users shall be able to log out, clearing local session state.
**FR-13** *(Target)* Users shall be able to update their profile (name, email, phone).

## 11. Non-Functional Requirements

| Category | Current state | Target requirement |
|---|---|---|
| **Performance** | No caching, no pagination on expense list; LLM call in the SMS pipeline is synchronous within the Flask request. | Paginate expense list (limit/offset or cursor); consider making the LLM extraction step async (respond 202, publish result later) to keep `POST /v1/ds/message` latency low. |
| **Scalability** | Each service is independently deployable; Kafka decouples ingestion from persistence — good foundation. No horizontal-scaling config (replica counts, load balancing) present. | Containerize with defined replica counts behind a gateway/load balancer (Section 24). |
| **Security** | Hardcoded JWT secret, hardcoded/leaked-looking DB credentials in `Auth-Services` `application.properties`, no auth on 2 of 3 backend services, 60-second-lived tokens (likely unintended), no HTTPS enforced anywhere in config. | See full remediation list, Section 22. |
| **Availability** | No health checks beyond a bare `GET /` on ds-services; no readiness/liveness probes configured. | Add Spring Boot Actuator health endpoints; add Flask health route with dependency checks (Kafka, LLM API reachability). |
| **Reliability** | No retry/dead-letter handling on Kafka publish or consume; broad `catch (Exception e)` blocks swallow errors silently in several places (`ExpenseConsumer.listen`, `ExpenseController.getExpenses`). | Add structured logging, dead-letter topics, and typed exception handling. |
| **Accessibility** | Mobile screens use plain `TextInput`/`Text` with adequate placeholder colors but no explicit accessibility labels, no dynamic-type/font-scaling consideration, chart data has no non-visual (screen-reader) equivalent. | Add `accessibilityLabel`/`accessibilityRole` throughout; ensure color contrast ratios (Section 16) meet WCAG AA; provide data-table alternative to charts. |
| **Maintainability** | No shared DTO/type contracts across services (Python vs Java), no centralized config, duplicated component definitions (`CustomBox` in `Home.tsx`). | Adopt a shared OpenAPI/JSON-Schema contract published by each backend service; consolidate mobile config into `.env` + a single API client. |

## 12. UX Research

### 12.1 Primary users
Individuals who receive frequent bank SMS alerts and want awareness of spending without manual logging — likely mobile-first, price-conscious, in markets with high SMS-banking usage (inferred from INR default currency and SMS-centric ingestion design).

### 12.2 Pain points (inferred from the product's own architecture choices)
- Manual expense trackers have high abandonment — the entire SMS/LLM pipeline exists specifically to solve this, so the design should **minimize any UI friction that reintroduces manual work** (e.g., don't force category selection as a blocking step on every SMS-derived expense; allow inline, optional tagging).
- Trust/transparency: because expenses can appear "automatically" from parsed SMS, users need clear visual differentiation between auto-captured and manually entered data, and an easy way to correct a misparsed entry (the LLM extraction can be wrong — no confidence score is currently returned, which the UI should account for with an easy "edit" affordance on every SMS-sourced row).

### 12.3 Business goals
Maximize daily-active engagement with the dashboard (since capture is passive, the differentiator is the *insight* layer — charts, budgets, trends) and minimize signup/login friction (hence very short-lived access tokens make silent refresh critical, not optional, to avoid users feeling "logged out" every minute).

### 12.4 User needs
At-a-glance spend awareness, confidence that auto-captured data is accurate (or easy to fix), low-effort categorization, and a sense of progress against a budget.

## 13. Information Architecture

```
App
├── Onboarding/Auth
│   ├── Splash
│   ├── Login
│   └── Sign Up
└── Main (bottom tab navigation)
    ├── Dashboard (Home)
    │   ├── Balance/summary header
    │   ├── Recent transactions
    │   └── Quick stats
    ├── Transactions (History)
    │   ├── Filter (date range, category, source)
    │   └── Transaction detail (view/edit)
    ├── Add (center FAB, modal)
    │   ├── Add Expense
    │   └── Add Income
    ├── Reports
    │   ├── Monthly trend
    │   ├── Category breakdown
    │   └── Budget progress
    └── Settings
        ├── Profile
        ├── Categories management
        ├── Notifications
        ├── Theme (light/dark)
        └── Logout
```


## 14. User Flow Diagram

### 14.1 Authentication flow
```
[Splash] → check tokens
   │
   ├─ valid → [Dashboard]
   └─ invalid/none → [Login]
         ├─ "Sign Up" link → [Sign Up] → success → [Dashboard]
         ├─ submit valid creds → [Dashboard]
         └─ submit invalid creds → inline error, stay on [Login]
```

### 14.2 Add-expense flow (target)
```
[Dashboard] → tap FAB (+) → [Add Expense modal]
   ├─ enter amount, merchant, pick category, date → [Save]
   │      ├─ success → toast "Expense added" → close modal → list refreshes
   │      └─ validation error → inline field errors, stay open
   └─ [Cancel] → discard, close modal
```

### 14.3 SMS-derived expense review flow (target, given no confidence score / no user attribution yet)
```
Bank SMS received → parsed by ds-services → expense appears in [Transactions] with "Auto" badge
   │
   └─ user taps entry → [Transaction Detail]
         ├─ confirm as-is (no action needed, already saved)
         ├─ edit amount/merchant/category → [Save] → updates entry (requires backend PUT, Section 3.2.1 gap)
         └─ delete (mis-detected) → removes entry (requires backend DELETE, currently missing)
```

### 14.4 Session-expiry flow (given 60-second access tokens, Section 6.3)
```
Any authenticated screen → API call returns 401
   │
   └─ silently POST /auth/v1/refreshToken
         ├─ 200 → retry original call transparently, no user-visible interruption
         └─ non-200 → clear session → redirect to [Login] with "Session expired, please log in again"
```

## 15. Wireframe Suggestions

### 15.1 Login screen
- **Layout:** centered single column, max-width 400 on tablet, full-bleed padding 24 on phone.
- **Components:** logo/wordmark, heading "Welcome back", username field, password field (with show/hide toggle — not in current code, recommended addition), primary "Log In" button (full width), secondary text link "Don't have an account? Sign Up".
- **States:** default, field-focused, field-error (red border + helper text), loading (button shows spinner, disabled), submit-error (banner above form).
- **Typography:** heading 24/Bold, body 16/Regular, helper text 12/Regular.
- **Spacing:** 16px between fields, 24px above primary button.

### 15.2 Sign Up screen
- **Layout:** same shell as Login, scrollable form (6 fields: first name, last name, username, email, password, phone).
- **Components:** grouped fields (name pair side-by-side on tablet, stacked on phone), password strength hint, primary "Create Account" button, secondary link back to Login.
- **Validation:** inline per-field (required, email format, phone format, password minimum length) — none of this exists server-side today, so client-side validation is the only guardrail until the backend adds it.

### 15.3 Dashboard (Home)
- **Layout:** scrollable single column; header card (profile + greeting), summary card (total spend this month), horizontal category chips/filter, transaction list, chart card.
- **Components:** avatar (initials fallback, matches current mock), greeting text, total-spend stat with delta vs. last period (target — no historical comparison exists yet, design as optional/empty state until backend supports it), "Recent Transactions" list (icon, merchant, category tag, amount, relative time), bar or donut chart card, empty state ("No expenses yet — they'll show up here once you make a purchase" for zero-data accounts).
- **FAB:** bottom-right "+" to add expense/income.
- **Cards:** rounded corners (see Section 16 tokens), soft elevation shadow (reconciling the two conflicting styles found in code — Section 3.4.1).

### 15.4 Transaction Detail (target)
- **Layout:** modal/bottom-sheet on mobile.
- **Components:** large amount, merchant name (editable), category picker, date, source badge ("Auto-detected from SMS" vs "Manual"), notes field, Save/Delete actions.

### 15.5 Reports (target)
- **Layout:** tabbed (Week / Month / Year), top summary stat, line/bar trend chart, category breakdown donut + legend list with percentages, "Top categories" ranked list.

### 15.6 Settings (target)
- **Layout:** grouped list (iOS-style sections): Profile, Preferences (theme, currency, notifications), Categories, Security (change password), About, Logout (destructive, red text, confirmation dialog).

### 15.7 Responsive behavior
Mobile-first (this is a phone app), but since gluestack-ui supports responsive props, design breakpoints for tablet: two-column dashboard (summary + chart side-by-side) above ~768px width.

## 16. UI Design System

> Two conflicting visual languages currently exist in code: a **neo-brutalist offset-shadow** style (`CustomBox`, Login, SignUp — solid black borders, hard un-blurred shadow) and a **soft Material-ish elevation** style (`Home.tsx` — rounded corners, `elevation`, slate palette, indigo accent). Recommendation: standardize on the **softer, elevation-based system** as the primary direction (better accessibility, more scalable across light/dark themes, and already closer to Material 3 which Section 18 requires for Android), while optionally keeping a bold accent/brand moment (e.g., the FAB or a hero stat card) borrowing the neo-brutalist offset shadow as a distinctive signature rather than the whole app's language.

### 16.1 Color palette
| Token | Light | Dark | Usage |
|---|---|---|---|
| `background` | `#F1F5F9` (slate-100) | `#0F172A` (slate-900) | Screen background |
| `surface` | `#FFFFFF` | `#1E293B` (slate-800) | Cards |
| `primary` | `#6366F1` (indigo-500) | `#818CF8` (indigo-400) | Buttons, active states, avatar |
| `on-primary` | `#FFFFFF` | `#0F172A` | Text/icons on primary |
| `success` | `#10B981` | `#34D399` | Positive deltas, income |
| `danger` | `#EF4444` | `#F87171` | Negative deltas, delete, overspend |
| `text-primary` | `#1E293B` (slate-800) | `#F1F5F9` | Headings, key values |
| `text-secondary` | `#64748B` (slate-500) | `#94A3B8` | Meta text, timestamps |
| `border` | `#E2E8F0` (slate-200) | `#334155` (slate-700) | Card/input borders |
| `chart-accent-1..5` | `#38BDF8, #6366F1, #F59E0B, #EC4899, #10B981` | same, +10% brightness | Category/series colors |

### 16.2 Typography
- Font family: system default per platform (San Francisco/Roboto) or a single cross-platform font (e.g., Inter) for brand consistency — current code uses `Helvetica` explicitly in `CustomText`, recommend replacing with **Inter** for better cross-platform rendering.
- Scale: Display 32/Bold, H1 24/Bold, H2 20/SemiBold, Body 16/Regular, Caption 12/Regular, Amount/Numeric 20–28/Bold with tabular figures for alignment in lists.

### 16.3 Spacing & grid
8px base unit: 4, 8, 12, 16, 24, 32, 40. Screen horizontal padding: 16 (phone), 24 (tablet). Card internal padding: 16–24.

### 16.4 Corner radius
- Cards: 16px. Buttons: 12px. Chips/badges: full-pill (999px). Inputs: 8px.

### 16.5 Icons
Outline-style icon set (e.g., Lucide/Feather-equivalent) at 20–24px for list rows, 28–32px for nav/tab bar.

### 16.6 Elevation
Light theme: soft shadow, `rgba(15,23,42,0.08)`, y-offset 2–4px, blur 8–12px (replacing the current hard offset-shadow on non-brand elements). Dark theme: elevation via subtle surface-color lightening rather than shadow (shadows read poorly on dark backgrounds).

### 16.7 Animations
List item entrance: fade + slight translate-Y (150ms). FAB → modal: shared-element scale/fade (200ms). Chart bars: height animate-in on first render (300–400ms, staggered per bar). Tab switch: crossfade (150ms). Keep all motion under 400ms — this is a utility app, not a showcase.

### 16.8 Dark / light theme
Both required (Settings screen toggle, Section 15.6). Component tokens above are theme-aware; avoid hardcoded hex values in components as seen in current code (`Home.tsx` inlines colors directly in `StyleSheet.create`, not as tokens — recommend extracting to a theme file).

## 17. Dashboard Design Suggestions

- **Statistics cards:** "Total spent this month," "Total income" (target), "Net" — 3-up row on tablet, stacked/carousel on phone.
- **Income graph / Expense graph:** dual-line or stacked-bar monthly trend (target; needs the aggregation endpoint from Section 4.4/7).
- **Recent transactions:** last 5–10 with a "View all" link into the Transactions tab.
- **Budget progress:** horizontal progress bars per category, color shifts from `success` → `danger` as percent-of-budget increases (target; needs `budgets` table, Section 4.4).
- **Top categories:** ranked list with percentage-of-total and color-coded dot matching chart legend.
- **Monthly/weekly trend:** small sparkline in the summary card, full chart in Reports.
- **Calendar:** optional heat-map style calendar (denser color = higher spend day) — nice-to-have, not core.
- **Notifications:** bell icon in header (target — no notification system exists in any repo today; recommended as a future addition, Section 21).

## 18. Mobile UI Suggestions (Material Design 3, Android)

- **Bottom navigation:** 4–5 destinations (Dashboard, Transactions, Add [center, elevated FAB-style], Reports, Settings), M3 `NavigationBar` with pill-shaped active indicator.
- **Floating action button:** center-docked or bottom-right, primary-color fill, "+" icon, extends to "Add Expense"/"Add Income" via a small speed-dial or bottom sheet on tap.
- **Charts:** M3-compliant color roles (primary/secondary/tertiary containers) for chart series.
- **Cards:** `Card.Filled` (M3) with 16px radius, tonal surface color, no hard borders (departs from the current neo-brutalist black border for the main data cards).
- **Lists:** `ListItem` with leading icon/avatar, two-line text (merchant + category/time), trailing amount, M3 ripple on press.
- **Dialogs:** M3 basic dialog for delete-confirmation ("Delete this expense? This can't be undone" — Cancel/Delete, Delete in `danger` color).
- **Forms:** M3 outlined text fields with floating labels (cleaner than the current flat gray-background `TextInput` style).
- **Animations:** M3 standard easing/duration tokens (emphasized decelerate for entrances).

## 19. Web Dashboard Suggestions (target — no web client exists in the repos today; this is a forward-looking recommendation for a companion SaaS-style dashboard)

- **Sidebar:** persistent left nav — Dashboard, Transactions, Reports, Categories, Settings; collapsible on smaller viewports.
- **Header:** search bar, date-range picker, profile menu, notification bell.
- **Analytics:** larger-format charts than mobile (multi-series trend, category treemap or donut), filterable by account/category/date.
- **Settings/Profile:** same information architecture as mobile (Section 13), laid out as tabbed panels instead of a stacked list.
- **Reports:** exportable (PDF/CSV, Section 21) monthly statements.


## 20. Design Inspirations

| Inspiration | Why it fits this specific product |
|---|---|
| **Google Wallet** | Card-based transaction feed with clean iconography — matches the "recent transactions" list pattern this app already gestures toward with per-category emoji icons. |
| **Monzo** | Best-in-class automatic-categorization UX with easy manual override — directly relevant since this app's core bet (passive SMS capture) has the same "AI got it slightly wrong, let me fix it" interaction need. |
| **CRED** | Premium, high-contrast dark-mode-first fintech aesthetic popular in the same regional market this app's INR-default/SMS-pattern suggests it targets; good reference for a distinctive dark theme rather than a generic one. |
| **PhonePe** | Familiar regional UPI/spend-tracking mental model for the target user base; useful for category iconography and amount-formatting conventions (₹ symbol placement, lakh/crore-aware number formatting if relevant). |
| **Google Material 3** | Direct implementation target for the Android build (Section 18); provides the component and motion-token vocabulary. |
| **Stripe (dashboard)** | Reference for the *web* companion dashboard (Section 19) — clean data-density, restrained color use reserved for meaning (status, deltas) rather than decoration. |
| **Linear** | Reference for fast, keyboard/gesture-efficient interactions and a restrained, high-contrast light theme — useful if a power-user web dashboard is built later. |
| **Notion** | Reference for flexible, calm information density in the Reports/Settings areas. |
| **Vercel** | Reference for a minimal dark-mode default aesthetic if the web dashboard skews developer/prosumer. |
| **GitHub** | Reference for clear activity/history timelines — applicable to the Transactions history screen's chronological list pattern. |

## 21. Missing Features (recommended roadmap, none of these exist in code today)

| Feature | Rationale |
|---|---|
| Recurring expenses | Bills/subscriptions are a large share of spend; auto-log without needing a fresh SMS each time. |
| Budget goals | Directly needed for the Section 17 "Budget progress" UI; requires the `budgets` table (4.4). |
| AI insights | Natural extension of the existing LLM pipeline (`ds-services` already has LangChain wired up) — e.g., "You spent 30% more on food this month." |
| Receipt OCR | Complements SMS capture for cash/non-SMS transactions. |
| SMS detection (on-device) | Currently the repo has no on-device SMS listener — `ds-services`' endpoint expects the message to already be forwarded; an Android `SmsReceiver` module would need to be added to `expense-tracker-app`. |
| Bill reminders | Natural pairing with recurring expenses. |
| Export PDF / CSV | Needed for the Reports "exportable" suggestion (Section 19). |
| Notifications | No push infrastructure (FCM/APNs) exists in any repo; needed for budget-exceeded alerts, bill reminders. |
| Theme (dark/light) | Design tokens specified (Section 16); implementation (theme context/provider) doesn't exist in current mobile code. |
| Localization | Only English strings exist; currency defaulting to `inr` (Section 3.2/7) suggests a single-market MVP — i18n is a real gap if expanding markets. |

## 22. Security Improvements

1. **Remove the hardcoded JWT signing secret** from `JwtService` source; load from an environment variable/secrets manager instead.
2. **Fix the access-token lifetime.** 60 seconds (Section 6.3) is almost certainly a typo for a larger duration (e.g., 15–60 minutes) — as-is, it creates unnecessary refresh traffic and error surface.
3. **Enforce JWT validation on `expense-services` and `ds-services`.** Today only `Auth-Services` has any security dependency; the other two accept unauthenticated requests. Add a shared JWT-validation filter (or route all traffic through a gateway that validates centrally, Section 24).
4. **Stop trusting a client-supplied `userId`.** `expense-services`' `GET /expense/v1/?userId=...` lets any caller request any user's data by guessing/supplying an ID. Once JWTs are validated on this service, derive `userId` from the token, not the query string.
5. **Rotate refresh tokens on use** rather than reusing the same token indefinitely (`TokenController.refreshToken` currently returns the same token back — no rotation, no revocation of prior tokens on new login).
6. **Fix the inverted expiry check** in `RefreshTokenService.verifyExpiration()` (Section 3.1.1) — currently deletes/rejects tokens that are still valid.
7. **Remove hardcoded database credentials** from `Auth-Services`' `application.properties` (a literal DB host IP and username/password are committed to source control — unlike `expense-services`, which correctly uses `${MYSQL_HOST:...}` environment-variable defaults, `Auth-Services` hardcodes a real-looking IP and a placeholder password string directly). Move all three services to environment-variable-based configuration consistently.
8. **Enforce HTTPS** end-to-end; current configs and mobile `fetch` calls use plain `http://`.
9. **Add rate limiting** on `/auth/v1/login` and `/v1/ds/message` to prevent brute-force and LLM-cost abuse respectively.
10. **Add request validation** (`@Valid`/Bean Validation annotations) on all controller DTOs — none currently exist, so malformed payloads rely entirely on downstream NPEs/exceptions rather than clean 400s.
11. **CORS/CSRF:** currently both disabled in `SecurityConfig` (`csrf().disable()`, `cors().disable()`) — acceptable for a stateless, mobile-only API with no cookie-based sessions, but if a web dashboard (Section 19) is added, CORS must be explicitly (not blanket-) configured for the web origin.
12. **Secure headers** (HSTS, X-Content-Type-Options, X-Frame-Options) should be added once a gateway/reverse proxy is introduced (Section 24).

## 23. Performance Improvements

1. **Pagination** on `GET /expense/v1/` (currently returns the entire history in one response).
2. **Caching** of category/reference data on the mobile client (categories rarely change; avoid refetching every screen load once the categories endpoint exists).
3. **Lazy loading** of chart/report screens (don't fetch aggregation data until the Reports tab is opened).
4. **Database indexing:** add composite index on `expenses(user_id, created_at)` (Section 4.3) to support the already-defined-but-unused `findByUserIdAndCreatedAtBetween` query efficiently at scale.
5. **Async LLM extraction:** make `POST /v1/ds/message` respond immediately (202 Accepted) and perform the LangChain/LLM call in a background worker, publishing to Kafka when done — today the HTTP request blocks on an external LLM API call synchronously.
6. **Compression:** enable gzip on all three Spring Boot / Flask services for JSON responses.
7. **Image optimization:** not yet applicable (no user-uploaded images/receipts exist today), but relevant once Receipt OCR (Section 21) is added.

## 24. Deployment Architecture

**Current state:** `ds-services` has a `Dockerfile` (Python 3.11 base, installs from a pre-built `dist/*.tar.gz`, runs `flask run` on port 8010). `expense-services` and `Auth-Services` have no Dockerfile in the repo; both are Gradle projects with wrapper scripts only. `expense-tracker-app` has standard React Native Android/iOS build scaffolding, no CI config.

**Recommended target deployment:**
```
Internet
   │
   ▼
[Nginx / API Gateway]  ── TLS termination, routing, rate limiting
   │
   ├──► Auth-Services (Docker, Spring Boot, port 9898)
   ├──► expense-services (Docker, Spring Boot, port 9820)
   └──► ds-services (Docker, Flask, port 8010)
              │
              ▼
        [Kafka cluster] ──► expense-services consumer
   │
   ▼
[MySQL — authservice DB] [MySQL — expenseservice DB]  (managed instances, e.g. RDS/Cloud SQL)
```
- **Docker:** add Dockerfiles for `Auth-Services` and `expense-services` (multi-stage Gradle build → JRE runtime image), matching the pattern already used by `ds-services`.
- **CI/CD:** GitHub Actions per repo — build/test on PR, build+push image on merge to main, with environment-specific `application-{profile}.yml` (dev/staging/prod) instead of the hardcoded values currently in `application.properties`.
- **Cloud:** any container platform (ECS/Cloud Run/GKE) behind a managed load balancer; managed Kafka (MSK/Confluent Cloud) and managed MySQL recommended over self-hosted for this stage of the product.
- **Secrets:** move all hardcoded values (JWT secret, DB credentials, Mistral/OpenAI API keys — the latter is already correctly externalized via `.env`/`load_dotenv()`) into a secrets manager (AWS Secrets Manager, GCP Secret Manager, or at minimum CI/CD-injected environment variables).

## 25. Final UI Requirements (specification for an AI UI generator)

For each page below: purpose, components, states, and interaction notes needed to generate pixel-accurate screens consistent with Sections 15–18's design system.

### 25.1 Splash
- **Purpose:** brand moment + silent-auth check.
- **Components:** centered logo/wordmark, subtle loading indicator.
- **States:** loading only (auto-transitions to Login or Dashboard within ~1s or on auth-check completion).
- **Dark mode:** background flips to `background.dark`; logo should have a light-mode/dark-mode variant or be monochrome-adaptive.

### 25.2 Login
- **Purpose:** authenticate returning users.
- **Components:** username field, password field (with visibility toggle), primary button "Log In", secondary link "Sign Up", error banner region.
- **States:** default, loading (button spinner + disabled inputs), error (invalid credentials — generic message, per 5.1's non-specific 500 response), field-validation error (empty fields).
- **Forms/validation:** required fields; no format constraint on username beyond non-empty (backend has none either).
- **Interactions:** tapping "Log In" disables the button immediately to prevent double-submit (no idempotency handling exists server-side for login, though login is naturally idempotent; more relevant for Sign Up, see below).
- **Animations:** error banner slides down (150ms); button spinner fades in.
- **Responsive:** form max-width 400px, centered, on tablet/desktop.

### 25.3 Sign Up
- **Purpose:** new user registration.
- **Components:** first name, last name, username, email, password (+ strength hint), phone number, primary button "Create Account", secondary link back to Login.
- **States:** default, per-field validation error, loading, duplicate-username error (maps to the real `400 Already Exist` response), server error.
- **Forms/validation:** required: username, password; recommended client-side: email format, phone digits-only, password min-length 8 — none enforced server-side today, so client-side is the only real gate.
- **Interactions:** disable submit while request in flight (Sign Up is **not** idempotent server-side — a double-submit could attempt two signups; client must guard against this explicitly since the backend has no idempotency key).
- **Animations:** same as Login.

### 25.4 Dashboard / Home
- **Purpose:** at-a-glance spend overview and entry point to all other sections.
- **Components:** header (avatar, name, greeting, logout icon-button), summary card (total spend this period — live-bindable to `GET /expense/v1/` once fixed, summed client-side since no aggregation endpoint exists yet), category filter chips (target, requires categories), transaction list (icon/emoji per category, merchant, relative timestamp, amount right-aligned), chart card (bar chart of top categories or recent days), empty state, FAB.
- **States:** loading (skeleton cards), populated, empty (new user, zero expenses), error (API failure — retry button).
- **Tables:** none (list-based, not tabular, on mobile).
- **Charts:** bar chart bound to real amounts once the numeric-amount fix (Section 3.2.1) lands; until then, treat `amount` as a string requiring `parseFloat` client-side.
- **Interactions:** pull-to-refresh; tap a transaction row → Transaction Detail; tap FAB → Add Expense modal.
- **Animations:** list stagger-in, chart bars animate height on load.
- **Dark mode:** full token support per Section 16.

### 25.5 Add Expense / Add Income (target)
- **Purpose:** manual transaction entry (no backend endpoint yet — design as forward-compatible).
- **Components:** segmented control (Expense/Income), amount input (numeric keypad), merchant/source text input, category picker (Expense only), date picker (defaults to now), notes field, Save/Cancel.
- **States:** default, validation error (amount required and > 0), saving (spinner), success (toast + close), error (inline banner).
- **Forms/validation:** amount required numeric > 0; merchant optional; category optional but encouraged.
- **Interactions:** modal presentation (bottom sheet on mobile), swipe-down or Cancel to dismiss.

### 25.6 Transaction Detail (target)
- **Purpose:** view/edit/delete a single transaction.
- **Components:** large amount (editable inline or via edit mode), merchant, category, date, source badge ("Auto-detected" / "Manual"), notes, Save, Delete (destructive, confirmation dialog per Section 18).
- **States:** view mode, edit mode, deleting (confirmation), saved (toast).

### 25.7 Transactions / History (target)
- **Purpose:** full searchable/filterable expense history.
- **Components:** search bar, filter chips (date range, category, source), grouped-by-date list (sticky date headers), same row component as Dashboard.
- **States:** loading, populated, empty (no matches for filter), error.
- **Tables:** on web dashboard variant (Section 19), render as a real data table with sortable columns (date, merchant, category, amount).

### 25.8 Reports (target)
- **Purpose:** trends and category breakdowns.
- **Components:** period tabs (Week/Month/Year), trend chart (line or bar), category donut + legend with percentages, top-categories ranked list, export button (Section 21).
- **States:** loading, populated, empty (insufficient data for the selected period).
- **Charts:** donut chart uses `chart-accent-1..5` tokens (Section 16.1); trend chart uses `primary` for the main series.

### 25.9 Settings (target)
- **Purpose:** account and app preferences.
- **Components:** grouped list — Profile (name, email, phone — edit requires a not-yet-existing backend endpoint), Preferences (theme toggle, currency, notification toggles), Categories (manage list), Security (change password — no backend endpoint exists today), About, Logout.
- **States:** default, saving-preference (inline spinner per row), logout-confirmation dialog.
- **Interactions:** theme toggle applies immediately (optimistic, local-only state until a backend preferences endpoint exists).

---

## Appendix A — Summary of code-level defects to fix before/alongside UI implementation

1. `JwtService` — access token expiry is 60 seconds (likely should be much longer).
2. `RefreshToken.userInfo` — incorrect `@JoinColumn` mapping (`id` should be `user_id`).
3. `RefreshTokenService.verifyExpiration()` — inverted conditional (rejects valid tokens).
4. `ExpenseController.getExpenses()` — uses `@PathParam` instead of `@RequestParam`, likely non-functional.
5. `ds-services` `__init__.py` — calls `result.serialize()` before the `None` check, will throw instead of returning a clean 400.
6. `ds-services` `Expense` model — missing `user_id`, breaking multi-tenant attribution end-to-end.
7. Mobile `SignUp.tsx` — field names sent (camelCase) don't match backend `UserInfoDto` (snake_case via Jackson naming) or its actual declared fields.
8. Mobile app — hardcoded/inconsistent base URLs (`localhost` vs. a LAN IP) across screens.
9. `Auth-Services` `application.properties` — hardcoded DB host/credentials committed to source control.
10. `expense-services` `Expense.amount` / `ExpenseDto.amount` — stored/transmitted as `String`, should be a numeric/decimal type.

## Appendix B — Document scope statement

This specification was produced by reading every source file in all four repositories listed in the request (`expense-services`, `expense-tracker-app`, `ds-services`, `Auth-Services`) as of the latest commit available at analysis time. Every AS-IS claim in this document is traceable to a specific file and class/function named inline. TO-BE recommendations are clearly labeled as such throughout and are proposals for the next iteration of the product, not descriptions of existing functionality.

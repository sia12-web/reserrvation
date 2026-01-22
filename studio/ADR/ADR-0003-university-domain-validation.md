# ADR-0003: University Domain Validation

## Status
Accepted

## Context
ClassmateFinder is exclusively for university students. To maintain community integrity:
- Only legitimate university students should register
- .edu domains are the standard for US/Canadian universities
- International universities may have different TLDs (.ac.uk, .edu.au, etc.)

## Decision
We will restrict registration to university email domains only, with a configurable allowlist.

### Implementation Details

**Validation Rules:**

1. **Primary Rule:** Must end in `.edu` OR match allowlist pattern
2. **Allowlist Configuration:**
```typescript
// src/config/env.ts
UNIVERSITY_DOMAINS: z.string().transform((val) => val.split(','))
  .default('.edu,.ac.uk,.edu.au,.edu.sg')

// Usage
const isValidDomain = UNIVERSITY_DOMAINS.some(domain =>
  email.endsWith(domain.trim())
)
```

3. **API Validation:**
```typescript
// src/controllers/auth.controller.ts
const emailSchema = z.string().email()
  .refine((email) => isValidUniversityDomain(email), {
    message: 'Must use a university email address (.edu or approved domain)'
  })
```

4. **Error Messaging:**
```json
{
  "error": "Invalid email domain",
  "message": "ClassmateFinder requires a university email address. Please use your .edu or approved university email."
}
```

**Database Schema:**
```prisma
model User {
  email    String @unique
  // Email is stored as-is; domain validated at registration time
}
```

**Allowlist Management:**
- Environment variable for flexibility
- Documented in README
- Admin interface for runtime updates (future)

### Alternatives Considered

**.edu Only:**
- ✅ Simple, no configuration
- ❌ Excludes international students (.ac.uk, .edu.au, etc.)
- ❌ Excludes some US universities using .org domains

**Allowlist Only:**
- ✅ Supports international students
- ❌ Requires maintenance
- ❌ May miss new university domains

**Denylist (Block Common Domains):**
- ❌ Impossible to maintain (gmail.com, outlook.com, etc.)
- ❌ New domains appear constantly
- ❌ Reverse approach is impractical

**No Restriction:**
- ❌ Defeats purpose of ClassmateFinder
- ❌ Community becomes non-university users
- ❌ Spammers easily create accounts

### Consequences

**Positive:**
- ✅ Ensures community is university students
- ✅ Reduces spam/fake accounts
- ✅ Aligns with product vision
- ✅ Supports international students via allowlist
- ✅ Configurable without code changes

**Negative:**
- ❌ Some users may not have university emails
- ❌ Allowlist requires maintenance
- ❌ May exclude some legitimate edge cases
- ❌ Cannot easily test without .edu emails

**Mitigations:**
- Development mode: disable domain validation via `NODE_ENV=test`
- Comprehensive allowlist: include common international patterns
- Clear error messages: explain why and provide help link
- Exception process: admin can create accounts manually (Phase 3)
- Feedback loop: users can request domain additions

## Implementation
- [x] Add UNIVERSITY_DOMAINS to env schema
- [x] Create domain validation utility in `src/utils/validation.ts`
- [x] Add validation to registration endpoint
- [x] Add clear error messages
- [x] Document in README
- [ ] Add admin interface for allowlist management (Phase 3)
- [ ] Add analytics on rejected domains (future)

## International University Domains

Common patterns to include in default allowlist:
- `.edu` - US/Canada universities
- `.ac.uk` - United Kingdom
- `.edu.au` - Australia
- `.edu.sg` - Singapore
- `.ac.in` - India
- `.ac.jp` - Japan
- `.edu.hk` - Hong Kong

## References
- [List of University Email Domains](https://github.com/leereilly/swot)

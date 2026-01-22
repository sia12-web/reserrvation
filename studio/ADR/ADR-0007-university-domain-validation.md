# ADR-0007: University Domain Validation

## Status
Accepted

## Context
ClassmateFinder targets Canadian university students. We need to:
- Validate that email addresses are from recognized Canadian universities
- Allow international students (.edu domains)
- Prevent user enumeration in error messages
- Provide maintainable domain list

## Decision

### Validation Method: Configurable Allowlist

**Implementation:** Environment variable with comma-separated domain patterns

**Environment Variable:**
```typescript
// src/config/env.ts
UNIVERSITY_DOMAINS: z.string().transform((val) => val.split(',').map(d => d.trim()))
  .default('.edu,.ualberta.ca,.ubc.ca,.utoronto.ca,.mcgill.ca,.uwaterloo.ca,.uottawa.ca')
```

### Canadian University Domains

**Primary Pattern:** Specific university subdomains (not wildcard `.ca`)

**Rationale:**
- Wildcard `.ca` is too broad (includes non-university .ca domains)
- Specific subdomains are precise and maintainable
- Allowlist can be expanded without code changes

**Default Allowlist (Phase 1):**

**Major Canadian Universities:**
- `ualberta.ca` - University of Alberta
- `ubc.ca` - University of British Columbia
- `utoronto.ca` - University of Toronto
- `mcgill.ca` - McGill University
- `uwaterloo.ca` - University of Waterloo
- `uottawa.ca` - University of Ottawa
- `queensu.ca` - Queen's University
- `umanitoba.ca` - University of Manitoba
- `usask.ca` - University of Saskatchewan
- `dal.ca` - Dalhousie University

**US/International (Still Accepted):**
- `.edu` - All US/Canadian .edu domains

**Implementation:**
```typescript
// src/utils/domainValidator.ts
const UNIVERSITY_DOMAINS = env.UNIVERSITY_DOMAINS;

export function isValidUniversityDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    return false;
  }

  return UNIVERSITY_DOMAINS.some(allowed => {
    if (allowed.startsWith('.')) {
      return domain.endsWith(allowed);
    } else {
      return domain === allowed || domain.endsWith(`.${allowed}`);
    }
  });
}
```

### Fallback Strategy

**If Domain Not in Allowlist:**
- Reject registration with generic error message
- Do NOT reveal whether domain is unsupported or if email already exists

**Error Response:**
```json
{
  "code": "DOMAIN_NOT_ALLOWED",
  "message": "Please use a university email address to register",
  "details": {
    "hint": "Accepted domains include .edu and major Canadian universities"
  }
}
```

**Never reveal:** "Email already registered" or "Domain not in our list"

### Validation Location

**Implementation:** `src/utils/domainValidator.ts`

**Usage:**
```typescript
import { isValidUniversityDomain } from '../utils/domainValidator';

export const register = async (req, res) => {
  const { email } = req.body;

  if (!isValidUniversityDomain(email)) {
    return res.status(400).json({
      code: 'DOMAIN_NOT_ALLOWED',
      message: 'Please use a university email address'
    });
  }

  // Continue with registration...
};
```

## Phase 2 Implementation Plan

**Phase 1:**
- Create `src/utils/domainValidator.ts`
- Add `UNIVERSITY_DOMAINS` to `src/config/env.ts`
- Use validator in `auth.controller.ts`

**Phase 2+:**
- Admin interface for allowlist management
- Request mechanism for users to suggest new domains

## References
- Related: ADR-0002 (Email Verification), ADR-0003 (University Domain Validation)
- Data: [List of Canadian Universities](https://www.uac.ca.ca/members/)

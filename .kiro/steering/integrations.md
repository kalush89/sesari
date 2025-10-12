# 🔌 Integration Steering — Sesari

## Core MVP Integrations
| Provider | Purpose | Type |
|-----------|----------|------|
| **Stripe** | Revenue, MRR, churn KPIs | Financial |
| **Google Analytics** | Web traffic + conversion KPIs | Marketing |
| **Google Sheets** | Custom manual KPIs | Productivity |
| **Notion** | Goal data and notes sync | Productivity |
| **CSV Upload** | Offline metric imports | Utility |

---

## Future Integrations
| Provider | Purpose | ETA |
|-----------|----------|------|
| **Meta Ads** | Facebook + Instagram ad metrics | Post-MVP |
| **Twitter/X Ads** | Campaign tracking | Post-MVP |
| **LinkedIn Ads** | B2B growth metrics | Post-MVP |

---

## Integration Architecture
Each adapter must export:
```ts
connect()
sync()
transform()
store()

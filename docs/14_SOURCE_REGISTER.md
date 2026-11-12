# 14 — Source register and verified/current technology notes

This package's public assertions were checked on **12 November 2026**. Live figures and SDK APIs must be rechecked before public submissions and software implementation. These links are **research/documentation** sources, not permission to access provider APIs.

## Market context (do not overclaim)

1. **NPCI official UPI statistics**: October 2026 `25,466.70 million` transactions ≈ **25.47 billion UPI transactions** across India, **not** Paytm-only transactions. https://www.npci.org.in/product/upi/product-statistics?financialYear=2026-27
2. **Paytm Q2 FY27 official result communication**: reported **1.64 crore subscription-plan merchants**, quarter ending September 2026; do not infer LEAP's access, TAM or conversion from this number. https://paytm.com/blog/investor-relations/paytm-q2-fy27-results-pat-225-crore-ebitda-rises-90-to-270-crore/
3. **Paytm IR financial results**: https://ir.paytm.com/financial-results
4. **Paytm for Business existing products:** https://business.paytm.com/ and https://business.paytm.com/support
5. **Paytm developer docs (product-specific permissions):** https://business.paytm.com/docs/ ; https://business.paytm.com/blog/paytm-payment-gateway-settlements-why-wait-for-days-when-you-can-get-payments-settled-daily/
6. Paytm itself reports AI-driven merchant growth, CFO/CMO-style capabilities and enterprise AI initiatives in 2026. **Differentiation should not claim that Paytm has no merchant AI.** LEAP's proposed novel focus is the *consented unrecorded demand ledger tied to merchant approvals and verified realized margin*. No claim that this concept is first in the entire market.

## Claude Code skill file specifications

- Project skill folders: `https://code.claude.com/docs/en/skills`
- Persistent project instructions: `https://code.claude.com/docs/en/memory`
- Anthropic skill authoring reference: `https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview`
- Skills must be in `.claude/skills/<skill-name>/SKILL.md`, use YAML frontmatter `name` and `description`; keep each independent and task-specific.

## Official engineering documentation

- Next.js App Router: https://nextjs.org/docs/app
- Next.js security: https://nextjs.org/docs/app/guides/data-security
- FastAPI: https://fastapi.tiangolo.com/
- Pydantic: https://docs.pydantic.dev/latest/
- SQLAlchemy: https://docs.sqlalchemy.org/en/20/
- Alembic: https://alembic.sqlalchemy.org/
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- PostgreSQL: https://www.postgresql.org/docs/current/
- pgvector: https://github.com/pgvector/pgvector
- LangGraph interrupts / human approval: https://docs.langchain.com/oss/python/langgraph/interrupts
- Sarvam speech-to-text language codes: https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/how-to/specify-language-codes
- Anthropic API: https://docs.anthropic.com/
- Hugging Face: https://huggingface.co/docs
- Blender: https://docs.blender.org/manual/en/latest/
- Three.js: https://threejs.org/docs/
- React Three Fiber: https://r3f.docs.pmnd.rs/
- Unity: https://docs.unity3d.com/
- Tailwind: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/docs
- Playwright: https://playwright.dev/docs/intro
- GitHub Actions: https://docs.github.com/en/actions
- Sentry: https://docs.sentry.io/
- OpenTelemetry: https://opentelemetry.io/docs/

## Research honesty rules

- **Verified public fact** is a dated source assertion, not a feature implementation or target.
- **Product proposal** is a planned design, not traction.
- **Illustrative calculations** must state assumptions and arithmetic definitions.
- **Real performance claims** require dated internal reports and methodology.
- **Provider integration** requires official documentation *plus permissioned credentials*; public docs alone are not access rights.
- **Legal compliance** requires a date-appropriate review, not a generic claim.

## Important accounting correction

Older pitch-style examples may use ₹138 from 16×₹22 purchased and 14×₹35 sold as "gross trial result." In application UI and finance engine, **₹138 is purchase-outlay-adjusted cash difference**, not gross profit of units sold (₹182). Distinguish them explicitly in any updated deck and actual product.

# Preflight test helpers – ENV config

Required:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Optional (to exercise RLS as a real user):
- TEST_AUTH_EMAIL
- TEST_AUTH_PASSWORD
- TEST_ORG_ID (to scope queries)

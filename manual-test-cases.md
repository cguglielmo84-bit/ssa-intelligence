# Manual Test Cases

> Tests that require live execution (actual LLM calls, API interactions) and cannot be verified through code reading alone.

---

## LLM-013: Company Resolution - Exact Match

**Test:** Input "Apple" should return `status=exact` with suggestion for Apple Inc.

### Steps
1. Start the backend server locally (`npm run dev` from `backend/`)
2. Ensure `ANTHROPIC_API_KEY` is set in environment
3. Send POST request:
```bash
curl -X POST http://localhost:3001/api/company/resolve \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-User: test-user" \
  -H "X-Forwarded-Email: test@example.com" \
  -d '{"input": "Apple"}'
```
4. Verify response:
   - `status` should be `"exact"`
   - `suggestions` array should contain at least 1 entry
   - First suggestion `canonicalName` should contain "Apple Inc"
   - `confidence` should be > 0.8
   - `suggestions[0].matchScore` should be > 0.9

### Expected Response Shape
```json
{
  "status": "exact",
  "input": "Apple",
  "suggestions": [
    {
      "canonicalName": "Apple Inc.",
      "displayName": "Apple",
      "description": "...",
      "domain": "apple.com",
      "industry": "Technology",
      "matchScore": 0.95
    }
  ],
  "confidence": 0.95
}
```

### What to Watch For
- The response is driven by Claude's LLM output, so exact values will vary
- Check that the status is `exact` (not `ambiguous` or `corrected`)
- Ensure only one suggestion is returned for an exact match

---

## LLM-014: Company Resolution - Ambiguous Match

**Test:** Input "Apollo" should return `status=ambiguous` with multiple suggestions.

### Steps
1. Same server setup as LLM-013
2. Send POST request:
```bash
curl -X POST http://localhost:3001/api/company/resolve \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-User: test-user" \
  -H "X-Forwarded-Email: test@example.com" \
  -d '{"input": "Apollo"}'
```
3. Verify response:
   - `status` should be `"ambiguous"`
   - `suggestions` array should contain 2+ entries
   - Suggestions should include entities like: Apollo Global Management, Apollo Hospitals, Apollo GraphQL, etc.
   - `confidence` should be < 0.7 (ambiguous = low confidence)

### Expected Response Shape
```json
{
  "status": "ambiguous",
  "input": "Apollo",
  "suggestions": [
    { "canonicalName": "Apollo Global Management, Inc.", ... },
    { "canonicalName": "Apollo Hospitals Enterprise Limited", ... },
    { "canonicalName": "Apollo GraphQL", ... }
  ],
  "confidence": 0.3
}
```

### What to Watch For
- Multiple distinct companies should be suggested
- Each suggestion should have a meaningful description to help disambiguate
- `matchScore` values should reflect how well "Apollo" matches each entity

---

## LLM-015: News Layer 2 - Web Search

**Test:** Verify Claude web_search tool returns news articles for companies.

### Steps
1. Ensure `ANTHROPIC_API_KEY` is set
2. The test exercises `fetchLayer2Contextual` in `news-fetcher.ts`
3. This is called through the news refresh endpoint:
```bash
curl -X POST http://localhost:3001/api/news/refresh \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-User: test-user" \
  -H "X-Forwarded-Email: test@example.com"
```
4. Alternatively, test the ad-hoc search:
```bash
curl -X POST http://localhost:3001/api/news/search \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-User: test-user" \
  -H "X-Forwarded-Email: test@example.com" \
  -d '{"company": "Microsoft", "days": 1}'
```
5. Verify response contains:
   - `articles` array with `sourceUrl` fields
   - Articles have `fetchLayer: "layer2_llm"` (for search endpoint)
   - Articles are from the specified time period

### Prerequisites
- At least one revenue owner with tracked companies must exist in the DB (for refresh endpoint)
- The `web_search_20250305` tool must be enabled on the Anthropic API key

### What to Watch For
- Web search may return 0 results if no recent news exists
- Circuit breaker may be open from previous failures
- Response should have valid JSON structure even if no articles found

---

## LLM-016: News Dedup - LLM Semantic

**Test:** Verify LLM-based deduplication reduces duplicate articles.

### Steps
1. This requires a news refresh with enough articles to trigger dedup (>5 articles)
2. Set up multiple tracked companies with overlapping news
3. Trigger refresh via API
4. Check server logs for:
   - `[llm-dedup] Sending X articles for LLM deduplication...`
   - `[llm-dedup] Reduced X -> Y articles (removed Z duplicates)`
5. Verify the final article count is less than or equal to the input count

### What to Watch For
- Dedup only triggers when article count > 5 (line 715 of news-fetcher.ts)
- LLM dedup errors fall back to returning original articles (line 821)
- Check that the `uniqueArticles` and `standalone` arrays in the LLM response are valid

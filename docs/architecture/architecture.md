# HealthScope — Architecture & Design (WADe)

Tags: project, infoiasi, wade, web

## 1. Overview

HealthScope is a service‑oriented web application that helps users explore medical conditions using Linked Data sources:
- Wikidata (SPARQL + MediaWiki API)
- DBpedia (SPARQL)
- WikiDoc (HTML pages parsed for narrative sections)

The system aggregates heterogeneous data, normalizes it, and serves it through a REST API to an Angular client.

> Educational project; not medical advice. “Geo context” is a proxy model intended for UI explanations.

---

## 2. Architecture Style

**Style:** Service‑oriented, 2‑tier web app (Client + API), with external knowledge sources.  
**Key qualities:**
- Traceability: responses include source links
- Resilience: best‑effort aggregation; missing fields are returned as empty lists/nulls (stable schema)
- Modularity: source-specific adapters (Wikidata/DBpedia/WikiDoc) are isolated

---

## 3. C4 Model

### 3.1 C1 — System Context

```mermaid
flowchart LR
  U[End User] -->|Search / view condition| FE[HealthScope Frontend (Angular)]
  FE -->|REST calls| BE[HealthScope Backend (NestJS)]
  BE --> WD[(Wikidata)]
  BE --> DB[(DBpedia)]
  BE --> WK[(WikiDoc)]
```
### 3.2 C2 - Container Diagram 
```mermaid
flowchart TB
  U[User] --> FE[Angular SPA]
  FE -->|HTTP/JSON| API[NestJS REST API]

  subgraph External Knowledge Sources
    WD[(Wikidata SPARQL + wbgetentities)]
    DB[(DBpedia SPARQL)]
    WK[(WikiDoc HTML)]
  end

  API --> WD
  API --> DB
  API --> WK
  ```
### 3.3 C3 — Component Diagram (Backend)
```mermaid
flowchart TB
  subgraph NestJS Backend
    C[ConditionsController]
    S[ConditionsService (Aggregator)]
    WDS[WikidataService]
    DBS[DbpediaService]
    WKS[WikidocService]
  end

  C --> S
  S --> WDS
  S --> DBS
  S --> WKS
```

## 4. Main Modules
#### Frontend (Angular)
Home/Search Page
- captures query and calls /api/conditions/search
- renders results with source-aware IDs (Q-ids)
- Condition Details Page
- calls /api/conditions/{id}
- shows tabs: overview / symptoms / risk factors / prevention / body systems / geography (proxy)

#### Frontend Implementation Details

The Angular frontend is implemented as a small SPA that directly consumes the REST API exposed by the NestJS
backend. Key client-side artifacts and how they map to API calls are listed below:

- Service: [client/mead/src/app/services/conditions-api.service.ts](client/mead/src/app/services/conditions-api.service.ts)
  - Exposes `search(q)`, `getCondition(id)` and `getGeo(id, country)`; it uses `environment.apiBaseUrl` as the HTTP
    base and appends the backend path (e.g. `/api/conditions/search`). The service adds a cache-busting `_t` query
    parameter during development to avoid aggressive browser caching.
- Environment: [client/mead/src/environments/environment.ts](client/mead/src/environments/environment.ts)
  - Contains `apiBaseUrl` (defaults to `http://localhost:3000` for local development).
- Pages / Components:
  - Search / Home: [client/mead/src/app/pages/home/home.ts](client/mead/src/app/pages/home/home.ts) — captures user input and
    calls `ConditionsApiService.search(q)` to retrieve `ConditionSearchItem[]` results. Results are rendered with
    clickable links that navigate to the details route using the returned Q-ID.
  - Condition details: [client/mead/src/app/pages/condition/condition.ts](client/mead/src/app/pages/condition/condition.ts) — on
    route activation it calls `ConditionsApiService.getCondition(id)` to obtain the normalized `Condition` object. It
    may also call `getGeo(id, country)` when a geo view is requested.

Example (conceptual) usage in a component:

```ts
// home.ts (conceptual)
this.conditionsApi.search(query).subscribe(items => {
  this.results = items; // each item: {id, label, description}
});

// condition.ts (conceptual)
this.conditionsApi.getCondition(qid).subscribe(condition => {
  this.condition = condition; // normalized payload directly renderable in the UI
});

this.conditionsApi.getGeo(qid, 'RO').subscribe(geo => {
  this.geo = geo; // proxy geo context shown in a map or panel
});
```

UI notes relevant to the API contract:

- The client expects arrays to always be arrays (even if empty) and nullable narrative fields (overview) to be `null` when
  absent; the UI shows a friendly “No data available yet” message for empty sections.
- The server returns `sources` with `name` and `url`; the UI renders these as clickable links when `url` is present.
- For development, the service appends a `_t` timestamp query parameter to avoid cache interference. In production, the
  API base URL is set in `environment.ts` and CORS should be configured accordingly on the server.

#### Backend (NestJS)
- ConditionsController
- REST endpoints under /api/conditions
- ConditionsService
- orchestrates aggregation and normalization
- merges narrative + structured data
- ensures stable schema for FE

### WikidataService

- SPARQL search

- entity details via wbgetentities

- extracts claims (symptoms, risk factors, anatomical context)

### DbpediaService

- finds owl:sameAs link to Wikidata entity
- extracts English abstract/comment

### WikidocService
- best-effort retrieval of narrative sections (overview, prevention list)

## 5. Data Flow
### 5.1 Search Flow
- User enters query in frontend

- Frontend calls:
```
GET /api/conditions/search?q=<query>
```
- Backend runs Wikidata SPARQL search (ranked)
- Backend returns list of items:

``` 
{ id: "Q...", label: "...", description: "..." }
```
- Frontend renders results and links to /condition/:id

### 5.2 Condition Details Aggregation Flow
- Frontend calls:
``` 
GET /api/conditions/{id}
``` 
Backend:

- fetches Wikidata details (labels, descriptions, claims)

- fetches DBpedia abstract/comment (best-effort)

- fetches WikiDoc narrative sections (best-effort, based on condition name)

- Aggregator merges results:

- overview: WikiDoc overview OR DBpedia abstract OR null

- prevention: WikiDoc list OR empty list

- symptoms/risk/body: Wikidata claims (may be empty)

- Response contains stable schema + source links

## 6. Input/Output Data Formats
### 6.1 Search Response (example shape)
``` 
[
  { "id": "Q35869", "label": "Asthma", "description": "..." }
]
``` 
### 6.2 Condition Details Response (example shape)
``` 
{
  "id": "Q35869",
  "name": "Asthma",
  "description": "...",
  "sections": {
    "overview": "... or null",
    "symptoms": [],
    "riskFactors": [],
    "prevention": []
  },
  "bodySystems": [{ "id": "Q...", "label": "..." }],
  "sources": [{ "name": "Wikidata", "url": "..." }]
}
``` 
### 6.3 Geo Context Response (proxy model)
``` 
{
  "id": "Q35869",
  "country": "RO",
  "value": 0.6,
  "valueLabel": "Estimated risk context (proxy)",
  "factors": ["Climate", "Population density"],
  "sources": [{ "name": "Educational proxy", "url": null }]
}
``` 
## 7. Design Considerations for End Users
- The UI always shows source links (Wikidata/DBpedia/WikiDoc) to support transparency.
- The UI handles sparse Linked Data entities gracefully (empty arrays/nulls).
- The UI avoids presenting proxies as facts: geo context is labeled clearly as “proxy”.

## 8. Reliability & Error Handling
- External sources are best-effort; failures degrade gracefully.
- Backend returns stable JSON schema even when sources return partial data.

- Input validation:

        search query length ≥ 2

        IDs follow Q\\d+



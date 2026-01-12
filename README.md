# HealthScope (WADe)

HealthScope is a web application that helps users explore medical conditions using Linked Open Data sources (Wikidata, DBpedia) and narrative medical text (WikiDoc). It offers:
- Condition search (Wikidata)
- Condition detail page (aggregation + normalization)
- Overview / symptoms / risk factors / prevention / body systems
- Geography context (proxy factors, educational)

> Educational project. Not medical advice.

## Tech Stack
- Frontend: Angular (standalone + router)
- Backend: NestJS (REST API)
- External sources: Wikidata (SPARQL + wbgetentities), DBpedia (SPARQL), WikiDoc (HTML parsing)

## Features
- Search conditions by name (Wikidata)
- Aggregate condition info from multiple sources
- Display sources and links (traceability)
- Resilient to sparse Linked Data entities

## Quick Start

### Backend (NestJS)
```bash
cd server
npm install
npm run start:dev

### Frontend (Angular 20)
```bash
cd client
cd mead
npm install
ng serve

Frontend: http://localhost:4200
Backend: http://localhost:3000



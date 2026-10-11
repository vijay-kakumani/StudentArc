# StudentArc - Architecture

```mermaid
flowchart TD
    subgraph Frontend [React Application]
        UI[Minimalist UI]
        Context[FilterContext]
        APIClient[API Client & Cache]
        
        UI <--> Context
        UI <--> APIClient
    end
    
    subgraph Backend [Flask REST API]
        Router[API Blueprints]
        Import[Data Import & Validation]
        Scoring[Scoring Engine]
        DataSvc[Data Service & Pagination]
        
        Router --> Import
        Router --> DataSvc
        DataSvc --> Scoring
    end
    
    subgraph Database [Supabase PostgreSQL]
        RawStudents[(raw_students_csv)]
        RawIndicators[(raw_indicators_csv)]
    end
    
    APIClient <--> |HTTP/JSON| Router
    Import --> |Batch Insert| RawStudents
    DataSvc <--> |PostgREST API| RawStudents
    DataSvc <--> |PostgREST API| RawIndicators
```

## Data Flow
1. **Import:** `CampusPulse_Combined_Master.csv` (source institutional dataset) is uploaded via React. Flask drops legacy columns, checks for duplicates and nulls, and streams insertion to Supabase.
2. **Analysis:** When the Dashboard mounts, Flask's `DataService` fetches all records (paginating past 1000-row limits).
3. **Scoring:** Missing indicators are dropped dynamically from denominators (preventing unfair 0-scores). Duplicate indicator observations are deduplicated. Success, Academic, and Placement scores are computed on the fly.
4. **Presentation:** The frontend renders strict, black-and-white React/Recharts visualizations. Users interact by clicking charts to filter context globally, drilling down into individual `StudentProfiles`.

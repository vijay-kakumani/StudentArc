# StudentArc - Scoring Methodology

The Student Success Score is an explainable, deterministic metric designed for real-world institutional data quality, where indicators are frequently missing or duplicated.

## 1. Overall Student Success Score
The final Success Score is a weighted average of two primary dimensions:
- **Academic Performance (65%)**
- **Learning Engagement (35%)**

### Handling Missing Data
If any sub-indicator is missing, its weight is completely removed from the denominator rather than treating the missing value as zero. This ensures a student is only scored on the available evidence. If an entire dimension is missing, the Overall Score relies on the remaining dimension.

## 2. Academic Performance (0-100)
Calculated from core university outcomes:
- **CGPA (70% weight):** Normalized to a 100-point scale (e.g., 8.5/10.0 = 85).
- **Backlog Count (30% weight):** Standardized using `Max(0, 100 - (25 * backlogs))`. A clean record gives 100, while 4 backlogs result in 0.

## 3. Learning Engagement (0-100)
A composite of digital and physical presence:
- **Attendance Rate (35%)**
- **Assignment Completion Rate (30%)**
- **LMS Activity Score (20%)**
- **General Engagement Score (15%)**

## 4. Placement Readiness (0-100)
Calculated independently of the main Success Score, as a student can be academically brilliant but unprepared for corporate placement:
- **Coding Assessment (30%)**
- **Aptitude Assessment (25%)**
- **Mock Interview Score (25%)**
- **Technical Skills (10%)**
- **Soft Skills (10%)**

## Risk Flags
Rule-based flags trigger automatically when specific thresholds are breached. They are presented as *support recommendations*, not failure predictions:
- **Academic Flag:** Triggers if Academic Score < 60. Recommendation: Academic advising.
- **Placement Flag:** Triggers if Placement Score < 60. Recommendation: Mock interviews and resume reviews.

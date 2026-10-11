# StudentArc - Demo Script (3 Minutes)

**[0:00 - 0:30] Introduction & Problem**
"Welcome to StudentArc. Institutions struggle to identify at-risk students because data is scattered across attendance systems, LMS platforms, and academic records. Our solution unifies this data into a single, explainable metric: The Student Success Score. Let's see it in action."

**[0:30 - 1:00] Data Import & Validation**
*(Navigate to Data Hub)*
"We'll start by importing our institutional CSV. The system immediately previews the file without persisting it to the database. It drops legacy columns, flags missing indicators (like missing CGPAs), and warns us of duplicate student IDs. We confirm the import, and it streams securely into our Supabase PostgreSQL instance."

**[1:00 - 1:45] Dashboard & Insights**
*(Navigate to Dashboard)*
"Our dashboard is intentionally minimalist and black-and-white to keep focus strictly on the data. At a glance, we see our average Success Score and data completeness. 
Let's look at the 'Attendance and Learning Activity' chart. It clearly shows LMS usage. 
Notice the 'Average Success Score by Semester Cohort' — we've avoided line charts here because these are different students, not longitudinal tracking.
All these metrics are calculated in real-time by the Flask backend; missing values are correctly weighted out rather than penalized as zeroes."

**[1:45 - 2:30] Interactive Segmentation & Drill-down**
"A key feature is our segmentation. By clicking on the 'Academic Risk' band in our distribution chart, the system globally filters our view and takes us to the Student Directory, showing only students needing academic support."

*(Click on a Student Profile)*
"Here is a specific student profile. We don't just show a low score; we explain *why*. This student was flagged because their Academic Progress is below 60. We can see they have 2 backlogs. The system also recommends actionable support: 'Schedule tutoring or academic advising.' Furthermore, it transparently states if any data, like Aptitude Score, is missing."

**[2:30 - 3:00] Conclusion & What-If**
"Because our scoring engine is rule-based, we can even simulate what-if scenarios — if this student clears those backlogs, our engine proves their success score immediately recovers. StudentArc isn't a black box; it's an actionable, verifiable intelligence platform for student success. Thank you."

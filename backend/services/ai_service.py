import os
import json
import logging

logger = logging.getLogger(__name__)

# Default request timeout and retry bounds to prevent worker blocking
DEFAULT_TIMEOUT_MS = 6000  # 6 seconds: well below Gunicorn's default 30s worker timeout
DEFAULT_MAX_ATTEMPTS = 1   # 1 attempt (0 additional retries) to fail fast on 429/quota exhaustion

class AIBriefService:
    @staticmethod
    def generate_brief(student_data: dict) -> dict:
        """
        Generates an AI brief based on the student's data.
        Returns a dict with 'explanation', 'status' (ai_generated or fallback), and 'error' if any.
        """
        api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        
        # Rule-based fallback if no AI provider is configured
        if not api_key:
            return AIBriefService._generate_fallback_brief(student_data, reason="AI provider not configured")
            
        try:
            return AIBriefService._call_llm(student_data, api_key)
        except Exception as e:
            error_str = str(e)
            if "rate limit" in error_str.lower() or "quota" in error_str.lower() or "429" in error_str or "resource_exhausted" in error_str.lower() or "temporaryerror" in type(e).__name__.lower():
                reason = "AI provider rate-limited (429 / quota limit)"
                error_msg = "Rate limit exceeded or billing issue."
            elif "timed out" in error_str.lower() or "timeout" in error_str.lower() or "timeouterror" in type(e).__name__.lower():
                reason = "AI provider request timed out"
                error_msg = "Request timed out connecting to AI provider."
            elif "invalid api key" in error_str.lower() or "authentication" in error_str.lower() or "api key not valid" in error_str.lower():
                reason = "AI provider authentication failed"
                error_msg = "Invalid API key configured."
            else:
                reason = "AI provider temporarily unavailable"
                error_msg = error_str
            fallback = AIBriefService._generate_fallback_brief(student_data, reason=reason)
            fallback['error'] = f"AI Provider failed: {error_msg}"
            return fallback

    @staticmethod
    def _generate_fallback_brief(student: dict, reason: str = None) -> dict:
        score = student.get('success_score')
        acad = student.get('academic_score')
        place = student.get('placement_score')
        raw = student.get('raw_data', {}) or {}
        name = student.get('name', 'Unknown')
        cgpa = raw.get('cgpa')
        backlogs = raw.get('backlog_count')
        attendance = student.get('attendance_rate')
        if attendance is None:
            attendance = raw.get('overall_attendance_percentage')
        missing_fields = []
        if cgpa is None:
            missing_fields.append("CGPA")
        if backlogs is None:
            missing_fields.append("Backlogs")
        if attendance is None:
            missing_fields.append("Attendance")
        reason_label = f" ({reason})" if reason else " (AI provider not configured)"
        brief = f"This is a rule-based explanation{reason_label}.\n\n"
        brief += f"Student {name} has an overall success score of {round(score, 1) if score is not None else 'N/A'}.\n"
        cgpa_display = f"{round(float(cgpa), 2)}" if cgpa is not None else "Not recorded (missing)"
        backlogs_display = f"{backlogs}" if backlogs is not None else "Not recorded (missing)"
        att_display = f"{round(float(attendance), 1)}%" if attendance is not None else "Not recorded (missing)"
        brief += f"- Academic Score: {round(acad, 1) if acad is not None else 'N/A'}\n"
        brief += f"- Placement Readiness: {round(place, 1) if place is not None else 'N/A'}\n"
        brief += f"- Recorded CGPA: {cgpa_display}\n"
        brief += f"- Backlog Count: {backlogs_display}\n"
        brief += f"- Overall Attendance: {att_display}\n"
        if missing_fields:
            brief += f"\nData Quality Note:\n- Missing student indicators: {', '.join(missing_fields)}. Risk levels reflect only available metrics; collect missing indicators for comprehensive assessment.\n"
        reasons = []
        if acad is not None and acad < 60:
            reasons.append("Academic progress is below the threshold of 60.")
        if place is not None and place < 60:
            reasons.append("Placement readiness is below the threshold of 60.")
        if attendance is not None and float(attendance) < 75:
            reasons.append(f"Attendance rate ({round(float(attendance), 1)}%) is below the mandatory 75% threshold.")
        if backlogs is not None and int(backlogs) > 0:
            reasons.append(f"Student has {backlogs} active backlog(s).")
            
        if reasons:
            brief += "\nRisk Factors:\n- " + "\n- ".join(reasons)
        else:
            brief += "\nNo critical risk factors identified."
            
        brief += "\n\nRecommended Interventions:"
        interventions = []
        if acad is not None and acad < 60:
            interventions.append("Schedule tutoring or academic advising.")
        if place is not None and place < 60:
            interventions.append("Recommend mock interviews and resume reviews.")
        if attendance is not None and float(attendance) < 75:
            interventions.append("Initiate student attendance counseling and notification.")
        if backlogs is not None and int(backlogs) > 0:
            interventions.append("Enroll in remedial subject clearance program.")
        if missing_fields:
            interventions.append(f"Collect missing indicator data ({', '.join(missing_fields)}) to complete academic profile.")
            
        if interventions:
            brief += "\n- " + "\n- ".join(interventions)
        else:
            brief += "\n- Continue monitoring."
            
        return {
            "status": "fallback",
            "explanation": brief
        }

    @staticmethod
    def _call_llm(student: dict, api_key: str) -> dict:
        from google import genai
        from google.genai import types
        from google.genai.errors import APIError
        
        raw_data = student.get("raw_data", {}) or {}
        cgpa = raw_data.get("cgpa")
        backlogs = raw_data.get("backlog_count")
        attendance = student.get("attendance_rate")
        if attendance is None:
            attendance = raw_data.get("overall_attendance_percentage")
        payload = {
            "name": student.get("name", "Unknown"),
            "academic_score": student.get("academic_score"),
            "placement_score": student.get("placement_score"),
            "success_score": student.get("success_score"),
            "cgpa": cgpa if cgpa is not None else "Not Recorded / Missing",
            "backlog_count": backlogs if backlogs is not None else "Not Recorded / Missing",
            "attendance": attendance if attendance is not None else "Not Recorded / Missing",
            "flags": student.get("scores", {}).get("flags", [])
        }
        system_prompt = (
            "You are an AI assistant for StudentArc, analyzing student data to provide "
            "a personalized insight brief. Keep it concise, professional, and actionable. "
            "Do not invent data; rely only on the provided metrics. If any metric (such as CGPA, "
            "backlogs, or attendance) is marked as 'Not Recorded / Missing', explicitly mention "
            "that the indicator is missing and recommend collecting the data rather than assuming a value. "
            "Identify key risk factors and suggest relevant interventions."
        )
        model_name = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        combined_input = f"{system_prompt}\n\nStudent Data: {json.dumps(payload)}"
        try:
            timeout_ms = int(os.environ.get("GEMINI_TIMEOUT_MS", str(DEFAULT_TIMEOUT_MS)))
            max_attempts = int(os.environ.get("GEMINI_MAX_ATTEMPTS", str(DEFAULT_MAX_ATTEMPTS)))
            http_options = types.HttpOptions(
                timeout=timeout_ms,
                retry_options=types.HttpRetryOptions(attempts=max_attempts)
            )
            client = genai.Client(api_key=api_key, http_options=http_options)
            interaction = client.interactions.create(
                model=model_name,
                input=combined_input
            )
            
            explanation = interaction.output_text.strip()
            return {
                "status": "ai_generated",
                "explanation": explanation
            }
        except APIError as e:
            error_message = str(e).lower()
            if "api key not valid" in error_message or "authentication" in error_message:
                raise Exception("Invalid API key configured.") from e
            if "quota" in error_message or "rate limit" in error_message or "429" in error_message or "resource_exhausted" in error_message:
                raise Exception("Rate limit exceeded or billing issue.") from e
            if "404" in error_message or "not_found" in error_message:
                raise Exception(f"404 NOT_FOUND: {str(e)}") from e
            raise Exception(f"AI Provider error: {str(e)}") from e
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "too many requests" in error_str or "quota" in error_str or "rate limit" in error_str or "resource_exhausted" in error_str or "temporaryerror" in type(e).__name__.lower():
                raise Exception("Rate limit exceeded or billing issue.") from e
            if "timeout" in error_str or "timed out" in error_str or "timeouterror" in type(e).__name__.lower():
                raise Exception("Request timed out connecting to AI provider.") from e
            if "network" in error_str or "connection" in error_str:
                raise Exception("Network error connecting to AI provider.") from e
            raise Exception(f"AI Provider error: {str(e)}") from e

    @staticmethod
    def generate_report_brief(metrics: dict) -> dict:
        """
        Generates an executive cohort brief based on aggregated reporting metrics.
        Returns a dict with 'explanation', 'status' (ai_generated or fallback), and 'error' if any.
        """
        api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return AIBriefService._generate_fallback_report_brief(metrics, reason="AI provider not configured")
        try:
            return AIBriefService._call_llm_report(metrics, api_key)
        except Exception as e:
            error_str = str(e)
            if "rate limit" in error_str.lower() or "quota" in error_str.lower() or "429" in error_str or "resource_exhausted" in error_str.lower() or "temporaryerror" in type(e).__name__.lower():
                reason = "AI provider rate-limited (429 / quota limit)"
                error_msg = "Rate limit exceeded or billing issue."
            elif "timed out" in error_str.lower() or "timeout" in error_str.lower() or "timeouterror" in type(e).__name__.lower():
                reason = "AI provider request timed out"
                error_msg = "Request timed out connecting to AI provider."
            elif "invalid api key" in error_str.lower() or "authentication" in error_str.lower() or "api key not valid" in error_str.lower():
                reason = "AI provider authentication failed"
                error_msg = "Invalid API key configured."
            else:
                reason = "AI provider temporarily unavailable"
                error_msg = error_str
            fallback = AIBriefService._generate_fallback_report_brief(metrics, reason=reason)
            fallback['error'] = f"AI Provider failed: {error_msg}"
            return fallback

    @staticmethod
    def _generate_fallback_report_brief(metrics: dict, reason: str = None) -> dict:
        total = metrics.get('totalStudents', 0)
        analyzed = metrics.get('studentsAnalyzed', total)
        acad_flags = metrics.get('academicSupportReviews', 0)
        place_flags = metrics.get('placementSupportReviews', 0)
        avg_success = metrics.get('averageSuccessScore', 'N/A')
        avg_acad = metrics.get('averageAcademicScore', 'N/A')
        avg_place = metrics.get('averagePlacementScore', 'N/A')
        completeness = metrics.get('dataCompleteness', 0)
        mode_label = f" ({reason})" if reason else " (Rule-Based Engine)"
        brief = f"### Executive Cohort Summary{mode_label}\n\n"
        brief += f"- **Cohort Size**: {total} students ({analyzed} analyzed with active indicators).\n"
        brief += f"- **Average Performance**: Success Score: **{avg_success}**, Academic Score: **{avg_acad}**, Placement Readiness: **{avg_place}**.\n"
        brief += f"- **Data Completeness**: **{completeness}%** of core indicators populated.\n\n"
        
        brief += "### Key Observations & Risk Hotspots\n\n"
        if acad_flags > 0:
            pct_acad = round((acad_flags / total * 100), 1) if total else 0
            brief += f"- **Academic Support Gap**: {acad_flags} students ({pct_acad}%) score below the 60.0 academic threshold.\n"
        else:
            brief += "- **Academic Standing**: Cohort meets baseline academic proficiency standards.\n"
        if place_flags > 0:
            pct_place = round((place_flags / total * 100), 1) if total else 0
            brief += f"- **Placement Readiness Gap**: {place_flags} students ({pct_place}%) score below the 60.0 placement threshold.\n"
        else:
            brief += "- **Placement Standing**: Cohort displays solid readiness across core competencies.\n"
        brief += "\n### Recommended Institutional Actions\n\n"
        actions = []
        if acad_flags > 0:
            actions.append("Prioritize remedial tutoring for students with active backlogs and GPA below 6.0.")
        if place_flags > 0:
            actions.append("Mandate coding workshops and mock technical interview clinics for upcoming placement rounds.")
        if completeness < 75:
            actions.append("Address data coverage gaps in LMS activity and student feedback indicators.")
        if not actions:
            actions.append("Maintain current cohort tracking schedule and continuous monitoring.")
        for a in actions:
            brief += f"- {a}\n"
        return {
            "status": "fallback",
            "explanation": brief
        }

    @staticmethod
    def _call_llm_report(metrics: dict, api_key: str) -> dict:
        from google import genai
        from google.genai import types
        from google.genai.errors import APIError
        system_prompt = (
            "You are an executive institutional analyst for StudentArc. "
            "Analyze the verified student reporting metrics provided. "
            "Produce a structured executive brief in markdown: "
            "1. Executive Summary: factual cohort metrics. "
            "2. Risk Hotspots: academic and placement support gaps. "
            "3. Actionable Institutional Recommendations. "
            "Rely strictly on provided numbers. Do not fabricate historical trends."
        )
        model_name = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        combined_input = f"{system_prompt}\n\nAggregate Report Metrics: {json.dumps(metrics)}"
        try:
            timeout_ms = int(os.environ.get("GEMINI_TIMEOUT_MS", str(DEFAULT_TIMEOUT_MS)))
            max_attempts = int(os.environ.get("GEMINI_MAX_ATTEMPTS", str(DEFAULT_MAX_ATTEMPTS)))
            http_options = types.HttpOptions(
                timeout=timeout_ms,
                retry_options=types.HttpRetryOptions(attempts=max_attempts)
            )
            client = genai.Client(api_key=api_key, http_options=http_options)
            interaction = client.interactions.create(
                model=model_name,
                input=combined_input
            )
            return {
                "status": "ai_generated",
                "explanation": interaction.output_text.strip()
            }
        except APIError as e:
            error_message = str(e).lower()
            if "api key not valid" in error_message or "authentication" in error_message:
                raise Exception("Invalid API key configured.") from e
            if "quota" in error_message or "rate limit" in error_message or "429" in error_message or "resource_exhausted" in error_message:
                raise Exception("Rate limit exceeded or billing issue.") from e
            if "404" in error_message or "not_found" in error_message:
                raise Exception(f"404 NOT_FOUND: {str(e)}") from e
            raise Exception(f"AI Provider error: {str(e)}") from e
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "too many requests" in error_str or "quota" in error_str or "rate limit" in error_str or "resource_exhausted" in error_str or "temporaryerror" in type(e).__name__.lower():
                raise Exception("Rate limit exceeded or billing issue.") from e
            if "timeout" in error_str or "timed out" in error_str or "timeouterror" in type(e).__name__.lower():
                raise Exception("Request timed out connecting to AI provider.") from e
            if "network" in error_str or "connection" in error_str:
                raise Exception("Network error connecting to AI provider.") from e
            raise Exception(f"AI Provider error: {str(e)}") from e

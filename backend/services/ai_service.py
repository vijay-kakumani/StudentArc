import os
import json

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
            return AIBriefService._generate_fallback_brief(student_data)
            
        try:
            return AIBriefService._call_llm(student_data, api_key)
        except Exception as e:
            fallback = AIBriefService._generate_fallback_brief(student_data)
            fallback['error'] = f"AI Provider failed: {str(e)}"
            return fallback
            
    @staticmethod
    def _generate_fallback_brief(student: dict) -> dict:
        score = student.get('success_score')
        acad = student.get('academic_score')
        place = student.get('placement_score')
        
        brief = "This is a rule-based explanation (AI provider not configured).\n\n"
        brief += f"Student {student.get('name', 'Unknown')} has an overall success score of {round(score, 1) if score else 'N/A'}.\n"
        
        reasons = []
        if acad is not None and acad < 60:
            reasons.append("Academic progress is below the threshold of 60.")
        if place is not None and place < 60:
            reasons.append("Placement readiness is below the threshold of 60.")
            
        if reasons:
            brief += "\nRisk Factors:\n- " + "\n- ".join(reasons)
        else:
            brief += "\nNo critical risk factors identified."
            
        brief += "\n\nRecommended Interventions:"
        if acad is not None and acad < 60:
            brief += "\n- Schedule tutoring or academic advising."
        if place is not None and place < 60:
            brief += "\n- Recommend mock interviews and resume reviews."
            
        if not reasons:
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
        
        payload = {
            "academic_score": student.get("academic_score"),
            "placement_score": student.get("placement_score"),
            "success_score": student.get("success_score"),
            "cgpa": student.get("raw_data", {}).get("cgpa"),
            "attendance": student.get("raw_data", {}).get("overall_attendance_percentage"),
            "flags": student.get("scores", {}).get("flags", [])
        }
        
        system_prompt = (
            "You are an AI assistant for StudentArc, analyzing student data to provide "
            "a personalized insight brief. Keep it concise, professional, and actionable. "
            "Do not invent data; rely only on the provided metrics. Identify key risk factors "
            "and suggest relevant interventions."
        )
        
        model_name = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        
        combined_input = f"{system_prompt}\n\nStudent Data: {json.dumps(payload)}"
        
        try:
            client = genai.Client(api_key=api_key)
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
            if "quota" in error_message or "rate limit" in error_message or "429" in error_message:
                raise Exception("Rate limit exceeded or billing issue.") from e
            raise Exception(f"AI Provider error: {str(e)}") from e
        except Exception as e:
            if "network" in str(e).lower() or "connection" in str(e).lower():
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
            return AIBriefService._generate_fallback_report_brief(metrics)
            
        try:
            return AIBriefService._call_llm_report(metrics, api_key)
        except Exception as e:
            fallback = AIBriefService._generate_fallback_report_brief(metrics)
            fallback['error'] = f"AI Provider failed: {str(e)}"
            return fallback

    @staticmethod
    def _generate_fallback_report_brief(metrics: dict) -> dict:
        total = metrics.get('totalStudents', 0)
        analyzed = metrics.get('studentsAnalyzed', total)
        acad_flags = metrics.get('academicSupportReviews', 0)
        place_flags = metrics.get('placementSupportReviews', 0)
        avg_success = metrics.get('averageSuccessScore', 'N/A')
        avg_acad = metrics.get('averageAcademicScore', 'N/A')
        avg_place = metrics.get('averagePlacementScore', 'N/A')
        completeness = metrics.get('dataCompleteness', 0)
        
        brief = "### Executive Cohort Summary\n\n"
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
            client = genai.Client(api_key=api_key)
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
            if "quota" in error_message or "rate limit" in error_message or "429" in error_message:
                raise Exception("Rate limit exceeded or billing issue.") from e
            raise Exception(f"AI Provider error: {str(e)}") from e
        except Exception as e:
            if "network" in str(e).lower() or "connection" in str(e).lower():
                raise Exception("Network error connecting to AI provider.") from e
            raise Exception(f"AI Provider error: {str(e)}") from e


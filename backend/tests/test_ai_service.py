import pytest
import httpx
from unittest.mock import patch, MagicMock
from services.ai_service import AIBriefService
from google.genai.errors import APIError
from google.genai._gaos.utils.retries import TemporaryError

def test_generate_fallback_brief_when_no_api_key():
    # Ensure no API key is set
    with patch('os.environ.get', return_value=None):
        student_data = {
            "name": "Jane Doe",
            "academic_score": 55,
            "placement_score": 85,
            "success_score": 70
        }
        brief = AIBriefService.generate_brief(student_data)
        
        assert brief["status"] == "fallback"
        assert "rule-based explanation" in brief["explanation"]
        assert "Jane Doe" in brief["explanation"]
        assert "Academic progress is below the threshold" in brief["explanation"]
        assert "Schedule tutoring or academic advising" in brief["explanation"]

@patch('google.genai.Client')
def test_generate_ai_brief_success(mock_client_class):
    mock_client = MagicMock()
    mock_interaction = MagicMock()
    mock_interaction.output_text = "This is a mocked AI insight brief."
    mock_client.interactions.create.return_value = mock_interaction
    mock_client_class.return_value = mock_client
    
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        student_data = {
            "name": "John Doe",
            "academic_score": 85,
            "placement_score": 90
        }
        
        brief = AIBriefService.generate_brief(student_data)
        
        assert brief["status"] == "ai_generated"
        assert brief["explanation"] == "This is a mocked AI insight brief."
        
        mock_client.interactions.create.assert_called_once()
        call_kwargs = mock_client.interactions.create.call_args[1]
        assert call_kwargs["model"] == "gemini-3.8-flash"
        assert "Student Data:" in call_kwargs["input"]

@patch('google.genai.Client')
def test_client_configured_with_bounded_retries_and_timeout(mock_client_class):
    mock_client = MagicMock()
    mock_interaction = MagicMock()
    mock_interaction.output_text = "Brief with bounded options."
    mock_client.interactions.create.return_value = mock_interaction
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        student_data = {"name": "Test Student"}
        AIBriefService.generate_brief(student_data)
        mock_client_class.assert_called_once()
        client_kwargs = mock_client_class.call_args[1]
        assert client_kwargs["api_key"] == "fake-api-key"
        assert "http_options" in client_kwargs
        http_options = client_kwargs["http_options"]
        assert http_options.timeout == 6000
        assert http_options.retry_options.attempts == 1

@patch('google.genai.Client')
def test_generate_ai_brief_authentication_error(mock_client_class):
    mock_client = MagicMock()
    mock_client.interactions.create.side_effect = APIError(400, {"error": {"message": "API key not valid. Please pass a valid API key."}})
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        student_data = {"name": "Test Student"}
        brief = AIBriefService.generate_brief(student_data)
        assert brief["status"] == "fallback"
        assert "AI Provider failed: Invalid API key configured." in brief["error"]

@patch('google.genai.Client')
def test_generate_ai_brief_rate_limit_error(mock_client_class):
    mock_client = MagicMock()
    mock_client.interactions.create.side_effect = APIError(429, {"error": {"message": "Quota exceeded 429"}})
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        student_data = {"name": "Test Student"}
        brief = AIBriefService.generate_brief(student_data)
        assert brief["status"] == "fallback"
        assert "AI Provider failed: Rate limit exceeded or billing issue." in brief["error"]
        assert "rule-based explanation" in brief["explanation"]

@patch('google.genai.Client')
def test_generate_ai_brief_temporary_error_429(mock_client_class):
    mock_client = MagicMock()
    fake_resp = httpx.Response(429, headers={"retry-after": "5"}, request=httpx.Request("POST", "https://example.com"))
    mock_client.interactions.create.side_effect = TemporaryError(fake_resp)
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        student_data = {"name": "Test Student", "academic_score": 50, "placement_score": 70}
        brief = AIBriefService.generate_brief(student_data)
        assert brief["status"] == "fallback"
        assert "Rate limit exceeded or billing issue" in brief["error"]
        assert "rule-based explanation" in brief["explanation"]

@patch('google.genai.Client')
def test_generate_ai_brief_timeout_error(mock_client_class):
    mock_client = MagicMock()
    mock_client.interactions.create.side_effect = TimeoutError("Request timed out")
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        student_data = {"name": "Test Student"}
        brief = AIBriefService.generate_brief(student_data)
        assert brief["status"] == "fallback"
        assert "Request timed out connecting to AI provider." in brief["error"]
        assert "rule-based explanation" in brief["explanation"]

@patch('google.genai.Client')
def test_generate_ai_brief_model_not_found_error(mock_client_class):
    mock_client = MagicMock()
    mock_client.interactions.create.side_effect = APIError(404, {"error": {"message": "404 NOT_FOUND: This model models/gemini-2.5-flash is no longer available to new users."}})
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        student_data = {"name": "Test Student"}
        brief = AIBriefService.generate_brief(student_data)
        assert brief["status"] == "fallback"
        assert "404 not_found" in brief["error"].lower()

def test_generate_fallback_brief_explicit_missing_fields():
    # Student record with missing CGPA, backlogs, and attendance
    student_data = {
        "name": "Alex Smith",
        "academic_score": 70.0,
        "placement_score": 75.0,
        "success_score": 72.5,
        "raw_data": {} # no cgpa, backlog_count, or overall_attendance_percentage
    }
    brief = AIBriefService._generate_fallback_brief(student_data)
    assert brief["status"] == "fallback"
    explanation = brief["explanation"]
    # Check that missing fields are explicitly identified and not fabricated
    assert "Not recorded (missing)" in explanation
    assert "Missing student indicators: CGPA, Backlogs, Attendance" in explanation
    assert "Collect missing indicator data" in explanation

@patch('google.genai.Client')
def test_generate_report_brief_success(mock_client_class):
    mock_client = MagicMock()
    mock_interaction = MagicMock()
    mock_interaction.output_text = "### Executive Cohort Summary\nMocked LLM report insight."
    mock_client.interactions.create.return_value = mock_interaction
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        metrics = {
            "totalStudents": 100,
            "academicSupportReviews": 15,
            "placementSupportReviews": 20,
            "averageSuccessScore": 72.0
        }
        brief = AIBriefService.generate_report_brief(metrics)
        assert brief["status"] == "ai_generated"
        assert "Mocked LLM report insight" in brief["explanation"]

@patch('google.genai.Client')
def test_generate_report_brief_rate_limit_429(mock_client_class):
    mock_client = MagicMock()
    fake_resp = httpx.Response(429, headers={"retry-after": "5"}, request=httpx.Request("POST", "https://example.com"))
    mock_client.interactions.create.side_effect = TemporaryError(fake_resp)
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        metrics = {
            "totalStudents": 50,
            "academicSupportReviews": 5,
            "placementSupportReviews": 10,
            "averageSuccessScore": 68.0,
            "dataCompleteness": 80
        }
        brief = AIBriefService.generate_report_brief(metrics)
        assert brief["status"] == "fallback"
        assert "Executive Cohort Summary" in brief["explanation"]
        assert "Rate limit exceeded or billing issue" in brief["error"]

@patch('google.genai.Client')
def test_generate_report_brief_timeout(mock_client_class):
    mock_client = MagicMock()
    mock_client.interactions.create.side_effect = TimeoutError("Request timed out")
    mock_client_class.return_value = mock_client
    with patch('os.environ.get', side_effect=lambda k, d=None: "fake-api-key" if k == "GEMINI_API_KEY" else d):
        metrics = {"totalStudents": 10}
        brief = AIBriefService.generate_report_brief(metrics)
        assert brief["status"] == "fallback"
        assert "Executive Cohort Summary" in brief["explanation"]
        assert "Request timed out connecting to AI provider." in brief["error"]

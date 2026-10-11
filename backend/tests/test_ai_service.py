import pytest
from unittest.mock import patch, MagicMock
from services.ai_service import AIBriefService
from google.genai.errors import APIError

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
def test_generate_ai_brief_authentication_error(mock_client_class):
    mock_client = MagicMock()
    # Mocking APIError with just the error message string
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

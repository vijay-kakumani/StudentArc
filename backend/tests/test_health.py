import pytest
from app import create_app
from unittest.mock import patch

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@patch('supabase_client.get_supabase')
def test_health_check_success(mock_get_supabase, client):
    # Mock the supabase client response
    mock_client = mock_get_supabase.return_value
    mock_client.table.return_value.select.return_value.limit.return_value.execute.return_value = True
    
    response = client.get('/api/health')
    assert response.status_code == 200

    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

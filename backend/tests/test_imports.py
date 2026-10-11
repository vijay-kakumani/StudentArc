import pytest
import io
from app import create_app
from unittest.mock import patch

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_preview_import_no_file(client):
    response = client.post('/api/imports/preview')
    assert response.status_code == 400
    assert "No file part in the request" in response.get_json()['error']

def test_preview_import_csv(client):
    csv_content = b"student_id,student_name,cgpa,legacy_success_score_reference_only\n1,John Doe,8.5,90\n2,Jane Doe,9.0,95\n3,Duplicate,7.0,70\n3,Duplicate,7.0,70\n"
    data = {
        'file': (io.BytesIO(csv_content), 'test.csv')
    }
    response = client.post('/api/imports/preview', data=data, content_type='multipart/form-data')
    
    assert response.status_code == 200
    result = response.get_json()
    assert result['total_rows'] == 4
    assert 'student_id' in result['columns']
    assert 'legacy_success_score_reference_only' not in result['columns'] # Legacy columns dropped
    assert result['preview_id'] is not None
    assert len(result['warnings']) > 0  # Should flag duplicate student_id
    
@patch('routes.imports.get_supabase')
def test_confirm_import(mock_get_supabase, client):
    # First, mock preview
    csv_content = b"student_id,student_name,cgpa\n1,John Doe,8.5\n"
    data = {'file': (io.BytesIO(csv_content), 'test.csv')}
    preview_res = client.post('/api/imports/preview', data=data, content_type='multipart/form-data')
    preview_id = preview_res.get_json()['preview_id']
    
    # Now confirm
    mock_client = mock_get_supabase.return_value
    mock_client.table.return_value.insert.return_value.execute.return_value = True
    
    confirm_res = client.post('/api/imports/confirm', json={"preview_id": preview_id})
    assert confirm_res.status_code == 200
    result = confirm_res.get_json()
    assert result['status'] == 'success'
    assert result['rows_processed'] == 1

@patch('routes.imports.get_supabase')
def test_confirm_import_partial_failure(mock_get_supabase, client):
    # Setup data with a duplicate
    csv_content = b"student_id,student_name,cgpa\n1,John Doe,8.5\n2,Jane Doe,9.0\n3,Fail Me,7.0\n"
    data = {'file': (io.BytesIO(csv_content), 'test.csv')}
    preview_res = client.post('/api/imports/preview', data=data, content_type='multipart/form-data')
    preview_id = preview_res.get_json()['preview_id']
    
    mock_client = mock_get_supabase.return_value
    
    # We want the batch insert to raise an exception, triggering the row-by-row fallback
    class MockReq:
        def execute(self):
            return True
            
    def side_effect_insert(payload):
        if isinstance(payload, list):
            raise Exception("duplicate key value violates unique constraint 23505")
        elif isinstance(payload, dict):
            if payload.get('student_id') == 3:
                raise Exception("duplicate key value violates unique constraint 23505")
            return MockReq()
            
    mock_client.table.return_value.insert.side_effect = side_effect_insert
    
    confirm_res = client.post('/api/imports/confirm', json={"preview_id": preview_id})
    if confirm_res.status_code != 200:
        print(confirm_res.get_json())
    assert confirm_res.status_code == 200
    result = confirm_res.get_json()
    
    # 2 rows should succeed (fallback), 1 row should fail
    assert result['rows_processed'] == 2
    assert len(result['errors']) == 1
    assert "already exists" in result['errors'][0].lower()

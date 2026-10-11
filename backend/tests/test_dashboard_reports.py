import pytest
from app import create_app
from unittest.mock import patch
from services.data_service import DataService

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@patch('services.data_service.DataService.get_joined_students')
def test_dashboard_summary_success(mock_get_joined_students, client):
    # Mock data to test calculations and sorting
    mock_get_joined_students.return_value = [
        {"id": "1", "semester": "8", "success_score": 85, "academic_score": 50, "placement_score": 90},
        {"id": "2", "semester": "2", "success_score": 75, "academic_score": 80, "placement_score": 40},
        {"id": "3", "semester": "2", "success_score": 60, "academic_score": 70, "placement_score": 70},
        {"id": "4", "semester": "Unknown"} # Missing data
    ]
    
    res = client.get('/api/dashboard/summary')
    assert res.status_code == 200
    data = res.get_json()
    assert data['has_data'] is True
    
    # Check KPI metrics (academic_score < 60 -> 1, placement_score < 60 -> 1)
    assert data['metrics']['academicSupportReviews'] == 1
    assert data['metrics']['placementSupportReviews'] == 1
    assert data['metrics']['totalStudentsAnalyzed'] == 4
    
    # Check semester sorting
    semesters = [s['name'] for s in data['charts']['semester']]
    assert semesters == ["2", "8", "Unknown"]

@patch('services.data_service.DataService.get_joined_students')
def test_dashboard_summary_filtering(mock_get_joined_students, client):
    mock_get_joined_students.return_value = [
        {"id": "1", "department": "CS", "semester": "8"},
        {"id": "2", "department": "ME", "semester": "2"},
    ]
    
    res = client.get('/api/dashboard/summary?department=CS')
    assert res.status_code == 200
    data = res.get_json()
    assert data['metrics']['totalStudentsAnalyzed'] == 1

@patch('services.data_service.DataService.get_joined_students')
def test_reports_attendance(mock_get_joined_students, client):
    mock_get_joined_students.return_value = [
        {"id": "1", "attendance_rate": 60},
        {"id": "2", "attendance_rate": 90},
        {"id": "3"} # Missing data
    ]
    
    res = client.get('/api/attendance/summary')
    assert res.status_code == 200
    data = res.get_json()
    assert data['metrics']['totalStudents'] == 3
    assert data['metrics']['lowAttendanceCount'] == 1
    assert len(data['flagged_students']) == 1

@patch('services.data_service.DataService.get_joined_students')
def test_reports_at_risk(mock_get_joined_students, client):
    mock_get_joined_students.return_value = [
        {"id": "1", "academic_score": 50, "placement_score": 80},
        {"id": "2", "academic_score": 90, "placement_score": 50},
        {"id": "3", "academic_score": 80, "placement_score": 80},
    ]
    
    res = client.get('/api/at-risk-students')
    assert res.status_code == 200
    data = res.get_json()
    assert data['metrics']['atRiskCount'] == 2
    assert len(data['students']) == 2

@patch('services.data_service.DataService.get_joined_students')
def test_dashboard_completeness(mock_get_joined_students, client):
    mock_get_joined_students.return_value = [
        {"id": "1", "raw_data": {"cgpa": "9.0", "backlog_count": 0}}, # 2 fields populated out of 11
        {"id": "2", "raw_data": {"cgpa": "8.0", "lms_activity_score": 50, "coding_score": 80, "aptitude_score": 75}}, # 4 fields populated
        {"id": "3", "raw_data": {}} # 0 fields populated
    ]
    # Total expected fields = 3 students * 11 = 33
    # Populated = 2 + 4 + 0 = 6
    # Completeness = round(6 / 33 * 100) = 18
    
    res = client.get('/api/dashboard/summary')
    assert res.status_code == 200
    data = res.get_json()
    assert data['metrics']['dataCompleteness'] == 18

    # Empty dataset test
    mock_get_joined_students.return_value = []
    res = client.get('/api/dashboard/summary')
    data = res.get_json()
    assert data['has_data'] is False


@patch('services.data_service.DataService.get_joined_students')
def test_reports_comprehensive_summary(mock_get_joined_students, client):
    mock_get_joined_students.return_value = [
        {
            "id": "STU1",
            "name": "Alice",
            "department": "CSE",
            "semester": "6",
            "success_score": 75.0,
            "academic_score": 55.0,
            "placement_score": 82.0,
            "raw_data": {"cgpa": 7.5, "backlog_count": 1, "overall_attendance_percentage": 85.0}
        },
        {
            "id": "STU2",
            "name": "Bob",
            "department": "ECE",
            "semester": "6",
            "success_score": 62.0,
            "academic_score": 78.0,
            "placement_score": 45.0,
            "raw_data": {"cgpa": 8.0, "backlog_count": 0, "overall_attendance_percentage": 90.0}
        }
    ]
    
    res = client.get('/api/reports/summary')
    assert res.status_code == 200
    data = res.get_json()
    assert data['has_data'] is True
    assert data['metrics']['totalStudents'] == 2
    assert data['metrics']['academicSupportReviews'] == 1
    assert data['metrics']['placementSupportReviews'] == 1
    assert data['metrics']['averageSuccessScore'] == 68.5
    assert len(data['students']) == 2
    assert 'distributions' in data
    assert 'data_quality' in data


@patch('services.data_service.DataService.get_joined_students')
def test_reports_insights_fallback(mock_get_joined_students, client):
    mock_get_joined_students.return_value = [
        {
            "id": "STU1",
            "name": "Alice",
            "department": "CSE",
            "semester": "6",
            "success_score": 75.0,
            "academic_score": 55.0,
            "placement_score": 82.0
        }
    ]
    
    res = client.get('/api/reports/insights')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] in ['fallback', 'ai_generated']
    assert 'explanation' in data
    assert 'Executive Cohort Summary' in data['explanation'] or len(data['explanation']) > 10


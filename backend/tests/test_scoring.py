import pytest
from services.scoring import ScoringEngine

def test_calculate_success_score_all_data():
    record = {
        'cgpa': 8.5,
        'backlog_count': 0,
        'overall_attendance_percentage': 90,
        'assignment_completion_rate': 85,
        'coding_score': 80
    }
    result = ScoringEngine.calculate_success_score(record)
    
    # academic: 8.5/10 * 100 * 0.70 + 100 * 0.30 = 59.5 + 30 = 89.5
    # engagement: 90 * 0.35 + 85 * 0.30 = 31.5 + 25.5 = 57.0 / 0.65 = 87.69
    # overall: 89.5 * 0.65 + 87.69 * 0.35 = 58.175 + 30.69 = 88.86...
    # Should be approximately 88.9
    assert result['success_score'] == 88.9

def test_calculate_success_score_missing_data():
    # Missing attendance
    record = {
        'cgpa': 8.5,
        'backlog_count': 0,
        'assignment_completion_rate': 85
    }
    result = ScoringEngine.calculate_success_score(record)
    
    # engagement weight: 0.30
    # engagement score: 85 * 0.30 = 25.5 / 0.30 = 85.0
    # overall: 89.5 * 0.65 + 85.0 * 0.35 = 58.175 + 29.75 = 87.925 -> 87.9
    assert result['success_score'] == 87.9

def test_calculate_success_score_no_data():
    record = {}
    result = ScoringEngine.calculate_success_score(record)
    assert result['success_score'] is None

def test_what_if_recalculation():
    # Base scenario
    record = {
        'cgpa': 5.0, # low
        'backlog_count': 2,
    }
    result_base = ScoringEngine.calculate_success_score(record)
    
    # What-if scenario: student clears backlogs and improves cgpa to 7.0
    record_what_if = {
        'cgpa': 7.0,
        'backlog_count': 0,
    }
    result_what_if = ScoringEngine.calculate_success_score(record_what_if)
    
    # The what-if score should be strictly better
    assert result_what_if['success_score'] > result_base['success_score']
    assert result_what_if['academic_score'] > result_base['academic_score']

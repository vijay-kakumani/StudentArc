import io
import pytest
from app import create_app
from unittest.mock import patch, MagicMock
from services.import_service import ImportService, CANONICAL_FIELDS

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_get_canonical_fields(client):
    res = client.get('/api/imports/canonical-fields')
    assert res.status_code == 200
    data = res.get_json()
    assert "fields" in data
    fields = {f["key"]: f for f in data["fields"]}
    assert "student_id" in fields
    assert fields["student_id"]["required"] is True
    assert "cgpa" in fields
    assert "overall_attendance_percentage" in fields

def test_smart_header_normalization_and_matching():
    # Test synonym mapping on renamed columns
    raw_cols = [
        "Roll Number",
        "Full Name",
        "Branch",
        "Cumulative GPA",
        "Active Backlogs",
        "Attendance %",
        "Coding Assessment",
        "Mock Interview",
        "Unrelated Custom Column"
    ]
    sample_df = MagicMock()
    sample_df.columns = raw_cols
    sample_df.__getitem__.return_value.dropna.return_value.empty = True

    proposals = ImportService.propose_column_mapping(raw_cols, sample_df)

    assert proposals["Roll Number"]["canonical_field"] == "student_id"
    assert proposals["Roll Number"]["confidence"] >= 0.8
    assert proposals["Full Name"]["canonical_field"] == "student_name"
    assert proposals["Branch"]["canonical_field"] == "department"
    assert proposals["Cumulative GPA"]["canonical_field"] == "cgpa"
    assert proposals["Active Backlogs"]["canonical_field"] == "backlog_count"
    assert proposals["Attendance %"]["canonical_field"] == "overall_attendance_percentage"
    assert proposals["Coding Assessment"]["canonical_field"] == "coding_score"
    assert proposals["Mock Interview"]["canonical_field"] == "mock_interview_score"
    assert proposals["Unrelated Custom Column"]["canonical_field"] is None

def test_preview_semicolon_delimited_csv(client):
    csv_content = "Roll No;Student Name;GPA\nSTU901;Alice Smith;8.8\nSTU902;Bob Jones;7.4\n".encode('utf-8')
    data = {'file': (io.BytesIO(csv_content), 'students_semicolon.csv')}
    res = client.post('/api/imports/preview', data=data, content_type='multipart/form-data')
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["total_rows"] == 2
    assert "Roll No" in json_data["columns"]
    assert json_data["proposed_mappings"]["Roll No"]["canonical_field"] == "student_id"
    assert json_data["proposed_mappings"]["Student Name"]["canonical_field"] == "student_name"
    assert json_data["proposed_mappings"]["GPA"]["canonical_field"] == "cgpa"

def test_preview_utf8_bom_csv(client):
    # CSV encoded with utf-8-sig (Byte Order Mark)
    csv_content = "\ufeffstudent_id,student_name,cgpa\nS101,Charlie,9.2\n".encode('utf-8-sig')
    data = {'file': (io.BytesIO(csv_content), 'bom_file.csv')}
    res = client.post('/api/imports/preview', data=data, content_type='multipart/form-data')
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["total_rows"] == 1
    assert "student_id" in json_data["columns"]

def test_validate_import_missing_required_id(client):
    csv_content = b"name,cgpa\nJohn Doe,8.5\n"
    data = {'file': (io.BytesIO(csv_content), 'no_id.csv')}
    preview_res = client.post('/api/imports/preview', data=data, content_type='multipart/form-data')
    preview_id = preview_res.get_json()['preview_id']

    # Validate with mapping that has no student_id
    val_res = client.post('/api/imports/validate', json={
        "preview_id": preview_id,
        "mapping": {"name": "student_name", "cgpa": "cgpa"}
    })
    assert val_res.status_code == 200
    report = val_res.get_json()["report"]
    assert report["has_critical_error"] is True
    assert any("Student ID" in issue["reason"] for issue in report["issues"])

def test_validate_import_numeric_range_warnings(client):
    # CGPA > 10 and attendance > 100
    csv_content = b"student_id,student_name,cgpa,overall_attendance_percentage\nS1,John,14.5,120.0\n"
    data = {'file': (io.BytesIO(csv_content), 'out_of_range.csv')}
    preview_res = client.post('/api/imports/preview', data=data, content_type='multipart/form-data')
    preview_id = preview_res.get_json()['preview_id']

    val_res = client.post('/api/imports/validate', json={
        "preview_id": preview_id,
        "mapping": {
            "student_id": "student_id",
            "student_name": "student_name",
            "cgpa": "cgpa",
            "overall_attendance_percentage": "overall_attendance_percentage"
        }
    })
    assert val_res.status_code == 200
    report = val_res.get_json()["report"]
    assert report["total_issues_count"] >= 2
    assert any("maximum allowed" in issue["reason"] for issue in report["issues"])

@patch('routes.imports.get_supabase')
def test_precalculation_on_confirm(mock_get_supabase, client):
    # Verify that score pre-calculation is computed and attached before writing
    csv_content = (
        b"student_id,student_name,cgpa,backlog_count,overall_attendance_percentage,coding_score\n"
        b"TEST01,High Achiever,9.5,0,95.0,90.0\n"
        b"TEST02,At Risk Student,4.5,3,45.0,40.0\n"
    )
    data = {'file': (io.BytesIO(csv_content), 'calc_test.csv')}
    preview_res = client.post('/api/imports/preview', data=data, content_type='multipart/form-data')
    preview_id = preview_res.get_json()['preview_id']

    mock_client = mock_get_supabase.return_value
    mock_client.table.return_value.select.return_value.execute.return_value.data = []

    inserted_records = []
    def capture_insert(batch):
        nonlocal inserted_records
        inserted_records.extend(batch)
        mock_req = MagicMock()
        mock_req.execute.return_value = True
        return mock_req

    mock_client.table.return_value.insert.side_effect = capture_insert

    confirm_res = client.post('/api/imports/confirm', json={
        "preview_id": preview_id,
        "mode": "upsert"
    })

    assert confirm_res.status_code == 200
    res_data = confirm_res.get_json()
    assert res_data["status"] == "success"
    assert res_data["rows_processed"] == 2

    # Verify precalculated scores on TEST01
    s1 = next(r for r in inserted_records if r["student_id"] == "TEST01")
    assert s1["success_score"] is not None
    assert s1["academic_score"] is not None
    assert s1["academic_score"] > 80
    assert s1["academic_risk_level"] == "Low"

    # Verify precalculated risk levels on TEST02
    s2 = next(r for r in inserted_records if r["student_id"] == "TEST02")
    assert s2["academic_score"] < 60
    assert s2["academic_risk_level"] == "High"
    assert s2["overall_risk_level"] == "High"
    assert "Low Academic Progress" in s2["risk_factors"]
    assert "Low Attendance" in s2["risk_factors"]

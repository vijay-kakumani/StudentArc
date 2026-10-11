from flask import Blueprint, jsonify, request
from supabase_client import get_supabase
import json
import uuid

interventions_bp = Blueprint("interventions", __name__)

@interventions_bp.route("/", methods=["GET", "POST"])
def handle_interventions():
    try:
        client = get_supabase()
        
        if request.method == "GET":
            student_id = request.args.get("student_id")
            query = client.table('student_analytics').select('student_id, student_name, recommended_intervention')
            if student_id:
                query = query.eq('student_id', student_id)
            
            res = query.execute()
            
            all_interventions = []
            for row in res.data:
                val = row.get('recommended_intervention')
                if val and val.startswith('['):
                    try:
                        arr = json.loads(val)
                        for item in arr:
                            item['student_id'] = row['student_id']
                            item['student_name'] = row.get('student_name', 'Unknown')
                            all_interventions.append(item)
                    except:
                        pass
                elif val and val.strip():
                    # Legacy string from previous pipeline
                    all_interventions.append({
                        "id": f"legacy-{row['student_id']}",
                        "student_id": row['student_id'],
                        "student_name": row.get('student_name', 'Unknown'),
                        "reason": "System Identified Risk",
                        "recommended_action": val,
                        "status": "Planned"
                    })
            
            return jsonify({"data": all_interventions}), 200
            
        elif request.method == "POST":
            data = request.json
            required_fields = ['student_id', 'recommended_action', 'reason', 'status']
            
            for field in required_fields:
                if field not in data:
                    return jsonify({"error": f"Missing required field: {field}"}), 400
            
            if 'id' not in data or not data['id']:
                data['id'] = str(uuid.uuid4())
            
            # Fetch current to append/update
            res = client.table('student_analytics').select('recommended_intervention').eq('student_id', data['student_id']).execute()
            if not res.data:
                return jsonify({"error": "Student not found in analytics table"}), 404
                
            current_val = res.data[0].get('recommended_intervention')
            arr = []
            if current_val and current_val.startswith('['):
                try:
                    arr = json.loads(current_val)
                except:
                    pass
            elif current_val and current_val.strip():
                # Convert legacy to first item
                arr.append({
                    "id": f"legacy-{data['student_id']}",
                    "reason": "System Identified Risk",
                    "recommended_action": current_val,
                    "status": "Planned"
                })
                    
            updated = False
            for i, item in enumerate(arr):
                if item.get('id') == data.get('id'):
                    arr[i] = data
                    updated = True
                    break
            
            if not updated:
                arr.append(data)
                
            new_val = json.dumps(arr)
            client.table('student_analytics').update({'recommended_intervention': new_val}).eq('student_id', data['student_id']).execute()
            
            return jsonify({"data": data, "message": "Intervention saved successfully."}), 201
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

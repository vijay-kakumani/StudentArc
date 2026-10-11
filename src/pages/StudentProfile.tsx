import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import StudentDetailModal from '../components/students/StudentDetailModal';
import { api } from '../services/api';

export default function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getStudent(id)
      .then((res: any) => {
        setStudent(res.data);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || 'Student not found');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-text-muted text-[13px]">Loading student profile...</div>;
  }

  if (error || !student) {
    return <div className="p-12 text-center text-red-500 text-[13px]">{error || 'Student not found'}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Link to="/students" className="inline-flex items-center text-[13px] text-text-muted hover:text-text-main mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Directory
      </Link>
      
      <div className="bg-card rounded-[16px] border border-card-border shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <StudentDetailModal student={student} fullPage={true} />
      </div>
    </div>
  );
}

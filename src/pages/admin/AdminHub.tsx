import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminAccessModal } from '@/components/admin/AdminAccessModal';

export default function AdminHub() {
  const [modalOpen, setModalOpen] = useState(true);
  const navigate = useNavigate();

  // Quando o modal fechar, volta para home-choice
  useEffect(() => {
    if (!modalOpen) {
      navigate('/home-choice', { replace: true });
    }
  }, [modalOpen, navigate]);

  return <AdminAccessModal open={modalOpen} onOpenChange={setModalOpen} />;
}

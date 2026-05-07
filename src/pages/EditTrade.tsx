import { useParams } from 'react-router-dom';
import TradeForm from '@/components/TradeForm';

export default function EditTrade() {
  const { id } = useParams();
  return <TradeForm tradeId={id} />;
}

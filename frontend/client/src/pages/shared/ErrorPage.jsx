import { useParams } from 'react-router-dom';
import ErrorView from '../../components/ErrorView';

export default function ErrorPage({ code }) {
  const params = useParams();
  const c = Number(code ?? params.code);
  return <ErrorView code={Number.isInteger(c) && c >= 400 && c < 600 ? c : 404} />;
}
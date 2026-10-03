import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { roleHome } from '../routes/rolehome';

const ERRORS = {
  400: { icon: '🤔', title: 'Bad request', text: 'Something about that request was not right. Please check it and try again.' },
  401: { icon: '🔒', title: 'Login required', text: 'Your session has ended or you are not logged in. Please log in to continue.' },
  403: { icon: '⛔', title: 'Access denied', text: 'You do not have permission to open this page.' },
  404: { icon: '🧭', title: 'Page not found', text: 'The page you are looking for does not exist or has been moved.' },
  408: { icon: '⏳', title: 'Request timeout', text: 'The request took too long. Please try again.', retry: true },
  409: { icon: '⚠️', title: 'Conflict', text: 'This action clashes with something that already exists. Please review and try again.' },
  422: { icon: '📝', title: 'Invalid data', text: 'Some of the details were not valid. Please go back and correct them.' },
  429: { icon: '🚦', title: 'Too many requests', text: 'You are going a little too fast. Please wait a moment and try again.', retry: true },
  500: { icon: '🛠️', title: 'Server error', text: 'Something went wrong on our side. We are on it, please try again shortly.', retry: true },
  502: { icon: '🔌', title: 'Bad gateway', text: 'The server could not be reached properly. Please try again in a moment.', retry: true },
  503: { icon: '🚧', title: 'Service unavailable', text: 'We are temporarily down for maintenance. Please check back soon.', retry: true },
  504: { icon: '⌛', title: 'Gateway timeout', text: 'The server took too long to respond. Please try again.', retry: true },
};

const getInfo = (code) => ERRORS[code] || (code >= 500 ? ERRORS[500] : ERRORS[400]);

const primary =
  'inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:brightness-110 sm:w-auto';
const secondary =
  'inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50 sm:w-auto';

export default function ErrorView({ code = 404, title, message }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const info = getInfo(code);
  const home = user ? roleHome(user.role) : '/login';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 text-center shadow-xl shadow-indigo-100/60 ring-1 ring-slate-100 sm:p-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-violet-200/40 blur-2xl" />

        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
            {info.icon}
          </div>
          <p className="mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-7xl font-extrabold leading-none text-transparent sm:text-8xl">
            {code}
          </p>
          <h1 className="mt-4 text-xl font-bold text-slate-800 sm:text-2xl">{title || info.title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{message || info.text}</p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {info.retry && (
              <button type="button" onClick={() => window.location.reload()} className={primary}>
                Try again
              </button>
            )}
            {code === 401 ? (
              <Link to="/login" className={primary}>Log in</Link>
            ) : (
              <Link to={home} className={info.retry ? secondary : primary}>
                {user ? 'Go to dashboard' : 'Go to login'}
              </Link>
            )}
            <button type="button" onClick={() => navigate(-1)} className={secondary}>
              Go back
            </button>
          </div>
          <p className="mt-6 text-xs font-medium tracking-wide text-slate-300">HelpNow</p>
        </div>
      </div>
    </div>
  );
}
import { ToastOptions } from 'react-toastify';

// Shared toast configuration for the entire application
export const toastConfig: ToastOptions = {
  position: 'bottom-left',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'colored',
};

import { toast, ToastOptions } from 'react-toastify';

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

export const showSuccess = (message: string) => {
  toast.success(message, toastConfig);
};

export const showError = (message: string) => {
  toast.error(message, toastConfig);
};

export const showInfo = (message: string) => {
  toast.info(message, toastConfig);
};

export const showWarning = (message: string) => {
  toast.warning(message, toastConfig);
};

// Common success messages
export const successMessages = {
  created: (item: string) => `${item} created successfully!`,
  updated: (item: string) => `${item} updated successfully!`,
  deleted: (item: string) => `${item} deleted successfully!`,
  saved: (item: string) => `${item} saved successfully!`,
};

// Common error messages
export const errorMessages = {
  create: (item: string) => `Error creating ${item}`,
  update: (item: string) => `Error updating ${item}`,
  delete: (item: string) => `Error deleting ${item}`,
  fetch: (item: string) => `Error fetching ${item}`,
  generic: 'An error occurred. Please try again.',
};

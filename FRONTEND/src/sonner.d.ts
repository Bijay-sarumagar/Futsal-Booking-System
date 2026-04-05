declare module "sonner" {
  export type ToastMessage = string;

  export interface ToastOptions {
    description?: string;
    duration?: number;
  }

  export interface ToastApi {
    success: (message: ToastMessage, options?: ToastOptions) => void;
    error: (message: ToastMessage, options?: ToastOptions) => void;
    message: (message: ToastMessage, options?: ToastOptions) => void;
  }

  export const toast: ToastApi;
  export const Toaster: (props: { position?: string }) => JSX.Element;
}

import React, { createContext, useState, ReactNode, useContext } from 'react';
import { Dialog } from '../components/Dialog';

export interface DialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isDestructive?: boolean;
}

interface DialogContextType {
  showDialog: (options: DialogOptions) => void;
  hideDialog: () => void;
}

export const DialogContext = createContext<DialogContextType>({
  showDialog: () => {},
  hideDialog: () => {},
});

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<DialogOptions>({
    title: '',
    message: '',
  });

  const showDialog = (newOptions: DialogOptions) => {
    setOptions(newOptions);
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
  };

  const handleConfirm = () => {
    hideDialog();
    if (options.onConfirm) options.onConfirm();
  };

  const handleCancel = () => {
    hideDialog();
    if (options.onCancel) options.onCancel();
  };

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <Dialog
        visible={visible}
        title={options.title}
        message={options.message}
        confirmLabel={options.confirmLabel || 'OK'}
        cancelLabel={options.cancelLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isDestructive={options.isDestructive}
      />
    </DialogContext.Provider>
  );
};

import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Typography } from './Typography';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

export interface DialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel,
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false,
}) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialogContainer, { 
              backgroundColor: colors.canvas,
              shadowColor: isDarkMode ? '#fff' : colors.ink,
              shadowOpacity: isDarkMode ? 0.05 : 0.15,
            }]}>
              <Typography variant="displaySm" style={styles.title}>
                {title}
              </Typography>
              <Typography variant="bodyMd" style={[styles.message, { color: colors.body }]}>
                {message}
              </Typography>
              
              <View style={styles.actions}>
                {cancelLabel && (
                  <TouchableOpacity 
                    onPress={onCancel} 
                    style={styles.button}
                    disabled={isLoading}
                  >
                    <Typography variant="buttonMd" style={{ color: colors.primary }}>
                      {cancelLabel}
                    </Typography>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  onPress={onConfirm} 
                  style={styles.button}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={isDestructive ? colors.error : colors.primary} />
                  ) : (
                    <Typography variant="buttonMd" style={{ color: isDestructive ? colors.error : colors.primary }}>
                      {confirmLabel}
                    </Typography>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28, // M3 Extra Large radius for dialogs
    padding: spacing.lg,
    elevation: 24, // High elevation per M3
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  title: {
    marginBottom: spacing.md,
  },
  message: {
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

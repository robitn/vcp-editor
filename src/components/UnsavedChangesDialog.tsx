import React from 'react';
import ThreeButtonDialog from './ThreeButtonDialog';

export type UnsavedChangesResult = 'save' | 'discard' | 'cancel';

export interface UnsavedChangesDialogProps {
  onResult: (result: UnsavedChangesResult) => void;
  context?: 'close' | 'new' | 'open';
}

const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  onResult,
  context = 'close',
}) => {
  const getMessage = () => {
    switch (context) {
      case 'close':
        return 'You have unsaved changes. Do you want to save before closing?';
      case 'new':
        return 'You have unsaved changes. Do you want to save before creating a new file?';
      case 'open':
        return 'You have unsaved changes. Do you want to save before opening another file?';
      default:
        return 'You have unsaved changes. Do you want to save them?';
    }
  };

  // Detect platform for button ordering
  const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (isMacOS) {
    // macOS: "Don't Save" (left), "Cancel" (right-1), "Save" (right-0)
    return (
      <ThreeButtonDialog
        title="Unsaved Changes"
        message={getMessage()}
        leftButtonLabel="Don't Save"
        middleButtonLabel="Cancel"
        rightButtonLabel="Save"
        onLeftButton={() => onResult('discard')}
        onMiddleButton={() => onResult('cancel')}
        onRightButton={() => onResult('save')}
        leftButtonStyle="default"
        middleButtonStyle="default"
        rightButtonStyle="primary"
      />
    );
  } else {
    // Windows: "Don't Save" (left), "Save" (right-1), "Cancel" (right-0)
    return (
      <ThreeButtonDialog
        title="Unsaved Changes"
        message={getMessage()}
        leftButtonLabel="Don't Save"
        middleButtonLabel="Save"
        rightButtonLabel="Cancel"
        onLeftButton={() => onResult('discard')}
        onMiddleButton={() => onResult('save')}
        onRightButton={() => onResult('cancel')}
        leftButtonStyle="default"
        middleButtonStyle="primary"
        rightButtonStyle="default"
      />
    );
  }
};

export default UnsavedChangesDialog;
